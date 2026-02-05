-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Shortcuts table
CREATE TABLE IF NOT EXISTS shortcuts (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'theme', 'telemetry', 'emulator', 'general', 'compliance', 'logs',
    'ui', 'developer', 'accessibility', 'data', 'payment'
  )),
  default_primary TEXT NOT NULL,
  default_secondary TEXT,
  default_macos TEXT,
  default_linux TEXT,
  enabled BOOLEAN DEFAULT 1,
  scope TEXT NOT NULL CHECK (scope IN ('global', 'panel', 'component')),
  requires_confirmation BOOLEAN DEFAULT 0,
  condition TEXT, -- JSON string of function
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMP
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  based_on TEXT REFERENCES profiles(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN (
    'default', 'professional', 'developer', 'compliance', 
    'accessibility', 'custom', 'terminal'
  )),
  enabled BOOLEAN DEFAULT 1,
  locked BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Profile overrides table
CREATE TABLE IF NOT EXISTS profile_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shortcut_id TEXT NOT NULL REFERENCES shortcuts(id) ON DELETE CASCADE,
  key_combination TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(profile_id, shortcut_id)
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY DEFAULT 'default',
  active_profile_id TEXT REFERENCES profiles(id),
  keyboard_layout TEXT DEFAULT 'us',
  enable_sounds BOOLEAN DEFAULT 1,
  enable_hints BOOLEAN DEFAULT 1,
  enable_training BOOLEAN DEFAULT 1,
  auto_resolve_conflicts BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usage analytics table
CREATE TABLE IF NOT EXISTS usage_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shortcut_id TEXT REFERENCES shortcuts(id) ON DELETE CASCADE,
  profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  user_id TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  context TEXT,
  success BOOLEAN DEFAULT 1,
  response_time_ms INTEGER
);

-- Conflict history table
CREATE TABLE IF NOT EXISTS conflict_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_combination TEXT NOT NULL,
  conflicting_actions JSON NOT NULL,
  resolved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolution_method TEXT CHECK (resolution_method IN (
    'auto', 'manual', 'user_override', 'disabled'
  )),
  user_id TEXT
);

-- Shortcut macros table
CREATE TABLE IF NOT EXISTS macros (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sequence JSON NOT NULL, -- Array of {action, delay}
  profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT 1,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Training progress table
CREATE TABLE IF NOT EXISTS training_progress (
  user_id TEXT,
  lesson_id TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT 0,
  completed_at TIMESTAMP,
  attempts INTEGER DEFAULT 0,
  best_time_ms INTEGER,
  PRIMARY KEY (user_id, lesson_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shortcuts_category ON shortcuts(category);
CREATE INDEX IF NOT EXISTS idx_shortcuts_scope ON shortcuts(scope);
CREATE INDEX IF NOT EXISTS idx_shortcuts_enabled ON shortcuts(enabled) WHERE enabled = 1;
CREATE INDEX IF NOT EXISTS idx_profiles_category ON profiles(category);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_timestamp ON usage_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_shortcut ON usage_analytics(shortcut_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_profile_overrides_composite ON profile_overrides(profile_id, shortcut_id);

-- Create triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_shortcuts_timestamp 
AFTER UPDATE ON shortcuts 
BEGIN
  UPDATE shortcuts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_profiles_timestamp 
AFTER UPDATE ON profiles 
BEGIN
  UPDATE profiles SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
