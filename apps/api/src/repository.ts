import { models } from "./mocks/models";
import type { OrigamiModel } from "./schema";

/** 保存済みの作品と、その所有者（Clerk のユーザーID。モックは null で誰も編集できない） */
export interface OrigamiRecord {
  ownerId: string | null;
  /** 未検証の値として扱い、呼び出し側でスキーマ検証する */
  model: unknown;
}

/**
 * 作品の保存先
 *
 * @description
 * DB（Neon + Hyperdrive、#100）に接続するまではメモリ上の実装を使う。
 * Workers では isolate ごとのメモリなので、書き込みは永続化されない
 */
export interface OrigamiRepository {
  findById(id: string): Promise<OrigamiRecord | null>;
  create(record: { ownerId: string; model: OrigamiModel }): Promise<void>;
  update(id: string, model: OrigamiModel): Promise<void>;
  delete(id: string): Promise<void>;
}

export const createMemoryOrigamiRepository = (seed: OrigamiRecord[] = []): OrigamiRepository => {
  const records = new Map<string, OrigamiRecord>();
  for (const record of seed) {
    const { id } = record.model as { id: string };
    records.set(id, record);
  }
  return {
    findById: async (id) => records.get(id) ?? null,
    create: async ({ ownerId, model }) => {
      records.set(model.id, { ownerId, model });
    },
    update: async (id, model) => {
      const record = records.get(id);
      if (record) records.set(id, { ...record, model });
    },
    delete: async (id) => {
      records.delete(id);
    },
  };
};

/** 鶴などのモック（所有者なし）を入れた保存先 */
export const createMockOrigamiRepository = () =>
  createMemoryOrigamiRepository(models.map((model) => ({ ownerId: null, model })));

/**
 * 保存先に無い作品はモックから読む
 *
 * @description
 * 作品一覧ができるまで、トップから案内する鶴などのモックをDB接続後も見られるようにする。
 * モックは所有者がいないため更新・削除できず、書き込みはすべて保存先に行く
 */
export const withMockFallback = (primary: OrigamiRepository, mock = createMockOrigamiRepository()): OrigamiRepository => ({
  ...primary,
  findById: async (id) => (await primary.findById(id)) ?? mock.findById(id),
});
