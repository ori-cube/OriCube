-- 公開範囲: public（一覧・検索に載る）/ unlisted（URLを知っている人だけ）
ALTER TABLE models ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public';
-- 保存時のデータ形式（ProcedureV2 の version）とエンジンの版。エンジン更新で過去作品が変わらないよう記録する
ALTER TABLE models ADD COLUMN format_version INTEGER NOT NULL DEFAULT 2;
ALTER TABLE models ADD COLUMN engine_version TEXT NOT NULL DEFAULT 'unknown';

CREATE INDEX models_visibility_created_at_idx ON models (visibility, created_at);
