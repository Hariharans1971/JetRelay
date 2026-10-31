// Explicit local integration run against a real PostgreSQL WASM engine.
// This does not certify connectivity to the managed Render database.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
process.env.NODE_ENV='test';process.env.ADMIN_BOOTSTRAP_TOKEN='test-only-bootstrap-token-'.repeat(3);process.env.DOCUMENT_ENCRYPTION_KEY='ab'.repeat(32);process.env.STRIPE_SECRET_KEY='sk_test_local_contract_only';process.env.STRIPE_WEBHOOK_SECRET='whsec_local_contract_only';delete process.env.DATABASE_URL;delete process.env.RESEND_API_KEY;delete process.env.EMAIL_FROM;
const module=await import(pathToFileURL(process.env.PGLITE_MODULE||'/tmp/jetrelay-test-engine/node_modules/@electric-sql/pglite/dist/index.js').href);const pg=new module.PGlite();await pg.exec(await readFile(new URL('../render/platform/schema.sql',import.meta.url),'utf8'));
const db=await import('../render/platform/database.mjs');db.useTestDatabase({query:async(...args)=>{const r=await pg.query(...args);return {...r,rowCount:r.affectedRows||r.rows.length}},close:()=>pg.close()});
const {totp}=await import('../render/platform/security.mjs');const {default:Stripe}=await import('../render/node_modules/stripe/esm/stripe.esm.node.js');const {server}=await import('../dist-node/server.mjs');await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;process.env.PUBLIC_ORIGIN=base;let checks=0;
async function call(path,body,user,expected=200,extra={}){const r=await fetch(base+'/api/v1/'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:base}:{}),...(user?{Cookie:user.cookie,'X-CSRF-Token':user.csrf}:{}),...extra},body:body?JSON.stringify(body):undefined});const d=await r.json();assert.equal(r.status,expected,path+': '+JSON.stringify(d));checks++;return {d,r}}
async function register(email,role='client'){await call('auth/register',{email,name:'Integration test',password:'Local-test-password-123!',role},null,201)}
async function login(email,portal='client',code){const {d,r}=await call('auth/login',{email,password:'Local-test-password-123!',portal,code});return {...d,cookie:r.headers.get('set-cookie').split(';')[0]}}
try{
 assert.equal(await db.verifyDatabaseTransactions(),true);assert.equal((await db.query("SELECT to_regclass('pg_temp.jr_startup_probe') AS name")).rows[0].name,null);checks+=2;
 const readiness=await db.databaseReadiness();assert.equal(readiness.schema_ready,true);assert.equal(readiness.booking_constraints_ready,true);assert.equal(readiness.read_only_transaction,true);checks+=3;
 await pg.exec('DROP INDEX jr_one_active_parent_return');assert.equal((await db.databaseReadiness()).booking_constraints_ready,false);checks++;await pg.exec("CREATE UNIQUE INDEX jr_one_active_parent_return ON jr_listings(parent_charter_id) WHERE status IN ('pending','published')");
 await call('listings?date=2026-99-99',null,null,400);await call('listings?date=2026-02-30',null,null,400);
 await call('auth/register',{email:'bad@test.test',name:'Bad',password:'Local-test-password-123!',role:'admin'},null,403);
 const secret='JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';await call('auth/bootstrap',{token:process.env.ADMIN_BOOTSTRAP_TOKEN,email:'admin@jetrelay.test',name:'Owner test',password:'Local-test-password-123!',totp_secret:secret,code:totp(secret)},null,201);
 await call('auth/login',{email:'admin@jetrelay.test',password:'Local-test-password-123!',portal:'admin'},null,401);const admin=await login('admin@jetrelay.test','admin',totp(secret));
 await register('operator@jetrelay.test','operator');await register('one@jetrelay.test');await register('two@jetrelay.test');await register('other@jetrelay.test','operator');const op=await login('operator@jetrelay.test','operator'),one=await login('one@jetrelay.test'),two=await login('two@jetrelay.test'),other=await login('other@jetrelay.test','operator');
 await call('admin/review',{type:'operator',id:randomUUID(),decision:'approve',note:'Test verification'},one,403);
 await call('operator/apply',{company:'Local test operator',licence:'LOCAL-TEST-AOC',country:'India'},op,201);await call('operator/apply',{company:'Other test operator',licence:'OTHER-TEST-AOC',country:'India'},other,201);
 const operator=(await db.query('SELECT * FROM jr_operators WHERE user_id=$1',[op.user.id])).rows[0];await call('admin/review',{type:'operator',id:operator.id,decision:'approve',note:'Local test credentials checked'},admin);
 const {d:a}=await call('operator/aircraft',{registration:'VT-LOCALTEST',model:'Test light jet',seats:6,insurance_expires:'2030-12-31'},op,201);await call('admin/review',{type:'aircraft',id:a.id,decision:'approve',note:'Local test insurance checked'},admin);
 const hour=3600000,start=Date.now()+48*hour,iso=n=>new Date(n).toISOString();const charter={aircraft_id:a.id,origin:'VABB',destination:'VIDP',departure:iso(start),arrival:iso(start+2*hour),reference:'TEST-PARENT'};
 const {d:c}=await call('operator/charters',charter,op,201);await call('operator/charters',charter,other,403);await call('operator/charters',charter,op,409);
 const leg={parent_charter_id:c.id,origin:'VIDP',destination:'VABB',departure:iso(start+3*hour),arrival:iso(start+5*hour),price_minor:20000000,currency:'INR',cancellation_terms:'Local test terms. Full refund if operator cancels.'};await call('operator/empty-legs',{...leg,origin:'VABB',destination:'VIDP'},op,400);const {d:l}=await call('operator/empty-legs',leg,op,201);await call('operator/empty-legs',leg,op,409);
 assert.equal((await call('listings')).d.total,0);await call('admin/review',{type:'listing',id:l.id,decision:'approve',note:'Local test parent charter checked'},admin);assert.equal((await call('listings')).d.total,1);
 // Exercise real SQL filtering against isolated inventory, never production records.
 assert.equal((await call('listings?passengers=7')).d.total,0);
 assert.equal((await call('listings?passengers=6&currency=INR&sort=price')).d.total,1);
 assert.equal((await call('listings?currency=USD')).d.total,0);
 await call('listings?passengers=2.5',null,null,400);await call('listings?sort=price',null,null,400);
 await call('listings?flex=3',null,null,400);await call('listings?sort=bad',null,null,400);
 const departureDay=leg.departure.slice(0,10),nextDay=iso(start+3*hour+24*hour).slice(0,10);
 assert.equal((await call('listings?date='+nextDay)).d.total,0);
 assert.equal((await call('listings?date='+nextDay+'&flex=1')).d.total,1);
 assert.equal((await call('listings?date='+departureDay+'&passengers=6')).d.date_basis,'UTC');
 const secondParent=randomUUID(),secondListing=randomUUID();
 await db.query("INSERT INTO jr_charters(id,operator_id,aircraft_id,origin,destination,departure,arrival,reference) SELECT $1,operator_id,aircraft_id,origin,destination,departure+interval '2 days',arrival+interval '2 days','SECOND-TEST-PARENT' FROM jr_charters WHERE id=$2",[secondParent,c.id]);
 await db.query("INSERT INTO jr_listings(id,operator_id,aircraft_id,parent_charter_id,origin,destination,departure,arrival,price_minor,currency,cancellation_terms,status) SELECT $1,operator_id,aircraft_id,$2,origin,destination,departure+interval '2 days',arrival+interval '2 days',price_minor-100,'INR',cancellation_terms,'published' FROM jr_listings WHERE id=$3",[secondListing,secondParent,l.id]);
 assert.deepEqual((await call('listings?currency=INR&sort=price')).d.listings.map(x=>x.id),[secondListing,l.id]);
 assert.deepEqual((await call('listings?sort=departure')).d.listings.map(x=>x.id),[l.id,secondListing]);
 assert.equal((await call('listings?date='+departureDay+'&flex=3')).d.total,2);
 // Explicit UTC semantics must hold even if the database session has a different timezone.
 await pg.exec("SET TIME ZONE 'Pacific/Honolulu'");
 assert.equal((await call('listings?date='+departureDay)).d.total,1);
 await pg.exec("SET TIME ZONE 'UTC'");
 await db.query('DELETE FROM jr_listings WHERE id=$1',[secondListing]);await db.query('DELETE FROM jr_charters WHERE id=$1',[secondParent]);
 const booking={listing_id:l.id,passengers:2,idempotency_key:randomUUID(),accepted_terms:true};await call('bookings',booking,one,403);await db.query('UPDATE jr_users SET email_verified=true WHERE role=\'client\'');await call('bookings',{...booking,accepted_terms:false},one,400);await call('bookings',booking,one,403,{Origin:'https://evil.example'});
 const results=await Promise.all([call('bookings',booking,one,201),call('bookings',{...booking,idempotency_key:randomUUID()},two,409)]);const held=results[0].d.booking;assert.equal((await call('bookings',booking,one,201)).d.booking.id,held.id);
 await call('documents',{booking_id:held.id,filename:'note.pdf',mime:'application/pdf',content_base64:Buffer.from('%PDF-1.4 local test').toString('base64')},one,403);
 const paymentId=randomUUID();await db.query('INSERT INTO jr_payments(id,booking_id,session_id,amount_minor,currency) VALUES($1,$2,$3,$4,$5)',[paymentId,held.id,'cs_test_local',held.price_minor,held.currency]);
 const event={id:'evt_local_test',type:'checkout.session.completed',data:{object:{id:'cs_test_local',payment_status:'paid',amount_total:Number(held.price_minor),currency:'inr',metadata:{booking_id:held.id}}}};const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
 async function webhook(e,valid=true,expected=valid?200:400){const payload=JSON.stringify(e),signature=valid?stripe.webhooks.generateTestHeaderString({payload,secret:process.env.STRIPE_WEBHOOK_SECRET}):'invalid';const r=await fetch(base+'/api/v1/payments/webhook',{method:'POST',headers:{'Content-Type':'application/json','stripe-signature':signature},body:payload});assert.equal(r.status,expected,await r.text());checks++}
 await webhook(event,false);await webhook(event);await webhook(event);await webhook({...event,id:'evt_second_paid_event',type:'checkout.session.async_payment_succeeded'});assert.equal((await db.query('SELECT status FROM jr_bookings WHERE id=$1',[held.id])).rows[0].status,'confirmed');
 const {d:doc}=await call('documents',{booking_id:held.id,filename:'note.pdf',mime:'application/pdf',content_base64:Buffer.from('%PDF-1.4 local test').toString('base64')},one,201);await call('documents/'+doc.id,null,two,404);const file=await fetch(base+'/api/v1/documents/'+doc.id,{headers:{Cookie:one.cookie}});assert.equal(await file.text(),'%PDF-1.4 local test');checks++;
 await call('operator/cancel-charter',{id:c.id},op);assert.equal((await db.query('SELECT status FROM jr_bookings WHERE id=$1',[held.id])).rows[0].status,'refund_pending');assert.equal((await call('listings')).d.total,0);
 // Provider-backed refund lifecycle using an explicit test-only SDK substitute.
 const preserved=(await db.query('SELECT booking_id,amount_minor,currency FROM jr_payments WHERE id=$1',[paymentId])).rows[0];
 await pg.exec('ALTER TABLE jr_payments DROP COLUMN payment_intent_id; ALTER TABLE jr_payments DROP COLUMN refund_id; ALTER TABLE jr_payments DROP COLUMN refund_status; ALTER TABLE jr_payments DROP COLUMN refund_amount_minor;');
 assert.equal((await db.databaseReadiness()).refund_tracking_ready,false);
 await pg.exec(await readFile(new URL('../render/platform/schema.sql',import.meta.url),'utf8'));
 await pg.exec(await readFile(new URL('../render/platform/schema.sql',import.meta.url),'utf8'));
 assert.deepEqual((await db.query('SELECT booking_id,amount_minor,currency FROM jr_payments WHERE id=$1',[paymentId])).rows[0],preserved);
 assert.equal((await db.databaseReadiness()).refund_tracking_ready,true);checks+=3;
 const {useTestPaymentClient}=await import('../render/platform/api.mjs');let createCalls=0;
 let currentRefund={id:'re_local_full',payment_intent:'pi_local_paid',amount:Number(held.price_minor),currency:'inr',status:'pending',metadata:{booking_id:held.id}};
 useTestPaymentClient({webhooks:stripe.webhooks,checkout:{sessions:{retrieve:async()=>({payment_intent:'pi_local_paid',payment_status:'paid',amount_total:Number(held.price_minor),currency:'inr',metadata:{booking_id:held.id}})}},refunds:{create:async(data,options)=>{createCalls++;assert.equal(data.amount,Number(held.price_minor));assert.equal(options.idempotencyKey,'refund-payment-'+paymentId);return structuredClone(currentRefund)},retrieve:async id=>{assert.equal(id,currentRefund.id);return structuredClone(currentRefund)}}});
 await call('admin/refund',{booking_id:held.id},one,403);
 assert.equal((await call('admin/refund',{booking_id:held.id},admin,202)).d.status,'pending');
 assert.equal((await db.query('SELECT status FROM jr_bookings WHERE id=$1',[held.id])).rows[0].status,'refund_pending');
 assert.equal((await call('dashboard',null,one)).d.bookings[0].payments[0].refund_status,'pending');
 await call('admin/refund-status',{booking_id:held.id},one,403);
 await call('admin/refund',{booking_id:held.id},admin,202);assert.equal(createCalls,1);
 const refundEvent={id:'evt_refund_success',type:'refund.updated',data:{object:{...currentRefund,status:'pending'}}};
 currentRefund.status='succeeded';await webhook(refundEvent);await webhook(refundEvent);
 assert.equal((await db.query('SELECT status FROM jr_bookings WHERE id=$1',[held.id])).rows[0].status,'refunded');
 assert.equal((await call('admin/refund-status',{booking_id:held.id},admin)).d.status,'succeeded');
 await webhook({...refundEvent,id:'evt_refund_old_pending',type:'refund.created'});
 assert.equal((await db.query('SELECT status FROM jr_bookings WHERE id=$1',[held.id])).rows[0].status,'refunded');
 currentRefund.status='failed';await webhook({...refundEvent,id:'evt_refund_failed',type:'refund.failed'});
 assert.equal((await db.query('SELECT status FROM jr_bookings WHERE id=$1',[held.id])).rows[0].status,'refund_pending');
 assert.equal((await call('admin/refund-status',{booking_id:held.id},admin,202)).d.status,'failed');assert.equal(createCalls,1);
 currentRefund.currency='usd';await webhook({...refundEvent,id:'evt_refund_mismatch'},true,503);
 assert.equal((await db.query("SELECT count(*) AS count FROM jr_payment_events WHERE event_id='evt_refund_mismatch'")).rows[0].count,0);
 currentRefund.currency='inr';currentRefund.status='succeeded';await webhook({...refundEvent,id:'evt_refund_mismatch'});
 assert.equal((await db.query('SELECT status FROM jr_bookings WHERE id=$1',[held.id])).rows[0].status,'refunded');
 const {reconcileRefund}=await import('../render/platform/refunds.mjs');
 assert.equal((await db.transaction(tx=>reconcileRefund(tx,{...currentRefund,status:'pending'}))).status,'succeeded');
 assert.equal((await db.query('SELECT status FROM jr_bookings WHERE id=$1',[held.id])).rows[0].status,'refunded');
 await assert.rejects(db.transaction(tx=>reconcileRefund(tx,{...currentRefund,amount:currentRefund.amount+1})),/does not match/);
 await assert.rejects(db.transaction(tx=>reconcileRefund(tx,{...currentRefund,metadata:{booking_id:randomUUID()}})),/does not match/);
 assert.equal((await db.transaction(tx=>reconcileRefund(tx,{...currentRefund,amount:currentRefund.amount-100}))).status,'partial_refund_review');
 assert.equal((await db.query('SELECT status FROM jr_bookings WHERE id=$1',[held.id])).rows[0].status,'refund_pending');
 assert.equal((await db.transaction(tx=>reconcileRefund(tx,{...currentRefund,id:'re_second_external'}))).status,'multiple_refunds_review');
 assert.equal((await db.transaction(tx=>reconcileRefund(tx,currentRefund))).completed,false);checks+=8;
 useTestPaymentClient(null);
 // Durable outbox tests. No provider network calls or real emails are permitted.
 const {enqueueNotification,drainNotifications,useTestNotificationSender}=await import('../render/platform/notifications.mjs');
 await db.query('DELETE FROM jr_notifications');
 await assert.rejects(db.transaction(async tx=>{await enqueueNotification(tx,held.id,'rolled-back','refund_update',{status:'pending'});throw Error('rollback fixture')}),/rollback fixture/);
 assert.equal((await db.query('SELECT count(*) AS count FROM jr_notifications')).rows[0].count,0);
 await db.transaction(async tx=>{await enqueueNotification(tx,held.id,'unique-update','refund_update',{status:'pending'});await enqueueNotification(tx,held.id,'unique-update','refund_update',{status:'pending'})});
 assert.equal((await db.query('SELECT count(*) AS count FROM jr_notifications')).rows[0].count,1);
 assert.equal((await drainNotifications()).enabled,false);
 assert.equal((await db.query('SELECT attempts FROM jr_notifications')).rows[0].attempts,0);
 assert.equal((await call('dashboard',null,two)).d.notifications.length,0);
 await call('admin/operations',null,one,403);assert.equal((await call('admin/operations',null,admin)).d.notifications.configured,false);
 process.env.RESEND_API_KEY='test-only-not-a-real-key';process.env.EMAIL_FROM='JetRelay <no-reply@example.invalid>';
 const delivered=[];useTestNotificationSender(async(payload,key)=>{delivered.push({payload,key});if(delivered.length===1)throw Error('provider_429');return 'email_local_'+delivered.length});
 assert.equal((await drainNotifications({limit:1})).failed,1);
 let job=(await db.query('SELECT * FROM jr_notifications')).rows[0];assert.equal(job.status,'queued');assert.equal(job.last_error,'provider_429');assert.ok(job.payload_ciphertext.length);assert.ok(!Buffer.from(job.payload_ciphertext).toString().includes('@jetrelay.test'));
 process.env.EMAIL_FROM='Changed <other@example.invalid>';
 await db.query("UPDATE jr_notifications SET status='sending',next_attempt_at=now(),lease_until=now()-interval '1 minute',locked_by=$1",[randomUUID()]);
 assert.equal((await drainNotifications({limit:1})).sent,1);
 assert.deepEqual(delivered[0],delivered[1]);assert.equal((await drainNotifications({limit:1})).sent,0);
 const sent=(await db.query('SELECT * FROM jr_notifications')).rows[0];assert.equal(sent.status,'sent');assert.equal(sent.attempts,2);assert.ok(sent.sent_at);assert.equal(sent.payload_ciphertext.toString(),job.payload_ciphertext.toString());
 await db.transaction(async tx=>{await enqueueNotification(tx,held.id,'concurrent-a','payment_update',{status:'confirmed'});await enqueueNotification(tx,held.id,'concurrent-b','flight_disruption')});
 const before=delivered.length;const workerResults=await Promise.all([drainNotifications({limit:1}),drainNotifications({limit:1})]);assert.equal(workerResults.reduce((n,r)=>n+r.sent,0),2);assert.equal(new Set(delivered.slice(before).map(x=>x.key)).size,2);
 await db.transaction(tx=>enqueueNotification(tx,held.id,'stale-job','refund_update',{status:'pending'}));await db.query("UPDATE jr_notifications SET created_at=now()-interval '2 days' WHERE event_key='stale-job'");await drainNotifications();assert.equal((await db.query("SELECT status,last_error FROM jr_notifications WHERE event_key='stale-job'")).rows[0].last_error,'stale_or_retry_limit');
 await db.transaction(tx=>enqueueNotification(tx,held.id,'permanent-failure','refund_update',{status:'failed'}));useTestNotificationSender(async()=>{throw Object.assign(Error('provider_401'),{permanent:true})});await drainNotifications();assert.equal((await db.query("SELECT status FROM jr_notifications WHERE event_key='permanent-failure'")).rows[0].status,'failed');
 useTestNotificationSender(null);delete process.env.RESEND_API_KEY;delete process.env.EMAIL_FROM;checks+=20;
 await call('auth/logout',{},one);assert.equal((await call('session',null,one)).d.user,null);console.log(JSON.stringify({integration_checks:checks,engine:'PostgreSQL WASM PGlite',result:'PASS',managed_database_connection:'NOT_TESTED',stripe:'SIGNED_LOCAL_WEBHOOK_CONTRACT_ONLY'}));
}finally{await new Promise(r=>server.close(r));await db.shutdown()}
