-- ログインをやめ、作品の編集・削除は投稿時に返す編集用の鍵で行う。
-- 鍵そのものは保存せず、SHA-256 の16進数（edit_key_hash）だけを持つ。
-- これより前の作品（Clerk のユーザーIDで持ち主を記録したもの）は鍵が無く、編集・削除できない
DROP INDEX models_owner_id_idx;
ALTER TABLE models DROP COLUMN owner_id;
ALTER TABLE models ADD COLUMN edit_key_hash TEXT;
