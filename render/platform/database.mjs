import pg from 'pg';
import {readFile} from 'node:fs/promises';
let transactionProbe=false;let pool=null;export let databaseStatus='NOT_CONFIGURED';
export async function initializeDatabase(){if(!process.env.DATABASE_URL)return false;pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:5000,idleTimeoutMillis:30000,statement_timeout:10000});pool.on('error',()=>{databaseStatus='UNAVAILABLE';console.error('Database pool connection error')});try{await transaction(async db=>{await db.query('SELECT pg_advisory_xact_lock(73489123)');await db.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8'))});transactionProbe=await verifyDatabaseTransactions();databaseStatus='CONNECTED';return true}catch{databaseStatus='UNAVAILABLE';console.error('Database initialization failed');return false}}
export async function query(sql,values=[]){if(!pool)throw Object.assign(new Error('Database connection is not configured'),{status:503});return pool.query(sql,values)}
export async function transaction(fn){if(!pool)throw Object.assign(new Error('Database connection is not configured'),{status:503});const db=await pool.connect();try{await db.query('BEGIN');const result=await fn(db);await db.query('COMMIT');return result}catch(e){await db.query('ROLLBACK');throw e}finally{db.release()}}
export async function ping(){if(!pool)return false;try{await query('SELECT 1');databaseStatus='CONNECTED';return true}catch{databaseStatus='UNAVAILABLE';return false}}
export async function shutdown(){await pool?.end();pool=null}

export function useTestDatabase(adapter){if(process.env.NODE_ENV!=='test')throw Error('Test adapter is disabled');let tail=Promise.resolve();pool={query:(...args)=>adapter.query(...args),connect:async()=>{let release;const previous=tail;tail=new Promise(r=>release=r);await previous;return {query:(...args)=>adapter.query(...args),release}},end:()=>adapter.close()};databaseStatus='CONNECTED'}

// Read-only diagnostics: no customer rows, credentials or database version are exposed.
const expectedTables=['jr_users','jr_sessions','jr_email_tokens','jr_operators','jr_aircraft','jr_charters','jr_listings','jr_bookings','jr_payments','jr_payment_events','jr_documents','jr_alerts','jr_audit'];
async function inspectDatabaseReadiness(){
 const checked_at=new Date().toISOString();
 if(!pool)return {connected:false,schema_ready:false,booking_constraints_ready:false,read_only_transaction:false,checked_at};
 try{return await transaction(async db=>{
  await db.query('SET TRANSACTION READ ONLY');
  const tables=(await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() AND table_name=ANY($1::text[])",[expectedTables])).rows;
  const indexes=(await db.query("SELECT indexname,indexdef FROM pg_indexes WHERE schemaname=current_schema() AND indexname=ANY($1::text[])",[['jr_one_active_parent_return','jr_one_whole_aircraft_booking']])).rows;
  const refundColumns=(await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='jr_payments' AND column_name=ANY($1::text[])",[['payment_intent_id','refund_id','refund_status','refund_amount_minor']])).rows;
  const refundIndexes=(await db.query("SELECT indexdef FROM pg_indexes WHERE schemaname=current_schema() AND indexname=ANY($1::text[])",[['jr_payment_intent_unique','jr_refund_unique']])).rows;
  const readOnly=(await db.query("SELECT current_setting('transaction_read_only') AS value")).rows[0]?.value==='on';
  // Check the application's TLS socket: a managed proxy may terminate TLS before the PostgreSQL backend.
  const tls=db.connection?.stream?.encrypted===true;
  const certificateVerified=tls&&db.connection.stream.authorized===true;
  databaseStatus='CONNECTED';
  return {connected:true,schema_ready:tables.length===expectedTables.length,booking_constraints_ready:indexes.length===2&&indexes.every(i=>i.indexdef.startsWith('CREATE UNIQUE INDEX')&&i.indexdef.includes(' WHERE ')&&i.indexdef.includes(i.indexname==='jr_one_active_parent_return'?'(parent_charter_id)':'(listing_id)')),refund_tracking_ready:refundColumns.length===4&&refundIndexes.length===2&&refundIndexes.every(i=>i.indexdef.startsWith('CREATE UNIQUE INDEX')),read_only_transaction:readOnly,transport_encrypted:tls,certificate_verified:certificateVerified,transaction_write_probe:transactionProbe,checked_at};
 })}catch{databaseStatus='UNAVAILABLE';return {connected:false,schema_ready:false,booking_constraints_ready:false,read_only_transaction:false,checked_at}}
}

let readinessCache=null,readinessRequest=null;
export async function databaseReadiness({maxAgeMs=0}={}){
 if(maxAgeMs>0&&readinessCache?.pool===pool&&Date.now()-readinessCache.at<maxAgeMs)return readinessCache.value;
 if(maxAgeMs>0&&readinessRequest)return readinessRequest;
 const activePool=pool;
 const job=inspectDatabaseReadiness().then(value=>{readinessCache={pool:activePool,at:Date.now(),value};return value});
 if(maxAgeMs>0)readinessRequest=job;
 try{return await job}finally{if(readinessRequest===job)readinessRequest=null}
}

// Runs only during startup (or explicit isolated tests). The temporary table is
// connection-local and dropped at commit. No customer or permanent table is changed.
export async function verifyDatabaseTransactions(){
 return transaction(async db=>{
  await db.query('CREATE TEMP TABLE jr_startup_probe(id integer PRIMARY KEY,value text NOT NULL) ON COMMIT DROP');
  await db.query("INSERT INTO jr_startup_probe VALUES(1,'probe')");
  await db.query('SAVEPOINT rollback_probe');
  await db.query("INSERT INTO jr_startup_probe VALUES(2,'rollback')");
  await db.query('ROLLBACK TO SAVEPOINT rollback_probe');
  if(Number((await db.query('SELECT count(*) AS count FROM jr_startup_probe')).rows[0].count)!==1)throw Error('Transaction rollback probe failed');
  await db.query('SAVEPOINT unique_probe');
  let rejected=false;
  try{await db.query("INSERT INTO jr_startup_probe VALUES(1,'duplicate')")}catch(e){if(e.code!=='23505')throw e;rejected=true}
  await db.query('ROLLBACK TO SAVEPOINT unique_probe');
  if(!rejected)throw Error('Transaction uniqueness probe failed');
  transactionProbe=true;return true;
 })
}
