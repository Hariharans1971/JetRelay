import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/booking.mjs',import.meta.url),'utf8').replace(/load\(\);\s*$/,'');
function page(){
 const nodes=new Map(),timers=[],requests=[];
 const node=key=>{if(!nodes.has(key))nodes.set(key,{value:'',innerHTML:'',textContent:'',className:'',append(){}});return nodes.get(key)};
 const form=node('#search');form.elements=Object.fromEntries(['date','flex','passengers','currency','sort'].map(key=>[key,{value:key==='flex'?'0':key==='sort'?'departure':''}]));
 const context=vm.createContext({document:{querySelector:node,querySelectorAll:()=>[],createElement:()=>({})},location:{search:'',origin:'https://example.test'},history:{replaceState(){}},navigator:{clipboard:{writeText:async()=>{}}},URL,URLSearchParams,AbortSignal,Intl,Date,setTimeout(fn){timers.push(fn);return timers.length},clearTimeout(){},fetch:()=>new Promise(resolve=>requests.push(resolve))});
 vm.runInContext(source,context);return {context,node,timers,requests,run:code=>vm.runInContext(code,context)};
}
test('an old airport response cannot restore a selection after the input is shortened',async()=>{
 const p=page();p.node('#from').value='VABB';p.node('#from').oninput();const pending=p.timers[0]();
 p.node('#from').value='V';p.node('#from').oninput();
 p.requests[0]({ok:true,json:async()=>({airports:[{ident:'VABB',iata:'BOM',name:'Mumbai'}]})});await pending;
 assert.throws(()=>p.run('searchQuery()'),/Choose each airport/);
});
test('a slower previous flight search cannot overwrite the latest results',async()=>{
 const p=page(),first=p.run('load()'),second=p.run('load()');
 p.requests[1]({ok:true,json:async()=>({listings:[],payment_available:true})});await second;
 const latest=p.node('#results').innerHTML;
 p.requests[0]({ok:false,json:async()=>({error:'Previous request failed'})});await first;
 assert.equal(p.node('#results').innerHTML,latest);assert.match(latest,/No approved flights/);
});
test('flight times expose UTC and device time, and query guards prevent mixed-currency sorting',()=>{
 const p=page();assert.match(p.run("flightTime('2027-01-01T23:30:00Z')"),/2027-01-01 23:30:00 UTC/);
 p.node('#search').elements.sort.value='price';assert.throws(()=>p.run('searchQuery()'),/one listing currency/);
 p.node('#search').elements.currency.value='INR';assert.match(p.run('searchQuery().toString()'),/currency=INR/);
});
