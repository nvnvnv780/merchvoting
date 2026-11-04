import { normalizeIdentity } from '../../src/identity.js';
import { hashIdentity, registerDeviceAccount, deviceHeaders, limitMessage } from '../_shared/device-account.js';
const json=(body,status=200,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...headers}});
export async function onRequest({request,env}) {
 if(request.method!=='POST')return json({error:'Phương thức không hỗ trợ.'},405);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Yêu cầu không hợp lệ.'},403);
 if(!env.DB||!env.PHONE_HASH_SECRET)return json({error:'Chưa kết nối hệ thống bình chọn.'},503);
 let body;try{const raw=await request.text();if(raw.length>2048)return json({error:'Thông tin chưa hợp lệ.'},400);body=JSON.parse(raw);}catch{return json({error:'Thông tin chưa hợp lệ.'},400);}
 const identity=normalizeIdentity(body);if(!identity)return json({error:'Thông tin chưa hợp lệ.'},400);
 const device=await registerDeviceAccount(request,env,await hashIdentity(identity,env),true);
 if(!device.allowed)return json({error:limitMessage},429,deviceHeaders(device));
 return json({ok:true,changes:device.changes,remaining:3-device.changes},200,deviceHeaders(device));
}
