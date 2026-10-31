import pg from 'pg';
import {readFile} from 'node:fs/promises';
export const migrationTables=['jr_users','jr_sessions','jr_email_tokens','jr_operators','jr_aircraft','jr_charters','jr_listings','jr_bookings','jr_payments','jr_payment_events','jr_documents','jr_alerts','jr_audit'];
const fingerprint=table=>`SELECT count(*)::text AS count,md5(COALESCE(string_agg(md5(to_jsonb(t)::text),'' ORDER BY md5(to_jsonb(t)::text)),'')) AS checksum FROM public.${table} t`;
// Explicit, one-time, server-side migration. No credentials or customer rows enter logs.
// Both connections are supplied by the caller; no public HTTP migration endpoint exists.
export async function copyApplicationDatabase(source,target,schema,migrationId){
 let sourceOpen=false,targetOpen=false;
 try{
  await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');sourceOpen=true;
  await source.query("SET LOCAL timezone='UTC'");
  await target.query('BEGIN');targetOpen=true;await target.query("SET LOCAL timezone='UTC'");
  await target.query('SELECT pg_advisory_xact_lock(73489129)');
  const receiptExists=(await target.query("SELECT to_regclass('public.jr_migration_receipts') AS name")).rows[0].name;
  if(receiptExists){const receipt=(await target.query('SELECT summary FROM jr_migration_receipts WHERE id=$1',[migrationId])).rows[0];
   if(!receipt)throw Error('Destination contains an unrelated migration');
   for(const table of migrationTables){const a=(await source.query(fingerprint(table))).rows[0],b=(await target.query(fingerprint(table))).rows[0];if(a.count!==b.count||a.checksum!==b.checksum)throw Error('Previously copied destination no longer matches source');}
   await target.query('COMMIT');targetOpen=false;await source.query('COMMIT');sourceOpen=false;return {...receipt.summary,reused:true};
  }
  const existing=(await target.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'" )).rows;
  if(existing.length)throw Error('Migration destination must be empty');
  await target.query(schema);
  let totalRows=0,totalBytes=0;const counts={};
  for(const table of migrationTables){
   const expected=(await source.query(fingerprint(table))).rows[0];
   if(Number(expected.count)>10000)throw Error('Source exceeds bounded migration row limit');
   const sourceBytes=Number((await source.query(`SELECT COALESCE(sum(octet_length(to_jsonb(t)::text)),0)::text AS bytes FROM public.${table} t`)).rows[0].bytes);if(totalBytes+sourceBytes>50*1024*1024)throw Error('Source exceeds bounded migration byte limit');
   // Keep records as raw JSON text so bigints, microseconds and encrypted bytea
   // retain their exact PostgreSQL representation through the copy.
   const rows=(await source.query(`SELECT to_jsonb(t)::text AS record FROM public.${table} t`)).rows;
   totalRows+=rows.length;
   for(let offset=0;offset<rows.length;offset+=100){const body='['+rows.slice(offset,offset+100).map(r=>r.record).join(',')+']';totalBytes+=Buffer.byteLength(body);if(totalBytes>50*1024*1024)throw Error('Source exceeds bounded migration byte limit');await target.query(`INSERT INTO public.${table} SELECT r.* FROM jsonb_populate_recordset(NULL::public.${table},$1::jsonb) r`,[body]);}
   const actual=(await target.query(fingerprint(table))).rows[0];if(expected.count!==actual.count||expected.checksum!==actual.checksum)throw Error('Copied table integrity check failed');counts[table]=rows.length;
  }
  const sequence=(await source.query('SELECT last_value::text AS value,is_called FROM public.jr_audit_id_seq')).rows[0];
  await target.query("SELECT setval(pg_get_serial_sequence('public.jr_audit','id'),GREATEST($1::bigint,COALESCE((SELECT max(id) FROM public.jr_audit),1)),$2 OR (SELECT count(*)>0 FROM public.jr_audit))",[sequence.value,sequence.is_called]);
  const summary={tables:migrationTables.length,rows:totalRows,verified:true,counts};
  await target.query('CREATE TABLE jr_migration_receipts(id text PRIMARY KEY,summary jsonb NOT NULL,completed_at timestamptz NOT NULL DEFAULT now())');
  await target.query('INSERT INTO jr_migration_receipts(id,summary) VALUES($1,$2)',[migrationId,JSON.stringify(summary)]);
  await target.query('COMMIT');targetOpen=false;await source.query('COMMIT');sourceOpen=false;return summary;
 }catch(e){if(targetOpen)await target.query('ROLLBACK').catch(()=>{});if(sourceOpen)await source.query('ROLLBACK').catch(()=>{});throw e}
}
export async function runConfiguredMigration(){
 const destination=process.env.DATABASE_MIGRATION_TARGET_URL;if(!destination)return;
 if(process.env.DATABASE_WRITE_MAINTENANCE!=='true')throw Error('Migration requires account write maintenance');
 const url=new URL(destination);if(url.protocol!=='postgresql:'||!url.hostname.endsWith('.neon.tech')||url.hostname.includes('-pooler.')||url.searchParams.get('sslmode')!=='verify-full')throw Error('Migration requires a direct Neon connection with verified TLS');
 if(destination===process.env.DATABASE_URL)throw Error('Migration source and destination must differ');
 const config={connectionTimeoutMillis:15000,statement_timeout:120000,enableChannelBinding:true};
 const source=new pg.Client({...config,connectionString:process.env.DATABASE_URL}),target=new pg.Client({...config,connectionString:destination});
 try{await source.connect();await target.connect();const summary=await copyApplicationDatabase(source,target,await readFile(new URL('./schema.sql',import.meta.url),'utf8'),'jetrelay-render-to-neon-20261031');console.log('Database migration verified',JSON.stringify({tables:summary.tables,rows:summary.rows,verified:summary.verified,reused:!!summary.reused}));}
 catch(e){console.error('Database migration failed',e.code||e.name);throw Error('Database migration did not complete; original database retained');}
 finally{await source.end().catch(()=>{});await target.end().catch(()=>{});}
}
