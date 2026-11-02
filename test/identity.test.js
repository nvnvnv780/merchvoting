import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeEmail,normalizeIdentity,identityHashInput,parseContact} from '../src/identity.js';
import {onRequest} from '../functions/api/votes.js';
test('normalizes contacts and rejects invalid or ambiguous identities',()=>{
 assert.equal(normalizeEmail('  Fan+Merch@Example.COM '),'fan+merch@example.com');
 for(const email of ['bad','a@@example.com','a@b','a..b@example.com','.a@example.com','a.@example.com','a b@example.com','a@-example.com','x'.repeat(65)+'@example.com']) assert.equal(normalizeEmail(email),null);
 assert.equal(normalizeIdentity({email:'fan@example.com',phone:'0912345678'}),null);
 assert.equal(identityHashInput(normalizeIdentity({phone:'+84 912345678'})),'0912345678');
 assert.equal(identityHashInput(normalizeIdentity({email:'Fan@Example.com'})),'email:fan@example.com');
});
test('email duplicate and saved vote status work across case variants; phone HMAC stays unchanged',async()=>{
 const entries=new Map();let lastHash;
 const secret='test-secret-for-identity-only';
 const env={PHONE_HASH_SECRET:secret,DB:{prepare(){let hash,id;return {bind(...v){[hash,id]=v;lastHash=hash;return this;},async run(){const key=hash+':'+id;const changes=entries.has(key)?0:1;entries.set(key,{hash,id});return {meta:{changes}};},async all(){return {results:[...entries.values()].filter(e=>e.hash===hash).map(e=>({merch_id:e.id}))};}};}}};
 const req=(contact,action)=>new Request('https://example.test/api/votes',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json'},body:JSON.stringify({...contact,id:47,...(action?{action}:{})})});
 assert.deepEqual(await (await onRequest({request:req({email:'Fan@Example.com'}),env})).json(),{duplicate:false});
 assert.deepEqual(await (await onRequest({request:req({email:'fan@example.com'}),env})).json(),{duplicate:true});
 assert.deepEqual(await (await onRequest({request:req({email:'FAN@example.com'},'status'),env})).json(),{voted:[47]});
 await onRequest({request:req({phone:'+84 912 345 678'}),env});
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const oldHash=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('0912345678'))).toString('hex');
 assert.equal(lastHash,oldHash);
});
test('one contact field automatically accepts phone or email',()=>{
 assert.deepEqual(parseContact('Fan@Example.com'),{type:'email',value:'fan@example.com'});
 assert.deepEqual(parseContact('+84 912 345 678'),{type:'phone',value:'0912345678'});
 assert.equal(parseContact('not valid'),null);
});
