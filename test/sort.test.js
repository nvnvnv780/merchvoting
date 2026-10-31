import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortMerch } from '../src/sort.js';
test('sorts 48 merch in both vote directions, resolving ties by stable IDs', () => {
 const items=Array.from({length:48},(_,i)=>({id:i+1,count:i%7}));
 for(const order of ['asc','desc']) {
  const result=sortMerch(items,order);
  assert.equal(result.length,48);
  for(let i=1;i<result.length;i++) {
   const a=result[i-1],b=result[i];
   assert.ok(order==='asc'?a.count<=b.count:a.count>=b.count);
   if(a.count===b.count)assert.ok(a.id<b.id);
  }
 }
 assert.deepEqual(sortMerch(items,'default'),items);
 assert.equal(items[0].id,1);
});
