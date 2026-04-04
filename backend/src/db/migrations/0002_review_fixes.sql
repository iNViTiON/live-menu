-- WARNING: The registration_tokens recreation below (lines 7-22) is not wrapped in a transaction.
-- If this migration fails mid-way, data could be lost. This has been applied successfully
-- and cannot be safely modified. Future table recreations MUST use BEGIN/COMMIT.

-- M8: Add indexes on webauthn_challenges
CREATE INDEX IF NOT EXISTS idx_challenges_expires ON webauthn_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_challenges_user ON webauthn_challenges(user_id);

-- M7: Recreate registration_tokens with ON DELETE SET NULL for created_by
-- SQLite requires table recreation to change constraints
CREATE TABLE registration_tokens_new (
  token TEXT PRIMARY KEY,
  user_id INTEGER,
  pre_filled_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'staff')),
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  created_by INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO registration_tokens_new SELECT * FROM registration_tokens;
DROP TABLE registration_tokens;
ALTER TABLE registration_tokens_new RENAME TO registration_tokens;

-- L6: Trigger to sync users.has_passkey
CREATE TRIGGER trg_passkey_insert AFTER INSERT ON passkey_credentials
BEGIN
  UPDATE users SET has_passkey = 1 WHERE id = NEW.user_id;
END;

CREATE TRIGGER trg_passkey_delete AFTER DELETE ON passkey_credentials
BEGIN
  UPDATE users SET has_passkey = (
    SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END
    FROM passkey_credentials WHERE user_id = OLD.user_id
  ) WHERE id = OLD.user_id;
END;

-- L9: Enforce uppercase language codes at app level
-- SQLite can't ALTER CHECK constraints. We add a trigger instead.
CREATE TRIGGER trg_language_upper BEFORE INSERT ON languages
BEGIN
  SELECT RAISE(ABORT, 'Language code must be uppercase')
  WHERE NEW.code != upper(NEW.code);
END;
