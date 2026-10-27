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
  /** 未検証の値として扱い、呼び出し側でスキーマ検証する */
  model: unknown;
}

export type OrigamiRecordPatch = Partial<Pick<OrigamiRecord, "status" | "thumbnail">> & { model?: OrigamiModel };

/**
 * 作品の保存先
 *
 * @description
 * Workers では D1（d1Repository.ts）、Node.js とテストではメモリ上の実装を使う
 */
export interface OrigamiRepository {
  findById(id: string): Promise<OrigamiRecord | null>;
  /** 公開済みの作品を新しい順に返す。作品数が増えたら検索・ページ分割を保存先へ移す */
  list(): Promise<OrigamiRecord[]>;
  /** その人の作品を、公開前（pending）も含めて新しい順に返す */
  listByOwner(ownerId: string): Promise<OrigamiRecord[]>;
  create(record: { ownerId: string; status: OrigamiStatus; thumbnail: ThumbnailRecord | null; model: OrigamiModel }): Promise<void>;
  update(id: string, patch: OrigamiRecordPatch): Promise<void>;
  delete(id: string): Promise<void>;
}

type SeedRecord = Pick<OrigamiRecord, "ownerId" | "model"> & Partial<OrigamiRecord>;

export const createMemoryOrigamiRepository = (seed: SeedRecord[] = []): OrigamiRepository => {
  const records = new Map<string, OrigamiRecord & { order: number }>();
  // seed は渡した順に並べ、投稿した作品はその前に新しい順で並べる。seed は既定で公開済み・サムネイルなし
  let lastOrder = 0;
  seed.forEach((record, index) => {
    const { id } = record.model as { id: string };
    records.set(id, { status: "published", thumbnail: null, ...record, order: -index });
  });
  const toRecord = ({ ownerId, status, thumbnail, model }: OrigamiRecord): OrigamiRecord => ({ ownerId, status, thumbnail, model });
  return {
    findById: async (id) => {
      const record = records.get(id);
      return record ? toRecord(record) : null;
    },
    list: async () => [...records.values()].filter((record) => record.status === "published").sort((left, right) => right.order - left.order).map(toRecord),
    listByOwner: async (ownerId) => [...records.values()].filter((record) => record.ownerId === ownerId).sort((left, right) => right.order - left.order).map(toRecord),
    create: async (record) => {
      records.set(record.model.id, { ...record, order: ++lastOrder });
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

/**
 * 保存先に無い作品はモックから読む
 *
 * @description
 * 鶴などのモックをDB接続後も見られるようにし、一覧では保存先の作品のあとに並べる。
 * モックは所有者がいないため更新・削除できず、書き込みはすべて保存先に行く
 */
export const withMockFallback = (primary: OrigamiRepository, mock = createMockOrigamiRepository()): OrigamiRepository => ({
  ...primary,
  findById: async (id) => (await primary.findById(id)) ?? mock.findById(id),
  list: async () => {
    const [stored, mocks] = await Promise.all([primary.list(), mock.list()]);
    const ids = new Set(stored.map((record) => (record.model as { id: string }).id));
    return [...stored, ...mocks.filter((record) => !ids.has((record.model as { id: string }).id))];
  },
});
