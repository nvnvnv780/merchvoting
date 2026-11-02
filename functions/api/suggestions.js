import { normalizePhone } from '../../src/phone.js';
const json = (body, status = 200) => Response.json(body, {status, headers:{'Cache-Control':'no-store'}});
export async function onRequest({request, env}) {
 if (request.method !== 'POST') return json({error:'Phương thức không hỗ trợ.'},405);
 if (request.headers.get('Origin') !== new URL(request.url).origin) return json({error:'Yêu cầu không hợp lệ.'},403);
 if (!env.SUGGESTIONS_WEBHOOK_URL || !env.SUGGESTIONS_WEBHOOK_SECRET) return json({error:'Chưa kết nối nơi nhận ý kiến. Bạn quay lại sau nhé.'},503);
 if (Number(request.headers.get('Content-Length')) > 8192) return json({error:'Nội dung quá dài.'},413);
 let body;
 try { const raw = await request.text(); if(raw.length > 8192) return json({error:'Nội dung quá dài.'},413); body=JSON.parse(raw); } catch { return json({error:'Dữ liệu không hợp lệ.'},400); }
 const phone = normalizePhone(body?.phone);
 const wish = typeof body?.wish === 'string' ? body.wish.trim() : '';
 if (!phone || !wish || wish.length > 1000 || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body?.requestId || '')) return json({error:'Vui lòng nhập ý kiến tối đa 1.000 ký tự.'},400);
 try {
  const url = new URL(env.SUGGESTIONS_WEBHOOK_URL);
  if(url.protocol !== 'https:' || url.hostname !== 'script.google.com' || !/^\/macros\/s\/[^/]+\/exec$/.test(url.pathname)) throw new Error('Invalid webhook');
  const response = await fetch(url, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({wish,phone,requestId:body.requestId,secret:env.SUGGESTIONS_WEBHOOK_SECRET}),signal:AbortSignal.timeout(15000)});
  const result = await response.json();
  if (!response.ok || result.ok !== true) throw new Error('Not saved');
  return json({ok:true});
 } catch { return json({error:'Chưa xác nhận được phản hồi. Bạn bấm gửi lại nhé.'},502); }
}
