import test from 'node:test';
import assert from 'node:assert/strict';
import {databaseConnectionString} from '../render/platform/database.mjs';
test('hostname-only routing preserves credentials and verified TLS',()=>{
 const original='postgresql://fixture:fixture-only@ep-original.c-13.us-east-1.aws.neon.tech/jetrelay?sslmode=verify-full';
 const result=new URL(databaseConnectionString({DATABASE_URL:original,DATABASE_HOST:'ep-preserved.c-13.us-east-1.aws.neon.tech'}));
 assert.equal(result.hostname,'ep-preserved.c-13.us-east-1.aws.neon.tech');assert.equal(result.password,'fixture-only');assert.equal(result.searchParams.get('sslmode'),'verify-full');
 assert.equal(databaseConnectionString({DATABASE_URL:original}),original);
});
test('routing override refuses external hosts and unverified TLS',()=>{
 for(const [url,host] of [['postgresql://fixture@ep-original.neon.tech/db?sslmode=verify-full','evil.example'],['postgresql://fixture@ep-original.neon.tech/db?sslmode=require','ep-preserved.neon.tech'],['postgresql://fixture@other.example/db?sslmode=verify-full','ep-preserved.neon.tech']])assert.throws(()=>databaseConnectionString({DATABASE_URL:url,DATABASE_HOST:host}));
});
