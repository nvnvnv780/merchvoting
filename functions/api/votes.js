import { normalizeIdentity, identityHashInput } from '../../src/identity.js';
import { visibleMerchIds } from '../../src/catalog.js';
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
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
export async function onRequest({ request, env }) {
  if (!env.DB || !env.PHONE_HASH_SECRET) return json({ error: 'Chưa kết nối hệ thống bình chọn.', demo: env.DEMO_MODE === 'true' }, 503);
  if (request.method === 'GET') {
    const { results } = await withAdditionalVotes(env, () => env.DB.prepare('SELECT merch_id AS id, COUNT(*) AS count FROM (SELECT merch_id FROM votes UNION ALL SELECT merch_id FROM additional_votes) GROUP BY merch_id').all());
    return json({ counts: results.filter(row => visibleMerchIds.includes(row.id)) });
  }
  if (request.method !== 'POST') return json({ error: 'Phương thức không hỗ trợ.' }, 405);
  if (request.headers.get('Origin') !== new URL(request.url).origin) return json({ error: 'Yêu cầu không hợp lệ.' }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Dữ liệu không hợp lệ.' }, 400); }
  const identity = normalizeIdentity(body);
  if (!identity || !Number.isInteger(body.id) || !visibleMerchIds.includes(body.id)) return json({ error: 'Điện thoại/Email chưa hợp lệ.' }, 400);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.PHONE_HASH_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const hash = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(identityHashInput(identity)))), b => b.toString(16).padStart(2, '0')).join('');
  if (body.action === 'status') {
    const { results } = await withAdditionalVotes(env, () => env.DB.prepare('SELECT merch_id FROM votes WHERE phone_hash = ? UNION ALL SELECT merch_id FROM additional_votes WHERE phone_hash = ?').bind(hash, hash).all());
    return json({ voted: results.map(row => row.merch_id).filter(id => visibleMerchIds.includes(id)) });
  }
  const insert = () => env.DB.prepare(`INSERT INTO ${body.id >= 49 ? 'additional_votes' : 'votes'} (phone_hash, merch_id) VALUES (?, ?) ON CONFLICT DO NOTHING`).bind(hash, body.id).run();
  const result = body.id >= 49 ? await withAdditionalVotes(env, insert) : await insert();
  return json({ duplicate: result.meta.changes === 0 });
}
