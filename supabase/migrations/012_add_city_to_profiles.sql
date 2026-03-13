-- Add city column to profiles for location-based features (weather, etc.)
-- Separate from timezone: timezone is for time calculations, city is for location services.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT DEFAULT NULL;
