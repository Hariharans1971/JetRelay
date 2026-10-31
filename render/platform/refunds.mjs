import {fail} from './security.mjs';
import {enqueueNotification} from './notifications.mjs';
const providerId=value=>typeof value==='string'?value:value?.id;

// Called only with a provider API result, never an unverified browser payload.
export async function reconcileRefund(db,refund,actor=null){
 const intent=providerId(refund.payment_intent),booking=refund.metadata?.booking_id;
 if(!refund.id||!intent||!['pending','requires_action','succeeded','failed','canceled'].includes(refund.status))fail('Refund response is incomplete',503);
 const row=(await db.query('SELECT p.*,b.status AS booking_status FROM jr_payments p JOIN jr_bookings b ON b.id=p.booking_id WHERE p.refund_id=$1 OR p.payment_intent_id=$2 FOR UPDATE OF p,b',[refund.id,intent])).rows;
 if(!row.length)return {matched:false};
 if(row.length!==1)fail('Refund payment match requires review',409);
 const p=row[0];
 if(p.payment_intent_id!==intent||booking&&booking!==p.booking_id||refund.currency?.toUpperCase()!==p.currency||!Number.isSafeInteger(refund.amount)||refund.amount<=0||refund.amount>Number(p.amount_minor))fail('Refund does not match the recorded payment',409);
 if(!['paid','refunded'].includes(p.status))fail('Payment must be reconciled before its refund',503);
 if(p.refund_id&&p.refund_id!==refund.id){
  // Multiple/partial external refunds need a ledger; never declare the booking fully refunded.
  await db.query("UPDATE jr_bookings SET status='refund_pending' WHERE id=$1",[p.booking_id]);
  await db.query("UPDATE jr_payments SET refund_status='multiple_refunds_review',status='paid' WHERE id=$1",[p.id]);
  await db.query("INSERT INTO jr_audit(actor_id,action,target_id,details) VALUES($1,'refund.multiple_review',$2,$3)",[actor,p.booking_id,JSON.stringify({refund_id:refund.id})]);
  return {matched:true,completed:false,status:'multiple_refunds_review'};
 }
 // A delayed response from the initial create request cannot undo a terminal callback.
 if(['succeeded','failed','canceled'].includes(p.refund_status)&&['pending','requires_action'].includes(refund.status))return {matched:true,completed:p.refund_status==='succeeded'&&Number(p.refund_amount_minor)===Number(p.amount_minor),status:p.refund_status};
 if(p.refund_status==='multiple_refunds_review')return {matched:true,completed:false,status:p.refund_status};
 const full=refund.amount===Number(p.amount_minor),completed=full&&refund.status==='succeeded',status=full?refund.status:'partial_refund_review';
 await db.query('UPDATE jr_payments SET refund_id=$1,refund_status=$2,refund_amount_minor=$3,status=$4 WHERE id=$5',[refund.id,status,refund.amount,completed?'refunded':'paid',p.id]);
 await db.query('UPDATE jr_bookings SET status=$1 WHERE id=$2',[completed?'refunded':'refund_pending',p.booking_id]);
 if(p.refund_id!==refund.id||p.refund_status!==status||Number(p.refund_amount_minor)!==refund.amount){const audit=(await db.query('INSERT INTO jr_audit(actor_id,action,target_id,details) VALUES($1,$2,$3,$4) RETURNING id::text',[actor,'refund.'+status,p.booking_id,JSON.stringify({refund_id:refund.id,amount_minor:refund.amount,currency:p.currency})])).rows[0];await enqueueNotification(db,p.booking_id,'refund:'+audit.id,'refund_update',{status})}
 return {matched:true,completed,status};
}
