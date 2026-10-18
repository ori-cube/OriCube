import type { PresentationV2, ProcedureV2 } from "./model-v2";

export interface OrigamiModelV2 {
  id: string;
  name: string;
  description: string;
  color: string;
  procedure: ProcedureV2;
  stepDescriptions?: string[];
  /** 完成形を見せる向き。無ければ折ったときの向きのまま表示する */
  presentation?: PresentationV2;
}
