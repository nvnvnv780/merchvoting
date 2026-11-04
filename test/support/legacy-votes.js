// Existing vote fixtures only mock vote queries. Keep the unrelated device state
// on a real SQLite connection so those fixtures can keep verifying vote behavior.
import { DatabaseSync } from 'node:sqlite';
import { onRequest as realOnRequest } from '../../functions/api/votes.js';
const databases=new WeakMap();
export async function onRequest({request,env}) {
 let db=databases.get(env);
 if(!db){db=new DatabaseSync(':memory:');databases.set(env,db);}
 const wrapped={...env,DB:{prepare(sql){
  if(!sql.includes('device_account_limits'))return env.DB.prepare(sql);
  let args=[];return {bind(...v){args=v;return this;},async all(){return {results:db.prepare(sql).all(...args).map(r=>({...r}))};},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}};}};
 }}};
 return realOnRequest({request,env:wrapped});
}
