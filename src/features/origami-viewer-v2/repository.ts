import type { OrigamiModelV2 } from "./model";
import { craneProcedure } from "./mocks/crane";

export const DEFAULT_ORIGAMI_V2_ID = "crane";

const models: OrigamiModelV2[] = [
  {
    id: DEFAULT_ORIGAMI_V2_ID,
    name: "鶴",
    description: "開いて畳む、花弁折り、中割り折りを使って、鶴を折ってみましょう。",
    color: "#ed7070",
    procedure: craneProcedure,
    stepDescriptions: [
      "対角線に沿って半分に折ります。",
      "もう一度半分に折ります。",
      "表側の袋を開いて、平らに畳みます。",
      "裏側の袋も開いて、平らに畳みます。",
      "先端を持ち上げ、左右を内側に畳みます。",
      "反対側も同じように花弁折りをします。",
      "右側の縁を中心に向かって折ります。",
      "左側の縁も中心に向かって折ります。",
      "裏側の右の縁も、中心に向かって折ります。",
      "裏側の左の縁も、中心に向かって折ります。",
      "中割り折りで、首を起こします。",
      "もう一方の先端も中割り折りで起こし、尾を作ります。",
      "首の先端を中割り折りして、頭を作ります。",
      "表側の羽を150度折り下げます。",
      "裏側の羽も150度折り下げて、完成です。",
    ],
  },
  {
    id: "blank-paper", name: "折る前の紙", description: "折り手順がまだない作品です。", color: "#7898db",
    procedure: { version: 2, size: 100, steps: [], history: [], finalBoards: [{ polygon: [[-50,-50,0],[50,-50,0],[50,50,0],[-50,50,0]], layer: 0 }] },
  },
];

export const getOrigamiV2 = async (id: string): Promise<OrigamiModelV2 | null> =>
  models.find((model) => model.id === id) ?? null;
