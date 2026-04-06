-- Fix integer timestamps copied as-is when columns changed from INTEGER to TEXT in 0006
-- Rows created before 0006 have unix epoch integers stored as text strings
-- Convert them to ISO datetime format for consistency

-- menu_items: convert integer timestamps to datetime
UPDATE menu_items SET
  created_at = datetime(CAST(created_at AS INTEGER), 'unixepoch'),
  updated_at = datetime(CAST(updated_at AS INTEGER), 'unixepoch')
WHERE created_at GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]*'
  AND length(created_at) <= 10;

-- options: convert integer timestamps to datetime
UPDATE options SET
  created_at = datetime(CAST(created_at AS INTEGER), 'unixepoch'),
  updated_at = datetime(CAST(updated_at AS INTEGER), 'unixepoch')
WHERE created_at GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]*'
  AND length(created_at) <= 10;

-- DOWN MIGRATION (for reference):
-- Cannot revert: original integer values are lost after conversion
-- Would need to restore from backup
