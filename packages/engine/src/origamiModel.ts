import type { ProcedureV2 } from "./model-v2";

export interface OrigamiModelV2 {
  id: string;
  name: string;
  description: string;
  color: string;
  procedure: ProcedureV2;
  stepDescriptions?: string[];
}
