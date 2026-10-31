import test from 'node:test';
import assert from 'node:assert/strict';
import {listingSearch} from '../render/platform/listing-search.mjs';

test('search rejects malformed capacity, date windows and unsafe sort values',()=>{
 for(const query of ['passengers=0','passengers=101','passengers=2.5','passengers=1e1','date=2027-02-30','flex=3','date=2027-01-01&flex=7','sort=price','sort=price&currency=XXX','sort=departure;DROP TABLE jr_users']){
  assert.throws(()=>listingSearch(new URLSearchParams(query)),error=>error.status===400,query);
 }
});
test('search binds visitor values and compares prices within one currency',()=>{
 const result=listingSearch(new URLSearchParams('origin=vidp&destination=vabb&date=2027-01-01&flex=3&passengers=6&currency=INR&sort=price'));
 assert.deepEqual(result.values,['VIDP','VABB','2027-01-01',3,6,'INR']);
 assert.match(result.where,/AT TIME ZONE 'UTC'/);
 assert.ok(!result.where.includes('VIDP'));
 assert.equal(result.order,'l.price_minor ASC,l.departure ASC,l.id ASC');
});
test('discovery retains verification and active-booking exclusion',()=>{
 const result=listingSearch(new URLSearchParams());
 for(const rule of ["o.status='verified'","a.status='verified'","c.status='confirmed'","b.hold_until>now()","refund_pending"]){assert.ok(result.where.includes(rule),rule)}
 assert.equal(result.order,'l.departure ASC,l.id ASC');
});
