import { models } from "./mocks/models";
import { origamiModelSchema, type OrigamiModel } from "./schema";
import { searchTextOf, summarize, type OrigamiListQuery, type OrigamiListResult, type OrigamiSummary } from "./summary";

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
 * Workers では D1（d1Repository.ts）、Node.js とテストではメモリ上の実装を使う
 */
export interface OrigamiRepository {
  findById(id: string): Promise<OrigamiRecord | null>;
  /**
   * 公開（public）の作品の要約を新しい順に返す。keyword で名前と説明を絞り込み、offset・limit で切り出す
   *
   * @description
   * 要約は投稿・更新のときに作って持ち、一覧では手順を読まない（作品数が増えても一覧の手間を一定にする）
   */
  listPublic(query: OrigamiListQuery): Promise<OrigamiListResult>;
  create(record: { ownerId: string; model: OrigamiModel }): Promise<void>;
  update(id: string, model: OrigamiModel): Promise<void>;
  delete(id: string): Promise<void>;
}

/** 一覧に載せる作品の要約と検索の対象。形式が正しくない作品は null で、一覧から除く */
interface Listing {
  visibility: OrigamiModel["visibility"];
  searchText: string;
  summary: OrigamiSummary;
}

const listingOf = (model: unknown): Listing | null => {
  const parsed = origamiModelSchema.safeParse(model);
  if (!parsed.success) {
    console.error("一覧から形式が正しくない作品を除きました", parsed.error.issues);
    return null;
  }
  return { visibility: parsed.data.visibility, searchText: searchTextOf(parsed.data), summary: summarize(parsed.data) };
};

export const createMemoryOrigamiRepository = (seed: OrigamiRecord[] = []): OrigamiRepository => {
  const records = new Map<string, OrigamiRecord & { order: number; listing?: Listing | null }>();
  // seed は渡した順に並べ、投稿した作品はその前に新しい順で並べる
  let lastOrder = 0;
  seed.forEach((record, index) => {
    const { id } = record.model as { id: string };
    records.set(id, { ...record, order: -index });
  });
  const toRecord = ({ ownerId, model }: OrigamiRecord): OrigamiRecord => ({ ownerId, model });
  /** 要約は最初に一覧で使うときに作り、作品を書き換えるまで使い回す */
  const listing = (record: OrigamiRecord & { listing?: Listing | null }) => {
    if (record.listing === undefined) record.listing = listingOf(record.model);
    return record.listing;
  };
  return {
    findById: async (id) => {
      const record = records.get(id);
      return record ? toRecord(record) : null;
    },
    listPublic: async ({ keyword, offset, limit }) => {
      const matched = [...records.values()]
        .sort((left, right) => right.order - left.order)
        .flatMap((record) => {
          const entry = listing(record);
          return entry && entry.visibility === "public" && entry.searchText.includes(keyword) ? [entry.summary] : [];
        });
      return { items: matched.slice(offset, offset + limit), total: matched.length };
    },
    create: async (record) => {
      records.set(record.model.id, { ...record, order: ++lastOrder });
    },
    update: async (id, model) => {
      const record = records.get(id);
      if (record) records.set(id, { ...record, model, listing: undefined });
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
 * 鶴などのモックをDB接続後も見られるようにし、一覧では保存先の作品のあとに並べる。
 * モックは所有者がいないため更新・削除できず、書き込みはすべて保存先に行く
 */
export const withMockFallback = (primary: OrigamiRepository, mock = createMockOrigamiRepository()): OrigamiRepository => ({
  ...primary,
  findById: async (id) => (await primary.findById(id)) ?? mock.findById(id),
  // 保存先の作品のあとにモックを続けたものを、offset・limit で切り出す。
  // 投稿の ID はサーバーが UUID で決めるので、モックの ID（crane など）と重ならない
  listPublic: async ({ keyword, offset, limit }) => {
    const [stored, mocks] = await Promise.all([
      primary.listPublic({ keyword, offset, limit }),
      mock.listPublic({ keyword, offset: 0, limit: Number.MAX_SAFE_INTEGER }),
    ]);
    const mockStart = Math.max(0, offset - stored.total);
    return {
      items: [...stored.items, ...mocks.items.slice(mockStart, mockStart + limit - stored.items.length)],
      total: stored.total + mocks.total,
    };
  },
});
