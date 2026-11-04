// Counter triggers keep count reads proportional to merch count, not total votes.
const additionalSchema=`CREATE TABLE IF NOT EXISTS additional_votes (phone_hash TEXT NOT NULL,merch_id INTEGER NOT NULL CHECK(merch_id>=49),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(phone_hash,merch_id))`;
export const totalsSchema=[
 additionalSchema,
 `CREATE TABLE IF NOT EXISTS vote_totals (merch_id INTEGER PRIMARY KEY,count INTEGER NOT NULL DEFAULT 0 CHECK(count>=0))`,
 `CREATE TABLE IF NOT EXISTS vote_totals_metadata (id INTEGER PRIMARY KEY CHECK(id=1))`,
 ...['votes','additional_votes'].flatMap(table=>[
 `CREATE TRIGGER IF NOT EXISTS ${table}_count_insert AFTER INSERT ON ${table} BEGIN INSERT INTO vote_totals (merch_id,count) VALUES (NEW.merch_id,1) ON CONFLICT(merch_id) DO UPDATE SET count=count+1; END`,
 `CREATE TRIGGER IF NOT EXISTS ${table}_count_delete AFTER DELETE ON ${table} BEGIN UPDATE vote_totals SET count=MAX(0,count-1) WHERE merch_id=OLD.merch_id; END`
 ]),
 `INSERT INTO vote_totals (merch_id,count) SELECT merch_id,COUNT(*) FROM (SELECT merch_id FROM votes UNION ALL SELECT merch_id FROM additional_votes) WHERE NOT EXISTS(SELECT 1 FROM vote_totals_metadata WHERE id=1) GROUP BY merch_id ON CONFLICT(merch_id) DO UPDATE SET count=excluded.count`,
 `INSERT OR IGNORE INTO vote_totals_metadata (id) VALUES (1)`
];
export async function readVoteCounts(db){
 const query=()=>db.prepare('SELECT merch_id AS id,count FROM vote_totals WHERE count>0 UNION ALL SELECT 0 AS id,0 AS count FROM vote_totals_metadata WHERE id=1').all();
 let results;
 try{results=(await query()).results;}
 catch(error){if(!String(error?.message||error).includes('no such table: vote_totals'))throw error;}
 if(!results?.some(row=>row.id===0)){
  await db.batch(totalsSchema.map(sql=>db.prepare(sql)));
  results=(await query()).results;
 }
 if(!results?.some(row=>row.id===0))throw new Error('Vote counters not initialized');
 return results.filter(row=>row.id>0);
}
export function isReadLimit(error){return /daily row read limit|free tier daily|D1.*quota/i.test(String(error?.message||error)+' '+String(error?.cause?.message||''));}
