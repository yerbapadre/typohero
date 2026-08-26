CREATE TABLE songs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  duration_ms INTEGER NOT NULL
);

CREATE TABLE song_lanes (
  song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  instrument TEXT NOT NULL,
  stem TEXT NOT NULL,
  PRIMARY KEY (song_id, instrument)
);

CREATE TABLE passages (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  content TEXT NOT NULL,
  length_chars INTEGER NOT NULL
);

CREATE TABLE passage_tags (
  passage_id TEXT NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (passage_id, tag)
);

CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  face_id TEXT NOT NULL,
  outfit_id TEXT NOT NULL,
  instrument_skin_id TEXT NOT NULL,
  songs_played INTEGER NOT NULL DEFAULT 0,
  best_accuracy REAL NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE performance_history (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL,
  passage_id TEXT NOT NULL,
  instrument TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  accuracy REAL NOT NULL,
  longest_streak INTEGER NOT NULL,
  points INTEGER NOT NULL,
  played_at INTEGER NOT NULL
);

CREATE INDEX idx_performance_history_profile ON performance_history(profile_id);
