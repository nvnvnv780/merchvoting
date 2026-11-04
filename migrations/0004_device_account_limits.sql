-- Additive migration; existing votes and contact hashes are unchanged.
CREATE TABLE IF NOT EXISTS device_account_limits (
  device_id TEXT PRIMARY KEY,
  account_hash TEXT NOT NULL,
  change_count INTEGER NOT NULL DEFAULT 0 CHECK(change_count BETWEEN 0 AND 3)
);
