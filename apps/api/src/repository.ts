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
  /** 新しい順のすべての作品。DB接続時に検索・ページ分割を保存先へ移す */
  list(): Promise<OrigamiRecord[]>;
  create(record: { ownerId: string; model: OrigamiModel }): Promise<void>;
  update(id: string, model: OrigamiModel): Promise<void>;
  delete(id: string): Promise<void>;
}

export const createMemoryOrigamiRepository = (seed: OrigamiRecord[] = []): OrigamiRepository => {
  const records = new Map<string, OrigamiRecord & { order: number }>();
  // seed は渡した順に並べ、投稿した作品はその前に新しい順で並べる
  let lastOrder = 0;
  seed.forEach((record, index) => {
    const { id } = record.model as { id: string };
    records.set(id, { ...record, order: -index });
  });
  const toRecord = ({ ownerId, model }: OrigamiRecord): OrigamiRecord => ({ ownerId, model });
  return {
    findById: async (id) => {
      const record = records.get(id);
      return record ? toRecord(record) : null;
    },
    list: async () => [...records.values()].sort((left, right) => right.order - left.order).map(toRecord),
    create: async ({ ownerId, model }) => {
      records.set(model.id, { ownerId, model, order: ++lastOrder });
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
