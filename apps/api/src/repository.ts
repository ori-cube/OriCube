import { models } from "./mocks/models";
import type { OrigamiModel, ThumbnailSpec } from "./schema";

/**
 * 作品の公開状態
 *
 * @description
 * DBと画像の保存先は単一トランザクションにならないため、投稿は pending で作り、
 * サムネイルのアップロードを確かめてから published にする（#100 の画像保存）
 */
export type OrigamiStatus = "pending" | "published";

/** 作品のサムネイル。キーはサーバーが決め、形式とサイズは投稿時に申告された値 */
export interface ThumbnailRecord extends ThumbnailSpec {
  key: string;
}

/** 保存済みの作品と、その所有者（Clerk のユーザーID。モックは null で誰も編集できない） */
export interface OrigamiRecord {
  ownerId: string | null;
  status: OrigamiStatus;
  thumbnail: ThumbnailRecord | null;
  /** ISO 8601。一覧の並び順に使う */
  createdAt: string;
  /** 未検証の値として扱い、呼び出し側でスキーマ検証する */
  model: unknown;
}

export type OrigamiRecordPatch = Partial<Pick<OrigamiRecord, "status" | "thumbnail">> & { model?: OrigamiModel };

/**
 * 作品の保存先
 *
 * @description
 * DB（Neon + Hyperdrive、#100）に接続するまではメモリ上の実装を使う。
 * Workers では isolate ごとのメモリなので、書き込みは永続化されない
 */
export interface OrigamiRepository {
  findById(id: string): Promise<OrigamiRecord | null>;
  /** 公開済みの作品を新しい順に返す */
  listPublished(options: { limit: number }): Promise<OrigamiRecord[]>;
  create(record: { ownerId: string; status: OrigamiStatus; thumbnail: ThumbnailRecord | null; model: OrigamiModel }): Promise<void>;
  update(id: string, patch: OrigamiRecordPatch): Promise<void>;
  delete(id: string): Promise<void>;
}

type SeedRecord = Pick<OrigamiRecord, "ownerId" | "model"> & Partial<OrigamiRecord>;

export const createMemoryOrigamiRepository = (seed: SeedRecord[] = []): OrigamiRepository => {
  const records = new Map<string, OrigamiRecord>();
  for (const record of seed) {
    const { id } = record.model as { id: string };
    records.set(id, { status: "published", thumbnail: null, createdAt: new Date(0).toISOString(), ...record });
  }
  return {
    findById: async (id) => records.get(id) ?? null,
    listPublished: async ({ limit }) =>
      [...records.values()]
        .filter((record) => record.status === "published")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit),
    create: async ({ model, ...record }) => {
      records.set(model.id, { ...record, model, createdAt: new Date().toISOString() });
    },
    update: async (id, patch) => {
      const record = records.get(id);
      if (record) records.set(id, { ...record, ...patch });
    },
    delete: async (id) => {
      records.delete(id);
    },
  };
};

/** 鶴などのモック（所有者なし・公開済み・サムネイルなし）を入れた保存先 */
export const createMockOrigamiRepository = () =>
  createMemoryOrigamiRepository(models.map((model) => ({ ownerId: null, model })));
