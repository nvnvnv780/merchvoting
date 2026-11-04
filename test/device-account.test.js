import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {onRequest as account} from '../functions/api/account.js';
import {onRequest as votes} from '../functions/api/votes.js';
function fixture(){
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE votes (phone_hash TEXT,merch_id INTEGER,PRIMARY KEY(phone_hash,merch_id))');
 const env={PHONE_HASH_SECRET:'fixture-only-never-a-real-secret',DB:{prepare(sql){let args=[];return {bind(...v){args=v;return this;},async all(){return {results:db.prepare(sql).all(...args).map(r=>({...r}))};},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};}}};
 let cookie='';
 const send=async(handler,body)=>{
  const request=new Request('https://example.test/api/'+(handler===account?'account':'votes'),{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});
  const response=await handler({request,env});if(response.headers.has('Set-Cookie'))cookie=response.headers.get('Set-Cookie').split(';')[0];return response;
 };
 return {db,env,send,setCookie:v=>cookie=v,getCookie:()=>cookie};
}
test('first account is free; exactly three changes, case/phone normalization, reload and logout behavior',async()=>{
 const f=fixture();try{
 assert.equal((await f.send(account,{email:'bad'})).status,400);
 assert.deepEqual(await (await f.send(account,{email:'First@Example.invalid'})).json(),{ok:true,changes:0,remaining:3});
 const cookie=f.getCookie();assert.match(cookie,/__Host-tuctac-device=/);
 assert.equal((await (await f.send(account,{email:'first@example.invalid'})).json()).changes,0);
 assert.equal((await (await f.send(account,{phone:'+84 912 345 678'})).json()).changes,1);
 assert.equal((await (await f.send(account,{phone:'0912345678'})).json()).changes,1);
 assert.equal((await (await f.send(account,{email:'second@example.invalid'})).json()).changes,2);
 assert.equal((await (await f.send(account,{email:'third@example.invalid'})).json()).changes,3);
 assert.equal((await (await f.send(account,{email:'THIRD@example.invalid'})).json()).changes,3);
 assert.equal((await f.send(account,{email:'fourth@example.invalid'})).status,429);
 assert.equal((await f.send(account,{email:'first@example.invalid'})).status,429);
 assert.equal((await f.send(votes,{email:'fourth@example.invalid',id:49})).status,429);
 assert.equal((await f.send(votes,{email:'third@example.invalid',id:49})).status,200);
 assert.deepEqual(await (await f.send(votes,{email:'third@example.invalid',id:1,action:'status'})).json(),{voted:[49]});
 assert.equal(f.db.prepare('SELECT change_count FROM device_account_limits').get().change_count,3);
 f.setCookie('');assert.equal((await (await f.send(account,{email:'another-browser@example.invalid'})).json()).changes,0);
 f.setCookie(cookie);assert.equal((await f.send(account,{email:'fourth@example.invalid'})).status,429);
 }finally{f.db.close();}
});
test('concurrent changes cannot pass three and stale vote/status requests do not consume changes',async()=>{
 const f=fixture();try{
 await f.send(account,{email:'a@example.invalid'});await f.send(account,{email:'b@example.invalid'});
 assert.equal((await f.send(votes,{email:'a@example.invalid',id:1,action:'status'})).status,409);
 assert.equal(f.db.prepare('SELECT change_count FROM device_account_limits').get().change_count,1);
 await f.send(account,{email:'c@example.invalid'});
 const responses=await Promise.all([f.send(account,{email:'d@example.invalid'}),f.send(account,{email:'e@example.invalid'})]);
 assert.deepEqual(responses.map(r=>r.status).sort(),[200,429]);
 assert.equal(f.db.prepare('SELECT change_count FROM device_account_limits').get().change_count,3);
 }finally{f.db.close();}
});
test('account endpoint rejects cross-origin requests and preserves existing vote rows',async()=>{
 const f=fixture();try{
 f.db.exec("INSERT INTO votes VALUES ('existing-hash',48)");
 const response=await account({request:new Request('https://example.test/api/account',{method:'POST',headers:{Origin:'https://other.test'},body:JSON.stringify({email:'a@example.invalid'})}),env:f.env});
 assert.equal(response.status,403);
 const first=await f.send(account,{email:'a@example.invalid'});
 assert.match(first.headers.get('Set-Cookie'),/HttpOnly; Secure; SameSite=Lax/);
 assert.deepEqual({...f.db.prepare('SELECT * FROM votes').get()},{phone_hash:'existing-hash',merch_id:48});
 }finally{f.db.close();}
});
