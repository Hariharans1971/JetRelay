import {airport} from './domain.mjs';
import {fail} from './security.mjs';

// Only fixed SQL fragments enter the query; every visitor value is bound.
export function listingSearch(params){
 const values=[],where=["l.status='published'","l.departure>now()","o.status='verified'","a.status='verified'","c.status='confirmed'","a.insurance_expires>=l.arrival::date","NOT EXISTS(SELECT 1 FROM jr_bookings b WHERE b.listing_id=l.id AND (b.status IN ('confirmed','review_required','refund_pending') OR (b.status='held' AND b.hold_until>now())))"];
 const bind=value=>{values.push(value);return '$'+values.length};
 for(const field of ['origin','destination'])if(params.get(field))where.push('l.'+field+'='+bind(airport(params.get(field))));
 const date=params.get('date'),flex=params.get('flex')||'0',passengers=params.get('passengers'),currency=params.get('currency'),sort=params.get('sort')||'departure';
 if(!['0','1','3'].includes(flex))fail('Date flexibility must be 0, 1 or 3 days');
 if(!date&&flex!=='0')fail('Choose a departure date before using flexible dates');
 if(date){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)fail('Invalid date');
  const day=bind(date),days=bind(Number(flex));
  where.push(`(l.departure AT TIME ZONE 'UTC')::date BETWEEN ${day}::date-${days}::integer AND ${day}::date+${days}::integer`);
 }
 if(passengers){if(!/^(?:[1-9]\d?|100)$/.test(passengers))fail('Passengers must be a whole number between 1 and 100');where.push('a.seats>='+bind(Number(passengers)))}
 if(currency){if(!['INR','USD','EUR','GBP','AED'].includes(currency))fail('Unsupported currency');where.push('l.currency='+bind(currency))}
 if(!['departure','price'].includes(sort))fail('Choose earliest departure or lowest price');
 if(sort==='price'&&!currency)fail('Choose one currency before sorting by price');
 const order=sort==='price'?'l.price_minor ASC,l.departure ASC,l.id ASC':'l.departure ASC,l.id ASC';
 return {values,where:where.join(' AND '),order};
}
