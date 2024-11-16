import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export interface ChildrenModeRequestBody {
  request_id?: string; // オプショナルフィールド
  sentence: string; // 必須フィールド
  output_type: "hiragana" | "katakana"; // 必須フィールドでリテラル型を使用
}

export async function POST(request: NextRequest) {
  try {
    const body: ChildrenModeRequestBody = await request.json();
    const { request_id, sentence, output_type } = body;

    // 必須パラメータのチェック
    if (!sentence || !output_type) {
      return NextResponse.json(
        { error: "sentence と output_type は必須です。" },
        { status: 400 }
      );
    }

    const app_id = process.env.GOO_APP_ID;
    if (!app_id) {
      return NextResponse.json(
        { error: "サーバー設定エラー: GOO_APP_IDが設定されていません。" },
        { status: 500 }
      );
    }

    // リクエストIDの生成（省略時の形式）
    const generated_request_id: string =
      request_id ||
      `labs.goo.ne.jp\t${new Date().toISOString()}\t${Math.floor(
        Math.random() * 100000
      )}`;

    const payload = {
      app_id,
      request_id: generated_request_id,
      sentence,
      output_type,
    };

    const response = await axios.post(
      "https://labs.goo.ne.jp/api/hiragana",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return NextResponse.json(response.data, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "API呼び出し中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
