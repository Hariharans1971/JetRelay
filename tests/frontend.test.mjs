import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
function app(stored='{}',weather={reports:[]}){
 const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',style:{},dataset:{},classList:{toggle(){}},isConnected:true});return nodes.get(id)};
 const context=vm.createContext({document:{querySelector:node,querySelectorAll:()=>[],hidden:false},window:{addEventListener(){},scrollTo(){}},location:{hash:'#saved'},localStorage:{getItem:()=>stored,setItem(){}},AbortSignal,URLSearchParams,setTimeout(){},clearTimeout(){},setInterval(){},fetch:async path=>({ok:true,json:async()=>path.includes('weather')?weather:path.includes('health')?{reference:{airports:86311}}:{authenticated:false}})});
 vm.runInContext(source,context);return {context,node};
}
test('malformed saved preference shapes cannot crash the aircraft view',()=>{for(const value of ['{}','null','"invalid"','[101,101,999,"101"]','broken json']){const a=app(value);assert.match(a.node('#app').innerHTML,/collection/i)}});
test('all provider weather text is escaped before rendering',async()=>{const value='<img src=x onerror=alert(1)>';const a=app('[]',{reports:[{icao:'VOMM',raw_metar:value,temperature_c:value,wind_direction_deg:value,wind_speed_kt:value,altimeter_hpa:value,visibility_statute_miles:value}]});await a.context.showWeather('VOMM','#weather-result');const html=a.node('#weather-result').innerHTML;assert.ok(!html.includes('<img'));assert.ok(html.includes('&lt;img'))});
