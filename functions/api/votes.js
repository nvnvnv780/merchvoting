import { unavailableMessage } from '../../src/availability.js';
import { readVoteCounts, isReadLimit } from '../_shared/vote-counts.js';
import { lastKnownCounts } from '../../src/last-known-counts.js';
import { hashIdentity, registerDeviceAccount, deviceHeaders, limitMessage, accountChangedMessage } from '../_shared/device-account.js';
import { normalizeIdentity } from '../../src/identity.js';
import { visibleMerchIds } from '../../src/catalog.js';
const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
// Bootstrap only if an older database has not applied migration 0003 yet.
// The existing votes table and all historical votes remain untouched.
async function withAdditionalVotes(env, query) {
  try { return await query(); }
  catch (error) {
    if (!String(error?.message || error).includes('no such table: additional_votes')) throw error;
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS additional_votes (
  phone_hash TEXT NOT NULL,
  merch_id INTEGER NOT NULL CHECK(merch_id >= 49),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(phone_hash, merch_id)
);`).run();
    return await query();
  }
}
async function handleRequest({ request, env }) {
  if (request.method === 'GET') {
    const cache=globalThis.caches?.default;
    const cacheBase=new URL('/api/votes-counts-cache-v1',request.url).href;
    const cached=async suffix=>{try{return await (await cache?.match(cacheBase+suffix))?.json();}catch{return null;}};
    const put=async(suffix,data,seconds)=>{try{await cache?.put(cacheBase+suffix,Response.json(data,{headers:{'Cache-Control':`public, max-age=${seconds}`}}));}catch{}};
    const fresh=await cached('-fresh');if(fresh?.counts)return json(fresh);
    try {
      if(!env.DB)throw new Error('Database unavailable');
      const counts=(await readVoteCounts(env.DB)).filter(row=>visibleMerchIds.includes(row.id));
      const data={counts,stale:false,voting_available:true,captured_at:new Date().toISOString()};
      await Promise.all([put('-fresh',data,10),put('-last-good',data,86400)]);
      return json(data);
    } catch(error) {
      const snapshot=await cached('-last-good')||lastKnownCounts;
      const data={...snapshot,stale:true,voting_available:false,reason:isReadLimit(error)?'D1_READ_LIMIT':'CONNECTION_UNAVAILABLE',error:unavailableMessage()};
      await put('-fresh',data,10);return json(data);
    }
  }
  if (!env.DB || !env.PHONE_HASH_SECRET) return json({ error: 'Chưa kết nối hệ thống bình chọn.', demo: env.DEMO_MODE === 'true' }, 503);
  if (request.method !== 'POST') return json({ error: 'Phương thức không hỗ trợ.' }, 405);
  if (request.headers.get('Origin') !== new URL(request.url).origin) return json({ error: 'Yêu cầu không hợp lệ.' }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Dữ liệu không hợp lệ.' }, 400); }
  const identity = normalizeIdentity(body);
  if (!identity || !Number.isInteger(body.id) || !visibleMerchIds.includes(body.id)) return json({ error: 'Điện thoại/Email chưa hợp lệ.' }, 400);
  const hash = await hashIdentity(identity, env);
  const device = await registerDeviceAccount(request, env, hash);
  if (!device.allowed) return json({error:device.changes>=3?limitMessage:accountChangedMessage},device.changes>=3?429:409,deviceHeaders(device));
  if (body.action === 'status') {
    const { results } = await withAdditionalVotes(env, () => env.DB.prepare('SELECT merch_id FROM votes WHERE phone_hash = ? UNION ALL SELECT merch_id FROM additional_votes WHERE phone_hash = ?').bind(hash, hash).all());
    return json({ voted: results.map(row => row.merch_id).filter(id => visibleMerchIds.includes(id)) },200,deviceHeaders(device));
  }
  const insert = () => env.DB.prepare(`INSERT INTO ${body.id >= 49 ? 'additional_votes' : 'votes'} (phone_hash, merch_id) VALUES (?, ?) ON CONFLICT DO NOTHING`).bind(hash, body.id).run();
  const result = body.id >= 49 ? await withAdditionalVotes(env, insert) : await insert();
  if(result.meta.changes){try{await globalThis.caches?.default?.delete(new URL('/api/votes-counts-cache-v1-fresh',request.url).href);}catch{}}
  return json({ duplicate: result.meta.changes === 0 },200,deviceHeaders(device));
}

export async function onRequest(context){
 try{return await handleRequest(context);}
 catch(error){return json({error:'Bình chọn tạm thời gián đoạn. Bạn thử lại sau nhé.',reason:isReadLimit(error)?'D1_READ_LIMIT':'CONNECTION_UNAVAILABLE'},503);}
}
