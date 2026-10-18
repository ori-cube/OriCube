-- 作品。procedure（ProcedureV2）と step_descriptions は JSON 文字列で保存する
CREATE TABLE models (
  id TEXT PRIMARY KEY NOT NULL,
  -- Clerk のユーザーID。メールアドレスは所有権のキーにしない
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  color TEXT NOT NULL,
  procedure TEXT NOT NULL,
  step_descriptions TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX models_owner_id_idx ON models (owner_id);
