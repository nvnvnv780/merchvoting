import { identityHashInput } from '../../src/identity.js';
export const DEVICE_COOKIE = '__Host-tuctac-device';
export const DEVICE_LIMIT = 3;
const schema = `CREATE TABLE IF NOT EXISTS device_account_limits (
  device_id TEXT PRIMARY KEY,
  account_hash TEXT NOT NULL,
  change_count INTEGER NOT NULL DEFAULT 0 CHECK(change_count BETWEEN 0 AND 3)
)`;
export async function hashIdentity(identity, env) {
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.PHONE_HASH_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(identityHashInput(identity)))),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function registerDeviceAccount(request, env, hash, allowChange = false) {
 const candidate=(request.headers.get('Cookie')||'').split(';').map(part=>part.trim()).find(part=>part.startsWith(DEVICE_COOKIE+'='))?.slice(DEVICE_COOKIE.length+1);
 const deviceId=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate||'')?candidate:crypto.randomUUID();
 // One atomic statement handles concurrent requests and saves of the same account.
 const query=()=>env.DB.prepare(`INSERT INTO device_account_limits (device_id,account_hash,change_count) VALUES (?,?,0)
 ON CONFLICT(device_id) DO UPDATE SET
 change_count=device_account_limits.change_count+CASE WHEN device_account_limits.account_hash<>excluded.account_hash THEN 1 ELSE 0 END,
 account_hash=excluded.account_hash
 WHERE device_account_limits.account_hash=excluded.account_hash ${allowChange ? 'OR device_account_limits.change_count<3' : ''}
 RETURNING change_count`).bind(deviceId,hash).all();
 let result;
 try {result=await query();}
 catch(error){
  if(!String(error?.message||error).includes('no such table: device_account_limits'))throw error;
  await env.DB.prepare(schema).run();result=await query();
 }
 const row=result.results[0];
 const current=row || (await env.DB.prepare('SELECT change_count FROM device_account_limits WHERE device_id=?').bind(deviceId).all()).results[0];
 return {allowed:!!row,changes:current?.change_count??DEVICE_LIMIT,cookie:`${DEVICE_COOKIE}=${deviceId}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`};
}
export function deviceHeaders(device) {return {'Set-Cookie':device.cookie};}
export const limitMessage='Thiết bị này đã đổi tài khoản 3 lần.';

export const accountChangedMessage='Tài khoản đã thay đổi. Vui lòng chọn lại.';
