export function attachBatch(db,adapter){
 adapter.batch=async statements=>{db.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());db.exec('COMMIT');return results;}catch(error){db.exec('ROLLBACK');throw error;}};
 return adapter;
}
