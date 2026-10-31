import {randomUUID} from 'node:crypto';
import {transaction,query} from './database.mjs';
import {encrypt,decrypt} from './security.mjs';
export const notificationConfigured=()=>!!(process.env.RESEND_API_KEY&&process.env.EMAIL_FROM&&/^[a-f0-9]{64}$/i.test(process.env.DOCUMENT_ENCRYPTION_KEY||''));
export async function enqueueNotification(db,bookingId,eventKey,kind,details={}){
 await db.query('INSERT INTO jr_notifications(id,event_key,user_id,booking_id,kind,details) SELECT $1,$2,user_id,id,$4,$5 FROM jr_bookings WHERE id=$3 ON CONFLICT(event_key) DO NOTHING',[randomUUID(),eventKey,bookingId,kind,JSON.stringify(details)]);
}
function delivery(row){
 const link=new URL('/portal.html?role=client',process.env.PUBLIC_ORIGIN||process.env.RENDER_EXTERNAL_URL||'http://localhost');
 if(link.protocol!=='https:'&&process.env.NODE_ENV!=='test')throw Error('secure_origin_required');
 const states={confirmed:'Your payment has been recorded. Flight-specific operator confirmation is still required before travel.',refund_pending:'Your payment requires refund review. This is not a confirmed journey.',pending:'Your refund request is pending with the payment provider.',requires_action:'Your refund needs customer or provider action. Check your account and contact your operator.',succeeded:'The payment provider reports that your full refund succeeded. Bank posting times can vary.',failed:'The payment provider reports that your refund failed. Administrator follow-up is required.',canceled:'The payment provider reports that your refund was cancelled. Administrator follow-up is required.',partial_refund_review:'A partial refund needs administrator review. The booking has not been marked fully refunded.',multiple_refunds_review:'Multiple refund transactions need administrator review. The booking has not been marked fully refunded.'};
 const text=row.kind==='flight_disruption'?'The original charter was cancelled and the linked empty leg was withdrawn. Do not travel on the basis of this listing. Check your account for payment/refund follow-up.':row.kind==='cancellation_update'?'Your cancellation request has been recorded. Any paid booking remains subject to the operator terms and refund review.':states[row.details?.status]||'Your booking has an update. Check your account for the current status.';
 return {from:process.env.EMAIL_FROM,to:[row.email],subject:'JetRelay booking update',text:text+'\n\nBooking reference: '+row.booking_id+'\nRoute: '+row.origin+' to '+row.destination+'\nScheduled departure (UTC): '+new Date(row.departure).toISOString()+'\n\nView the current status: '+link.href+'\nThis message is not a ticket or clearance to fly.'};
}
async function providerSend(payload,key){
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000)});
 if(!r.ok){const e=Error('provider_'+r.status);e.permanent=r.status>=400&&r.status<500&&![408,429].includes(r.status);throw e}
 const data=await r.json();if(typeof data.id!=='string'||!data.id)throw Error('provider_response_invalid');return data.id;
}
let testSender=null;
export function useTestNotificationSender(sender){if(process.env.NODE_ENV!=='test')throw Error('Test sender is disabled');testSender=sender}
export async function drainNotifications({limit=5}={}){
 if(!notificationConfigured()||process.env.DATABASE_WRITE_MAINTENANCE==='true')return {enabled:false,sent:0,failed:0};
 let sent=0,failed=0;
 await query("UPDATE jr_notifications SET status='failed',last_error='stale_or_retry_limit',locked_by=NULL,lease_until=NULL WHERE status IN ('queued','sending') AND (lease_until IS NULL OR lease_until<now()) AND (created_at<now()-interval '24 hours' OR first_attempt_at<now()-interval '23 hours' OR attempts>=6)");
 for(let i=0;i<Math.min(10,Math.max(0,limit));i++){
  const lease=randomUUID();
  const row=await transaction(async db=>{
   const r=(await db.query("SELECT n.*,u.email,u.email_verified,l.origin,l.destination,l.departure FROM jr_notifications n JOIN jr_users u ON u.id=n.user_id JOIN jr_bookings b ON b.id=n.booking_id JOIN jr_listings l ON l.id=b.listing_id WHERE n.status IN ('queued','sending') AND n.next_attempt_at<=now() AND (n.lease_until IS NULL OR n.lease_until<now()) AND n.attempts<6 ORDER BY n.created_at,n.id FOR UPDATE OF n SKIP LOCKED LIMIT 1")).rows[0];
   if(!r)return null;
   if(!r.email_verified){await db.query("UPDATE jr_notifications SET status='failed',last_error='recipient_not_verified' WHERE id=$1",[r.id]);return {skipped:true}}
   const encrypted=r.payload_ciphertext?{ciphertext:r.payload_ciphertext,iv:r.payload_iv,tag:r.payload_tag}:encrypt(Buffer.from(JSON.stringify(delivery(r))),process.env.DOCUMENT_ENCRYPTION_KEY);
   await db.query("UPDATE jr_notifications SET status='sending',attempts=attempts+1,first_attempt_at=COALESCE(first_attempt_at,now()),lease_until=now()+interval '2 minutes',locked_by=$1,payload_ciphertext=$2,payload_iv=$3,payload_tag=$4 WHERE id=$5",[lease,encrypted.ciphertext,encrypted.iv,encrypted.tag,r.id]);
   return {...r,encrypted,attempts:r.attempts+1};
  });
  if(!row)break;if(row.skipped){failed++;continue}
  try{
   const payload=JSON.parse(decrypt(row.encrypted,process.env.DOCUMENT_ENCRYPTION_KEY).toString());
   const messageId=await (testSender||providerSend)(payload,'jetrelay-notification/'+row.id);
   if(typeof messageId!=='string'||!messageId)throw Error('provider_response_invalid');
   const result=await query("UPDATE jr_notifications SET status='sent',sent_at=now(),provider_message_id=$1,last_error=NULL,locked_by=NULL,lease_until=NULL WHERE id=$2 AND locked_by=$3",[messageId,row.id,lease]);if(result.rowCount)sent++;
  }catch(e){
   const permanent=e.permanent===true||row.attempts>=6,delay=Math.min(3600,30*2**(row.attempts-1));
   await query("UPDATE jr_notifications SET status=$1,last_error=$2,next_attempt_at=now()+($3::integer*interval '1 second'),locked_by=NULL,lease_until=NULL WHERE id=$4 AND locked_by=$5",[permanent?'failed':'queued',/^provider_\d{3}$/.test(e.message)?e.message:'delivery_unavailable',delay,row.id,lease]);failed++;
  }
 }
 return {enabled:true,sent,failed};
}
export function startNotificationWorker(){
 let running=false,stopped=false;
 const tick=async()=>{if(running||stopped||!notificationConfigured()||process.env.DATABASE_WRITE_MAINTENANCE==='true')return;running=true;try{await drainNotifications()}catch{console.error('Notification worker unavailable')}finally{running=false}};
 const timer=setInterval(tick,30000);timer.unref();void tick();
 return ()=>{stopped=true;clearInterval(timer)};
}
