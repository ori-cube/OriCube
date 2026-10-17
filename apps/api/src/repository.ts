import { getOrigamiV2 } from "@/features/origami-viewer-v2/repository";

/**
 * 作品の取得元
 *
 * @description
 * 保存契約（#100）が決まるまではモックを返す。DB接続時はこのインターフェースの実装を差し替える。
 * 返す値は未検証として扱い、呼び出し側でスキーマ検証する
 */
export interface OrigamiRepository {
  findById(id: string): Promise<unknown | null>;
}

export const mockOrigamiRepository: OrigamiRepository = {
  findById: getOrigamiV2,
};
