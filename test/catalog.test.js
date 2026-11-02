import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { merchImages, maxMerchCount } from '../src/catalog.js';
import { onRequest } from '../functions/api/votes.js';
test('48 images remain in voting ID order with the replacement at 41', () => {
 assert.equal(merchImages.length,48);
 assert.equal(maxMerchCount,48);
 for(let i=0;i<48;i++){
  assert.equal(merchImages[i],i===40 ? '/merch/41.jpeg' : `/merch/${i+1}.webp`);
  const bytes=fs.readFileSync(new URL(`../public${merchImages[i]}`,import.meta.url));
  if(i===40) assert.equal(bytes.toString('hex',0,2),'ffd8');
  else {assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');}
 }
});
test('voting API accepts the final merch and rejects out-of-range IDs', async () => {
 let bound;
 const env={PHONE_HASH_SECRET:'test-fixture-only-not-a-real-secret',DB:{prepare(){return {bind(...args){bound=args;return this;},async run(){return {meta:{changes:1}};}};}}};
 const request=id=>new Request('https://example.test/api/votes',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json'},body:JSON.stringify({phone:'+84 912 345 678',id})});
 const valid=await onRequest({request:request(48),env});assert.equal(valid.status,200);assert.equal(bound[1],48);assert.match(bound[0],/^[0-9a-f]{64}$/);
 for(const id of [0,49,1.5]){const invalid=await onRequest({request:request(id),env});assert.equal(invalid.status,400);}
});
