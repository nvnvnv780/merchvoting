-- Atomic bootstrap is used by the API; original vote rows are never replaced.
CREATE TABLE IF NOT EXISTS additional_votes (phone_hash TEXT NOT NULL,merch_id INTEGER NOT NULL CHECK(merch_id>=49),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(phone_hash,merch_id));
CREATE TABLE IF NOT EXISTS vote_totals (merch_id INTEGER PRIMARY KEY,count INTEGER NOT NULL DEFAULT 0 CHECK(count>=0));
CREATE TABLE IF NOT EXISTS vote_totals_metadata (id INTEGER PRIMARY KEY CHECK(id=1));
CREATE TRIGGER IF NOT EXISTS votes_count_insert AFTER INSERT ON votes BEGIN INSERT INTO vote_totals (merch_id,count) VALUES (NEW.merch_id,1) ON CONFLICT(merch_id) DO UPDATE SET count=count+1; END;
CREATE TRIGGER IF NOT EXISTS votes_count_delete AFTER DELETE ON votes BEGIN UPDATE vote_totals SET count=MAX(0,count-1) WHERE merch_id=OLD.merch_id; END;
CREATE TRIGGER IF NOT EXISTS additional_votes_count_insert AFTER INSERT ON additional_votes BEGIN INSERT INTO vote_totals (merch_id,count) VALUES (NEW.merch_id,1) ON CONFLICT(merch_id) DO UPDATE SET count=count+1; END;
CREATE TRIGGER IF NOT EXISTS additional_votes_count_delete AFTER DELETE ON additional_votes BEGIN UPDATE vote_totals SET count=MAX(0,count-1) WHERE merch_id=OLD.merch_id; END;
INSERT INTO vote_totals (merch_id,count) SELECT merch_id,COUNT(*) FROM (SELECT merch_id FROM votes UNION ALL SELECT merch_id FROM additional_votes) WHERE NOT EXISTS(SELECT 1 FROM vote_totals_metadata WHERE id=1) GROUP BY merch_id ON CONFLICT(merch_id) DO UPDATE SET count=excluded.count;
INSERT OR IGNORE INTO vote_totals_metadata (id) VALUES (1);
