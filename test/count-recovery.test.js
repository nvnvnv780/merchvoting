import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {attachBatch} from './support/d1-batch.js';
import {readVoteCounts} from '../functions/_shared/vote-counts.js';
import {onRequest} from '../functions/api/votes.js';
import {parseCounts} from '../src/counts.js';
import {lastKnownCounts} from '../src/last-known-counts.js';
function fixture(){
 const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE votes(phone_hash TEXT,merch_id INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(phone_hash,merch_id));INSERT INTO votes(phone_hash,merch_id) VALUES('a',15),('b',15),('c',31)");
 const adapter={prepare(sql){let args=[];return {bind(...v){args=v;return this;},async all(){return {results:db.prepare(sql).all(...args).map(r=>({...r}))};},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};}};
 attachBatch(db,adapter);return {db,env:{PHONE_HASH_SECRET:'fixture-only',DB:adapter}};
}
test('atomic one-time backfill preserves all votes; triggers track insert, duplicate and deletion',async()=>{
 const f=fixture();try{
 const snapshot=JSON.stringify(f.db.prepare('SELECT * FROM votes').all());
 assert.deepEqual(await readVoteCounts(f.env.DB),[{id:15,count:2},{id:31,count:1}]);
 assert.equal(JSON.stringify(f.db.prepare('SELECT * FROM votes').all()),snapshot);
 f.db.prepare('INSERT INTO additional_votes(phone_hash,merch_id) VALUES(?,?) ON CONFLICT DO NOTHING').run('new',49);
 f.db.prepare('INSERT INTO additional_votes(phone_hash,merch_id) VALUES(?,?) ON CONFLICT DO NOTHING').run('new',49);
 assert.equal((await readVoteCounts(f.env.DB)).find(r=>r.id===49).count,1);
 f.db.exec("DELETE FROM votes WHERE phone_hash='a'");
 assert.equal((await readVoteCounts(f.env.DB)).find(r=>r.id===15).count,1);
 f.db.exec('DELETE FROM vote_totals_metadata');
 assert.equal((await readVoteCounts(f.env.DB)).find(r=>r.id===15).count,1);
 assert.equal((await readVoteCounts(f.env.DB)).find(r=>r.id===49).count,1);
 }finally{f.db.close();}
});
test('quota failures return labeled verified counts, without writing or resetting votes; healthy reads recover',async()=>{
 const original=globalThis.caches,map=new Map();let failedReads=0;
 globalThis.caches={default:{async match(key){return map.get(key)?.clone();},async put(key,value){map.set(key,value.clone());},async delete(key){return map.delete(key);}}};
 const request=new Request('https://example.test/api/votes');
 const blocked={PHONE_HASH_SECRET:'fixture-only',DB:{prepare(){failedReads++;throw new Error("D1_ERROR: Your account has exceeded D1's free tier daily row read limit.");}}};
 const f=fixture();try{
 const response=await onRequest({request,env:blocked});assert.equal(response.status,200);
 const data=await response.json();assert.equal(data.stale,true);assert.equal(data.voting_available,false);assert.equal(data.reason,'D1_READ_LIMIT');assert.deepEqual(data.counts,lastKnownCounts.counts);
 await onRequest({request,env:blocked});assert.equal(failedReads,1);
 map.delete('https://example.test/api/votes-counts-cache-v1-fresh');
 const recovered=await(await onRequest({request,env:f.env})).json();assert.equal(recovered.stale,false);assert.deepEqual(recovered.counts,[{id:15,count:2},{id:31,count:1}]);
 const vote=await onRequest({request:new Request(request.url,{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json'},body:JSON.stringify({email:'fixture@example.invalid',id:49})}),env:f.env});assert.equal(vote.status,200);
 assert.equal(map.has('https://example.test/api/votes-counts-cache-v1-fresh'),false);
 const updated=await(await onRequest({request,env:f.env})).json();assert.equal(updated.counts.find(r=>r.id===49).count,1);
 }finally{globalThis.caches=original;f.db.close();}
});
test('malformed count responses cannot turn into zero counts',()=>{
 for(const data of [null,{}, {counts:null},{counts:[{id:1,count:-1}]},{counts:[{id:1,count:2},{id:1,count:3}]}])assert.throws(()=>parseCounts(data,49));
 assert.deepEqual(parseCounts({counts:[]},2),[0,0]);
 assert.deepEqual(parseCounts({counts:[{id:1,count:5},{id:50,count:8}]},2),[5,0]);
});
test('POST during a D1 outage returns JSON instead of a Worker exception',async()=>{
 const env={PHONE_HASH_SECRET:'fixture-only',DB:{prepare(){throw new Error("D1_ERROR: Your account has exceeded D1's free tier daily row read limit.");}}};
 const response=await onRequest({request:new Request('https://example.test/api/votes',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json'},body:JSON.stringify({email:'fixture@example.invalid',id:49})}),env});
 assert.equal(response.status,503);assert.equal((await response.json()).reason,'D1_READ_LIMIT');
});
