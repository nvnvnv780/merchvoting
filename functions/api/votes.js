import { normalizePhone } from '../../src/phone.js';
import { visibleMerchIds } from '../../src/catalog.js';
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function onRequest({ request, env }) {
  if (!env.DB || !env.PHONE_HASH_SECRET) return json({ error: 'Chưa kết nối hệ thống bình chọn.', demo: env.DEMO_MODE === 'true' }, 503);
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT merch_id AS id, COUNT(*) AS count FROM votes GROUP BY merch_id').all();
    return json({ counts: results.filter(row => visibleMerchIds.includes(row.id)) });
  }
  if (request.method !== 'POST') return json({ error: 'Phương thức không hỗ trợ.' }, 405);
  if (request.headers.get('Origin') !== new URL(request.url).origin) return json({ error: 'Yêu cầu không hợp lệ.' }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Dữ liệu không hợp lệ.' }, 400); }
  const phone = normalizePhone(body.phone);
  if (!phone || !Number.isInteger(body.id) || !visibleMerchIds.includes(body.id)) return json({ error: 'Vui lòng kiểm tra số điện thoại.' }, 400);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.PHONE_HASH_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const hash = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(phone))), b => b.toString(16).padStart(2, '0')).join('');
  if (body.action === 'status') {
    const { results } = await env.DB.prepare('SELECT merch_id FROM votes WHERE phone_hash = ?').bind(hash).all();
    return json({ voted: results.map(row => row.merch_id).filter(id => visibleMerchIds.includes(id)) });
  }
  const result = await env.DB.prepare('INSERT INTO votes (phone_hash, merch_id) VALUES (?, ?) ON CONFLICT DO NOTHING').bind(hash, body.id).run();
  return json({ duplicate: result.meta.changes === 0 });
}
