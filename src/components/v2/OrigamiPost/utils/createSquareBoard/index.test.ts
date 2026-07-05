import { describe, it, expect } from "vitest";
import { createSquareBoard } from "./index";

describe("createSquareBoard", () => {
  it("原点中心・指定サイズの正方形の4頂点を返す", () => {
    const board = createSquareBoard(100);

    expect(board).toHaveLength(4);
    expect(board[0].toArray()).toEqual([-50, -50, 0]);
    expect(board[1].toArray()).toEqual([50, -50, 0]);
    expect(board[2].toArray()).toEqual([50, 50, 0]);
    expect(board[3].toArray()).toEqual([-50, 50, 0]);
  });

  it("すべての頂点がZ=0のXY平面上にある", () => {
    const board = createSquareBoard(30);

    board.forEach((vertex) => expect(vertex.z).toBe(0));
  });
});
