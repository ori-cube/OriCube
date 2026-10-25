import type { OrigamiRepository } from "./repository";
import type { ThumbnailStorage } from "./storage";

/** 公開されないまま・どこからも使われないまま、この時間を過ぎたら消す（アップロード先の期限10分より十分長くする） */
export const CLEANUP_AFTER_MS = 24 * 60 * 60 * 1000;
/** 1回で消す作品の上限。Worker の CPU 時間に収まるよう、残りは次の回に回す */
const MAX_PENDING_PER_RUN = 100;
/** 1回で調べる画像の上限 */
const MAX_OBJECTS_PER_RUN = 2000;

export interface CleanupResult {
  /** 消した公開前の作品 */
  pendingModels: number;
  /** 消した、どの作品からも使われていない画像 */
  orphanThumbnails: number;
}

const modelIdOf = (key: string) => key.split("/")[1] ?? "";

/**
 * 公開前のまま残った作品と、使われていないサムネイルを消す（#100 の画像保存の掃除）
 *
 * @description
 * 1. 作られてから CLEANUP_AFTER_MS を過ぎても公開されない（pending の）作品を、サムネイルごと消す
 * 2. 置かれてから CLEANUP_AFTER_MS を過ぎ、どの作品の今のサムネイルでもない画像を消す。
 *    撮り直しで作り直したアップロード先・差し替えなかった再編集の撮り直し・削除時に消せなかった画像が対象
 *
 * 公開済みの作品とその今のサムネイルは消さない。途中で失敗しても、次の回で続きから消せる
 */
export const cleanupStaleUploads = async ({ repository, storage, now = Date.now() }: { repository: OrigamiRepository; storage: ThumbnailStorage; now?: number }): Promise<CleanupResult> => {
  const before = new Date(now - CLEANUP_AFTER_MS);
  const result: CleanupResult = { pendingModels: 0, orphanThumbnails: 0 };

  for (const record of await repository.listPendingBefore(before, MAX_PENDING_PER_RUN)) {
    const { id } = record.model as { id: string };
    // 作品を先に消す。画像だけ残っても 2. で消える
    await repository.delete(id);
    if (record.thumbnail) await storage.delete(record.thumbnail.key).catch((error) => console.error(`公開前の作品 ${id} のサムネイルを削除できませんでした`, error));
    result.pendingModels += 1;
  }

  // 作品ごとの今のサムネイルのキー（同じ作品の画像が続くので、作品ごとに1回だけ読む）
  const current = new Map<string, string | null>();
  const currentKeyOf = async (modelId: string) => {
    if (!current.has(modelId)) current.set(modelId, (await repository.findById(modelId))?.thumbnail?.key ?? null);
    return current.get(modelId);
  };
  let cursor: string | undefined;
  let scanned = 0;
  do {
    const page = await storage.list(cursor);
    for (const object of page.objects) {
      scanned += 1;
      if (object.uploaded.getTime() >= before.getTime()) continue;
      if ((await currentKeyOf(modelIdOf(object.key))) === object.key) continue;
      await storage.delete(object.key);
      result.orphanThumbnails += 1;
    }
    cursor = page.cursor;
  } while (cursor && scanned < MAX_OBJECTS_PER_RUN);

  return result;
};
