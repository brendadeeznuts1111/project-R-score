-- Enhanced schema with Unicode support

-- Unicode metadata table
CREATE TABLE IF NOT EXISTS unicode_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL, -- 'shortcut', 'profile', 'macro'
  entity_id TEXT NOT NULL,
  field_name TEXT NOT NULL, -- 'description', 'name', 'icon'
  original_text TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  grapheme_clusters JSON, -- Array of grapheme clusters
  visual_width INTEGER,
  script_detection JSON, -- Array of detected scripts
  emoji_count INTEGER DEFAULT 0,
  has_complex_unicode BOOLEAN DEFAULT 0,
  unicode_version TEXT DEFAULT '15.0.0',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entity_type, entity_id, field_name)
);

-- Enhanced shortcuts table with Unicode columns
CREATE TABLE IF NOT EXISTS shortcuts_unicode (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  description_unicode JSON, -- JSON with unicode analysis
  icon TEXT,
  icon_unicode JSON, -- JSON with icon analysis
  category TEXT NOT NULL,
  default_primary TEXT NOT NULL,
  default_primary_unicode TEXT, -- Unicode symbol version
  default_secondary TEXT,
  default_macos TEXT,
  default_linux TEXT,
  enabled BOOLEAN DEFAULT 1,
  scope TEXT NOT NULL,
  requires_confirmation BOOLEAN DEFAULT 0,
  condition TEXT,
  
  -- Unicode metadata
  unicode_version TEXT DEFAULT '15.0.0',
  normalization_applied BOOLEAN DEFAULT 0,
  last_normalized TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced profiles table
CREATE TABLE IF NOT EXISTS profiles_unicode (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_unicode JSON, -- Unicode analysis of name
  description TEXT,
  description_unicode JSON,
  icon TEXT,
  icon_unicode JSON,
  based_on TEXT,
  category TEXT NOT NULL,
  enabled BOOLEAN DEFAULT 1,
  locked BOOLEAN DEFAULT 0,
  unicode_version TEXT DEFAULT '15.0.0',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Unicode normalization history
CREATE TABLE IF NOT EXISTS unicode_normalization_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  before_normalization TEXT,
  after_normalization TEXT,
  normalization_type TEXT NOT NULL, -- 'NFC', 'NFD', 'emoji', 'grapheme'
  unicode_version TEXT NOT NULL,
  normalized_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Script detection cache
CREATE TABLE IF NOT EXISTS script_detection_cache (
  text_hash TEXT PRIMARY KEY, -- SHA256 of text
  text TEXT NOT NULL,
  scripts JSON NOT NULL, -- Array of script names
  script_count INTEGER NOT NULL,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Emoji usage statistics
CREATE TABLE IF NOT EXISTS emoji_usage_stats (
  emoji TEXT NOT NULL,
  emoji_normalized TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  first_used TIMESTAMP,
  last_used TIMESTAMP,
  entity_type TEXT, -- Where emoji is used
  PRIMARY KEY(emoji_normalized, entity_type)
);

-- Grapheme cluster analysis cache
CREATE TABLE IF NOT EXISTS grapheme_cache (
  text_hash TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  clusters JSON NOT NULL, -- Array of grapheme clusters
  cluster_count INTEGER NOT NULL,
  visual_width INTEGER NOT NULL,
  has_complex_unicode BOOLEAN NOT NULL,
  analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_unicode_metadata_entity ON unicode_metadata(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_shortcuts_unicode_normalized ON shortcuts_unicode(normalization_applied);
CREATE INDEX IF NOT EXISTS idx_grapheme_cache_hash ON grapheme_cache(text_hash);
CREATE INDEX IF NOT EXISTS idx_emoji_usage ON emoji_usage_stats(emoji_normalized, usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_script_cache ON script_detection_cache(text_hash);

-- Update triggers for unicode metadata
CREATE TRIGGER IF NOT EXISTS update_shortcuts_unicode_metadata
AFTER INSERT ON shortcuts_unicode
BEGIN
  -- Automatically analyze description unicode
  INSERT OR REPLACE INTO unicode_metadata 
    (entity_type, entity_id, field_name, original_text, normalized_text, updated_at)
  VALUES 
    ('shortcut', NEW.id, 'description', NEW.description, NEW.description, CURRENT_TIMESTAMP);
  
  -- Analyze icon if present
  IF NEW.icon IS NOT NULL THEN
    INSERT OR REPLACE INTO unicode_metadata 
      (entity_type, entity_id, field_name, original_text, normalized_text, updated_at)
    VALUES 
      ('shortcut', NEW.id, 'icon', NEW.icon, NEW.icon, CURRENT_TIMESTAMP);
  END IF;
END;

CREATE TRIGGER IF NOT EXISTS update_profiles_unicode_metadata
AFTER INSERT ON profiles_unicode
BEGIN
  INSERT OR REPLACE INTO unicode_metadata 
    (entity_type, entity_id, field_name, original_text, normalized_text, updated_at)
  VALUES 
    ('profile', NEW.id, 'name', NEW.name, NEW.name, CURRENT_TIMESTAMP);
  
  IF NEW.description IS NOT NULL THEN
    INSERT OR REPLACE INTO unicode_metadata 
      (entity_type, entity_id, field_name, original_text, normalized_text, updated_at)
    VALUES 
      ('profile', NEW.id, 'description', NEW.description, NEW.description, CURRENT_TIMESTAMP);
  END IF;
  
  IF NEW.icon IS NOT NULL THEN
    INSERT OR REPLACE INTO unicode_metadata 
      (entity_type, entity_id, field_name, original_text, normalized_text, updated_at)
    VALUES 
      ('profile', NEW.id, 'icon', NEW.icon, NEW.icon, CURRENT_TIMESTAMP);
  END IF;
END;
