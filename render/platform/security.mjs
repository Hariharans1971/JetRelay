import {randomBytes,scrypt as scryptCb,timingSafeEqual,createHash,createHmac,createCipheriv,createDecipheriv} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCb);export const token=()=>randomBytes(32).toString('hex');export const hash=v=>createHash('sha256').update(v).digest('hex');
export function fail(message,status=400){throw Object.assign(new Error(message),{status})}
export function text(v,min=1,max=200){if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)fail('Invalid or missing text field');return v.trim()}
export function uuid(v){if(typeof v!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v))fail('Invalid record ID');return v}
export async function passwordHash(password){text(password,12,128);const salt=token();const result=await scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});return `scrypt:${salt}:${result.toString('hex')}`}
export async function passwordMatches(password,encoded){if(typeof password!=='string'||password.length>128)return false;const [,salt,key]=encoded.split(':');const actual=await scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});return timingSafeEqual(actual,Buffer.from(key,'hex'))}
export function safeEqual(a,b){const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y)}
function base32(s){let bits='';for(const c of s.toUpperCase().replace(/=+$/,'')){const n='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c);if(n<0)fail('Invalid authenticator secret');bits+=n.toString(2).padStart(5,'0')}return Buffer.from((bits.match(/.{8}/g)||[]).map(x=>parseInt(x,2)))}
export function totp(secret,at=Date.now()){const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(at/30000)));const h=createHmac('sha1',base32(secret)).update(counter).digest();const o=h[19]&15;return String((h.readUInt32BE(o)&0x7fffffff)%1000000).padStart(6,'0')}
export function verifyTotp(secret,code,at=Date.now()){return typeof code==='string'&&/^\d{6}$/.test(code)&&[-30000,0,30000].some(offset=>safeEqual(totp(secret,at+offset),code))}
export function encrypt(bytes,key){if(!/^[a-f0-9]{64}$/i.test(key||''))fail('Encryption is not configured',503);const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv);return {ciphertext:Buffer.concat([c.update(bytes),c.final()]),iv,tag:c.getAuthTag()}}
export function decrypt(record,key){const d=createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),record.iv);d.setAuthTag(record.tag);return Buffer.concat([d.update(record.ciphertext),d.final()])}
