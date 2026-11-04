import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import {attachBatch} from './support/d1-batch.js';
import {onRequest} from '../functions/api/votes.js';

test('new merch stores and deduplicates votes with real SQLite without altering historic rows',async()=>{
 const db=new DatabaseSync(':memory:');
 try {
 for(const file of ['0001_votes.sql','0002_expand_to_48.sql']) {
  const path=new URL('../migrations/'+file,import.meta.url);
  db.exec(fs.readFileSync(path,'utf8'));
 }
 if(!db.prepare("SELECT name FROM sqlite_master WHERE name='votes'").get())throw new Error('Legacy migrations did not create votes');
 const secret='local-fixture-only-never-production';
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const hash=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('0912345678'))).toString('hex');
 db.prepare('INSERT INTO votes (phone_hash,merch_id) VALUES (?,?)').run(hash,48);
 db.prepare('INSERT INTO votes (phone_hash,merch_id) VALUES (?,?)').run('retired-fixture',46);
 const before=JSON.stringify(db.prepare('SELECT * FROM votes ORDER BY phone_hash,merch_id').all());
 const env={PHONE_HASH_SECRET:secret,DB:{prepare(sql){let args=[];return {bind(...values){args=values;return this;},async all(){return {results:db.prepare(sql).all(...args).map(row=>({...row}))};},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};}}};
 attachBatch(db,env.DB);
 const post=(contact,id=49,action)=>new Request('https://example.test/api/votes',{method:'POST',headers:{Origin:'https://example.test','Content-Type':'application/json'},body:JSON.stringify({...contact,id,...(action?{action}:{})})});
 assert.deepEqual(await (await onRequest({request:post({phone:'+84 912 345 678'}),env})).json(),{duplicate:false});
 assert.deepEqual(await (await onRequest({request:post({phone:'0912345678'}),env})).json(),{duplicate:true});
 assert.deepEqual(await (await onRequest({request:post({email:'Merch@Example.invalid'}),env})).json(),{duplicate:false});
 assert.deepEqual(await (await onRequest({request:post({email:'merch@example.invalid'}),env})).json(),{duplicate:true});
 const status=await (await onRequest({request:post({phone:'0912345678'},1,'status'),env})).json();
 assert.deepEqual(status.voted,[48,49]);
 const counts=await (await onRequest({request:new Request('https://example.test/api/votes'),env})).json();
 assert.equal(counts.counts.find(row=>row.id===49).count,2);
 assert.equal(counts.counts.find(row=>row.id===48).count,1);
 assert.equal(counts.counts.some(row=>row.id===46),false);
 assert.equal(JSON.stringify(db.prepare('SELECT * FROM votes ORDER BY phone_hash,merch_id').all()),before);
 assert.equal((await onRequest({request:post({phone:'0912345678'},47),env})).status,200);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM votes WHERE merch_id=47').get().n,1);
 assert.throws(()=>db.prepare('INSERT INTO votes (phone_hash,merch_id) VALUES (?,49)').run('fixture'),/CHECK/);
 } finally {db.close();}
});

test('first GET initializes the extra table and leaves legacy data intact',async()=>{
 const db=new DatabaseSync(':memory:');
 try{
 db.exec('CREATE TABLE votes (phone_hash TEXT,merch_id INTEGER); INSERT INTO votes VALUES (\'old\',47)');
 const env={PHONE_HASH_SECRET:'test',DB:{prepare(sql){return {async all(){return {results:db.prepare(sql).all().map(r=>({...r}))};},async run(){db.exec(sql);return {meta:{changes:0}};}};}}};
 attachBatch(db,env.DB);
 const data=await (await onRequest({request:new Request('https://example.test/api/votes'),env})).json();
 assert.deepEqual(data.counts,[{id:47,count:1}]);assert.equal(data.stale,false);
 assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name='additional_votes'").get().n,1);
 } finally {db.close();}
});
