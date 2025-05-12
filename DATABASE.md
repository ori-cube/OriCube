# データベースの仕様

## 開発環境

本プロダクトでは，開発環境にローカルの psql を使用します．

### 起動手順

1. `cd ${プロジェクトルート}`
2. `docker compose up`を実行することで，docker 上に DB が作成されます．
3. `psql -U user -d postgres`により，psql のターミナルに入ることができます．

### migrate 手順

1. `cd ${プロジェクトルート}`
2. `npm run migrate:dev`を実行することで，schema.prisma に記述されているスキーマが作成されます．
3. seed したい場合は`npm run db:seed`を実行してください．
4. `npm run db:generate:dev`を実行することで，prisma の設定が client に反映されます．

## 本番環境

本プロダクトでは，本番環境に Supabase を使用します．

### 起動手順

常に起動しています．気にしないで大丈夫です．

### migrate 手順

1. `cd ${プロジェクトルート}`
2. `npm run migrate:prod`を実行することで，schema.prisma に記述されているスキーマが作成されます．
