import { createServer } from 'node:http';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { staticAsset } from './runtime.mjs';
import { GET, POST, DELETE } from './route.mjs';
import {handlePlatform,origin} from '../render/platform/api.mjs';
import {initializeDatabase,shutdown} from '../render/platform/database.mjs';
await initializeDatabase();
const security={'Strict-Transport-Security':'max-age=31536000','Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Resource-Policy':'same-origin','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; script-src 'self' blob:; worker-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"};
export const server=createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,origin());
 const headers=new Headers();
 for(const [key,value] of Object.entries(req.headers))if(!key.startsWith('oai-')&&!key.startsWith('cf-')&&!['host','forwarded','x-forwarded-host','x-forwarded-proto','x-forwarded-for'].includes(key)&&value)headers.set(key,Array.isArray(value)?value.join(','):value);
 headers.set('cf-connecting-ip',req.socket.remoteAddress||'unknown');
 const request=new Request(url,{method:req.method,headers});let response;
 if(url.pathname.startsWith('/api/v1/'))response=await handlePlatform(req,url.pathname);
 else if(url.pathname==='/api/session')response=Response.json({authenticated:false,roles:[],role:null,operator_authorised:false,admin_authorised:false,organisation_id:null,sign_in_available:false,capabilities:{operator_onboarding:false,inventory_writes:false,bookings:false}},{headers:{'Cache-Control':'no-store'}});
 else if(url.pathname.startsWith('/api/'))response=await ({GET,HEAD:GET,POST,DELETE}[req.method]?.(request)??new Response('Method not allowed',{status:405}));
 else if(url.pathname.startsWith('/signin-with-chatgpt')||url.pathname.startsWith('/signout-with-chatgpt'))response=new Response('Account access is not available on this deployment yet. Public airports and radar are available.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
 else if(['GET','HEAD'].includes(req.method)){
 if(['/','/workspace'].includes(url.pathname))url.pathname='/workspace.html';
 response=await staticAsset(new Request(url,{method:req.method}));
 }else response=new Response('Method not allowed',{status:405});
 res.writeHead(response.status,{...security,...Object.fromEntries(response.headers)});
 if(req.method==='HEAD'||!response.body)res.end();else await pipeline(Readable.fromWeb(response.body),res);
 }catch{if(!res.headersSent)res.writeHead(500,security);res.end('Service unavailable')}
});
if(process.env.NODE_ENV!=='test')server.listen(Number(process.env.PORT||10000),'0.0.0.0',()=>console.log('AeroShare HTTP server ready'));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.close(async()=>{await shutdown();process.exit(0)});setTimeout(()=>process.exit(1),10000).unref()});
