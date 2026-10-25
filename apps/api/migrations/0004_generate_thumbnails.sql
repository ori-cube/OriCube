-- サムネイルはサーバーが手順から描くため、投稿された画像の保存と、画像の確定前（pending）の状態をやめる。
-- pending の作品は画像の確定前に止まった、公開されていない作品なので消す
DELETE FROM models WHERE status = 'pending';
DROP INDEX models_status_created_at_idx;
ALTER TABLE models DROP COLUMN status;
ALTER TABLE models DROP COLUMN thumbnail_key;
ALTER TABLE models DROP COLUMN thumbnail_content_type;
ALTER TABLE models DROP COLUMN thumbnail_size;
