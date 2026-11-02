import {test} from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/suggestions.js';
const url='https://example.com/api/suggestions';
const configured={SUGGESTIONS_WEBHOOK_URL:'https://script.google.com/macros/s/test/exec',SUGGESTIONS_WEBHOOK_SECRET:'test-secret'};
const body={phone:'+84 912 345 678',wish:'Túi tote',requestId:'12345678-1234-4234-8234-123456789abc'};
const request=(value=body,origin='https://example.com')=>new Request(url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(value)});
test('requires same origin, configuration and nonempty bounded input',async()=>{
 assert.equal((await onRequest({request:request(body,'https://other.com'),env:configured})).status,403);
 assert.equal((await onRequest({request:request(),env:{}})).status,503);
 for(const wish of ['', ' '.repeat(4), 'a'.repeat(1001)]) assert.equal((await onRequest({request:request({...body,wish}),env:configured})).status,400);
 assert.equal((await onRequest({request:request({...body,phone:'123'}),env:configured})).status,400);
 assert.equal((await onRequest({request:request(null),env:configured})).status,400);
});
test('only confirms success after upstream confirms; forwards request ID',async()=>{
 const original=globalThis.fetch;
 try {
  globalThis.fetch=async(_,options)=>{const sent=JSON.parse(options.body);assert.equal(sent.requestId,body.requestId);assert.equal(sent.wish,body.wish);assert.equal(sent.phone,'0912345678');return Response.json({ok:true});};
  assert.deepEqual(await (await onRequest({request:request(),env:configured})).json(),{ok:true});
  globalThis.fetch=async()=>Response.json({ok:false});
  assert.equal((await onRequest({request:request(),env:configured})).status,502);
  globalThis.fetch=async()=>{throw new Error('timeout');};
  assert.equal((await onRequest({request:request(),env:configured})).status,502);
 }finally{globalThis.fetch=original;}
});

test('rejects malformed email before contacting Sheets',async()=>{
 assert.equal((await onRequest({request:request({email:'invalid',wish:'Túi tote',requestId:body.requestId}),env:configured})).status,400);
});
