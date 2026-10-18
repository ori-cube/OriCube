-- 投稿は pending で作り、サムネイルのアップロードを確かめてから published にする（#100 の画像保存）。
-- 既存の作品は公開済み・サムネイルなしとして扱う
ALTER TABLE models ADD COLUMN status TEXT NOT NULL DEFAULT 'published';
-- サムネイルの保存先（R2）のキーと、投稿時に申告された形式・サイズ
ALTER TABLE models ADD COLUMN thumbnail_key TEXT;
ALTER TABLE models ADD COLUMN thumbnail_content_type TEXT;
ALTER TABLE models ADD COLUMN thumbnail_size INTEGER;
-- 完成形を見せる向き（PresentationV2）を JSON 文字列で保存する
ALTER TABLE models ADD COLUMN presentation TEXT;

CREATE INDEX models_status_created_at_idx ON models (status, created_at);
