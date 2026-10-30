import pg from 'pg';
import {readFile} from 'node:fs/promises';
let pool=null;export let databaseStatus='NOT_CONFIGURED';
export async function initializeDatabase(){if(!process.env.DATABASE_URL)return false;pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:5000,idleTimeoutMillis:30000,statement_timeout:10000});pool.on('error',()=>{databaseStatus='UNAVAILABLE';console.error('Database pool connection error')});try{await transaction(async db=>{await db.query('SELECT pg_advisory_xact_lock(73489123)');await db.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8'))});databaseStatus='CONNECTED';return true}catch{databaseStatus='UNAVAILABLE';console.error('Database initialization failed');return false}}
export async function query(sql,values=[]){if(!pool)throw Object.assign(new Error('Database connection is not configured'),{status:503});return pool.query(sql,values)}
export async function transaction(fn){if(!pool)throw Object.assign(new Error('Database connection is not configured'),{status:503});const db=await pool.connect();try{await db.query('BEGIN');const result=await fn(db);await db.query('COMMIT');return result}catch(e){await db.query('ROLLBACK');throw e}finally{db.release()}}
export async function ping(){if(!pool)return false;try{await query('SELECT 1');databaseStatus='CONNECTED';return true}catch{databaseStatus='UNAVAILABLE';return false}}
export async function shutdown(){await pool?.end();pool=null}

export function useTestDatabase(adapter){if(process.env.NODE_ENV!=='test')throw Error('Test adapter is disabled');let tail=Promise.resolve();pool={query:(...args)=>adapter.query(...args),connect:async()=>{let release;const previous=tail;tail=new Promise(r=>release=r);await previous;return {query:(...args)=>adapter.query(...args),release}},end:()=>adapter.close()};databaseStatus='CONNECTED'}
