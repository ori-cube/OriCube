import type { ProcedureV2 } from "@oricube/engine";

export interface OrigamiModelV2 {
  id: string;
  name: string;
  description: string;
  color: string;
  procedure: ProcedureV2;
  stepDescriptions?: string[];
}
