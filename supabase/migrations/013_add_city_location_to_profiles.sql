-- Add lat/lon and country for accurate location-based features.
-- city stores display name, city_lat/city_lon for OWM weather queries, city_country for disambiguation.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city_lat DOUBLE PRECISION DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city_lon DOUBLE PRECISION DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city_country TEXT DEFAULT NULL;
