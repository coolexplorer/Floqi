-- Add preferred AI model column to profiles.
-- Values: 'auto' (default, system picks best model per template), 'haiku', 'sonnet'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_model TEXT DEFAULT 'auto';
