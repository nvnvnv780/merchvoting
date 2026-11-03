-- New merch votes are separate from the original table with its 1–48 constraint.
CREATE TABLE IF NOT EXISTS additional_votes (
  phone_hash TEXT NOT NULL,
  merch_id INTEGER NOT NULL CHECK(merch_id >= 49),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(phone_hash, merch_id)
);
