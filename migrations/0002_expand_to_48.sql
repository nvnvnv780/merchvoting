-- Preserve previous votes while increasing the supported campaign size.
CREATE TABLE votes_expanded (
  phone_hash TEXT NOT NULL,
  merch_id INTEGER NOT NULL CHECK(merch_id BETWEEN 1 AND 48),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(phone_hash, merch_id)
);
INSERT INTO votes_expanded (phone_hash, merch_id, created_at)
SELECT phone_hash, merch_id, created_at FROM votes;
DROP TABLE votes;
ALTER TABLE votes_expanded RENAME TO votes;
