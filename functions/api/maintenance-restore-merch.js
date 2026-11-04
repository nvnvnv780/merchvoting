// Temporary, authenticated, expiring maintenance operation requested by the site owner.
const EXPIRES_AT=1793771821683;
const OPERATION='restore-merch-15-2026-11-04T04:58:00Z';
const MERCH_ID=15;
const CUTOFF='2026-11-04 04:58:00'; // 11:58:00 Asia/Ho_Chi_Minh.
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
async function inspect(db){
 const {results}=await db.prepare(`SELECT COUNT(*) AS total,
 COALESCE(SUM(julianday(created_at)<=julianday(?)),0) AS retained,
 COALESCE(SUM(julianday(created_at)>julianday(?)),0) AS to_archive,
 COALESCE(SUM(julianday(created_at) IS NULL),0) AS invalid_timestamps,
 MIN(created_at) AS first_vote,MAX(created_at) AS latest_vote
 FROM votes WHERE merch_id=?`).bind(CUTOFF,CUTOFF,MERCH_ID).all();
 return {merch_id:MERCH_ID,cutoff_utc:CUTOFF,...results[0]};
}
async function operation(db){
 try{return (await db.prepare('SELECT * FROM vote_restore_operations WHERE operation_id=?').bind(OPERATION).all()).results[0]||null;}
 catch(error){if(String(error?.message||error).includes('no such table: vote_restore_operations'))return null;throw error;}
}
export async function onRequest({request,env}){
 if(request.method!=='POST')return json({error:'method_not_allowed'},405);
 if(Date.now()>EXPIRES_AT)return json({error:'expired'},410);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'forbidden'},403);
 if(!env.DB||!env.PHONE_HASH_SECRET)return json({error:'database_unavailable'},503);
 let body,raw;try{raw=await request.text();if(raw.length>1024)return json({error:'bad_request'},400);body=JSON.parse(raw);}catch{return json({error:'bad_request'},400);}
 const authorization=request.headers.get('Authorization')||'';
 if(!/^Bearer [0-9a-f]{64}$/.test(authorization))return json({error:'forbidden'},403);
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.PHONE_HASH_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(OPERATION+'\n'+raw))),b=>b.toString(16).padStart(2,'0')).join('');
 if(signature!==authorization.slice(7))return json({error:'forbidden'},403);
 if(body?.action==='inspect')return json({ok:true,plan:await inspect(env.DB),operation:await operation(env.DB)});
 if(body?.action!=='apply')return json({error:'bad_request'},400);
 const previous=await operation(env.DB);if(previous)return json({ok:true,already_applied:true,operation:previous,current:await inspect(env.DB)});
 const plan=await inspect(env.DB);
 if(plan.invalid_timestamps!==0||body.expected_retained!==plan.retained)return json({error:'plan_changed',plan},409);
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS vote_restore_archive (
 operation_id TEXT NOT NULL,phone_hash TEXT NOT NULL,merch_id INTEGER NOT NULL,created_at TEXT NOT NULL,
 archived_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(operation_id,phone_hash,merch_id))`).run();
 await env.DB.prepare(`CREATE TABLE IF NOT EXISTS vote_restore_operations (
 operation_id TEXT PRIMARY KEY,merch_id INTEGER NOT NULL,cutoff_utc TEXT NOT NULL,
 archived_count INTEGER NOT NULL,retained_count INTEGER NOT NULL,applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
 // D1 batch is transactional. Only rows copied into the archive by this operation are deleted.
 await env.DB.batch([
 env.DB.prepare(`INSERT INTO vote_restore_archive (operation_id,phone_hash,merch_id,created_at)
 SELECT ?,phone_hash,merch_id,created_at FROM votes
 WHERE merch_id=? AND julianday(created_at)>julianday(?)
 AND NOT EXISTS(SELECT 1 FROM vote_restore_operations WHERE operation_id=?)
 ON CONFLICT DO NOTHING`).bind(OPERATION,MERCH_ID,CUTOFF,OPERATION),
 env.DB.prepare(`DELETE FROM votes WHERE merch_id=? AND julianday(created_at)>julianday(?)
 AND EXISTS(SELECT 1 FROM vote_restore_archive a WHERE a.operation_id=? AND a.phone_hash=votes.phone_hash AND a.merch_id=votes.merch_id AND a.created_at=votes.created_at)
 AND NOT EXISTS(SELECT 1 FROM vote_restore_operations WHERE operation_id=?)`).bind(MERCH_ID,CUTOFF,OPERATION,OPERATION),
 env.DB.prepare(`INSERT INTO vote_restore_operations (operation_id,merch_id,cutoff_utc,archived_count,retained_count)
 SELECT ?,?,?,(SELECT COUNT(*) FROM vote_restore_archive WHERE operation_id=?),(SELECT COUNT(*) FROM votes WHERE merch_id=?)
 WHERE NOT EXISTS(SELECT 1 FROM vote_restore_operations WHERE operation_id=?)`).bind(OPERATION,MERCH_ID,CUTOFF,OPERATION,MERCH_ID,OPERATION)
 ]);
 return json({ok:true,operation:await operation(env.DB),current:await inspect(env.DB)});
}
