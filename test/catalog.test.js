import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { merchImages, maxMerchCount, visibleMerchIds } from '../src/catalog.js';
import { onRequest } from './support/legacy-votes.js';
test('49 image slots remain in voting ID order with the replacement at 41', () => {
 assert.equal(merchImages.length,49);
 assert.equal(maxMerchCount,49);
 for(let i=0;i<49;i++){
  assert.equal(merchImages[i],i===40 ? '/merch/41-cats.png' : i===48 ? '/merch/49-cup-keychain.png' : `/merch/${i+1}.webp`);
  const bytes=fs.readFileSync(new URL(`../public${merchImages[i]}`,import.meta.url));
  if(i===40 || i===48) assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');
  else {assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');}
 }
});
test('voting API accepts the final merch and rejects out-of-range IDs', async () => {
 let bound;
 const env={PHONE_HASH_SECRET:'test-fixture-only-not-a-real-secret',DB:{prepare(){return {bind(...args){bound=args;return this;},async run(){return {meta:{changes:1}};}};}}};
 const request=id=>new Request('https://example.test/api/votes',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json'},body:JSON.stringify({phone:'+84 912 345 678',id})});
 const valid=await onRequest({request:request(48),env});assert.equal(valid.status,200);assert.equal(bound[1],48);assert.match(bound[0],/^[0-9a-f]{64}$/);
 for(const id of [0,46,50,1.5]){const invalid=await onRequest({request:request(id),env});assert.equal(invalid.status,400);}
});

test('removes duplicate 46 while keeping original vote identities for 47 and 48', () => {
 assert.equal(visibleMerchIds.length,48);
 assert.deepEqual(visibleMerchIds,Array.from({length:49},(_,i)=>i+1).filter(id=>id!==46));
 assert.equal(visibleMerchIds[45],47);assert.equal(visibleMerchIds[46],48);
 assert.equal(merchImages[visibleMerchIds[45]-1],'/merch/47.webp');
 assert.equal(merchImages[visibleMerchIds[46]-1],'/merch/48.webp');
});
test('counts and saved votes exclude retired 46 without changing 47 and 48', async () => {
 const env={PHONE_HASH_SECRET:'test-fixture-only-not-a-real-secret',DB:{prepare(sql){return {bind(){return this;},async all(){return {results:sql.includes('GROUP BY') ? [{id:46,count:99},{id:47,count:7},{id:48,count:8}] : [{merch_id:46},{merch_id:47},{merch_id:48}]};}};}}};
 const counts=await onRequest({request:new Request('https://example.test/api/votes'),env});
 assert.deepEqual((await counts.json()).counts,[{id:47,count:7},{id:48,count:8}]);
 const status=await onRequest({request:new Request('https://example.test/api/votes',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json'},body:JSON.stringify({phone:'0912345678',id:1,action:'status'})}),env});
 assert.deepEqual((await status.json()).voted,[47,48]);
});
