-- 一覧の要約。投稿・更新のときに手順から作り、一覧では手順を読まずに返す。
-- 検索の対象（search_text）は名前と説明を NFKC・小文字にそろえた値。
-- これより前に保存した作品は NULL のままで、一覧は手順から作る（更新すると埋まる）
ALTER TABLE models ADD COLUMN step_count INTEGER;
ALTER TABLE models ADD COLUMN thumbnail TEXT;
ALTER TABLE models ADD COLUMN search_text TEXT;
