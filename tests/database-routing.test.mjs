import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {databaseConnectionString} from '../render/platform/database.mjs';
test('hostname-only routing preserves credentials and verified TLS',()=>{
 // Generate an ephemeral test value; never embed a reusable database credential.
 const password=randomBytes(24).toString('hex');
 const fixture=new URL('postgresql://ep-original.c-13.us-east-1.aws.neon.tech/jetrelay?sslmode=verify-full');
 fixture.username='fixture';fixture.password=password;
 const original=fixture.href;
 const result=new URL(databaseConnectionString({DATABASE_URL:original,DATABASE_HOST:'ep-preserved.c-13.us-east-1.aws.neon.tech'}));
 assert.equal(result.hostname,'ep-preserved.c-13.us-east-1.aws.neon.tech');assert.equal(result.password,password);assert.equal(result.searchParams.get('sslmode'),'verify-full');
 assert.equal(databaseConnectionString({DATABASE_URL:original}),original);
});
test('routing override refuses external hosts and unverified TLS',()=>{
 for(const [url,host] of [['postgresql://fixture@ep-original.neon.tech/db?sslmode=verify-full','evil.example'],['postgresql://fixture@ep-original.neon.tech/db?sslmode=require','ep-preserved.neon.tech'],['postgresql://fixture@other.example/db?sslmode=verify-full','ep-preserved.neon.tech']])assert.throws(()=>databaseConnectionString({DATABASE_URL:url,DATABASE_HOST:host}));
});
