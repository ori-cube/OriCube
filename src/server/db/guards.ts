import { ProcedureSchema, ModelSchema } from "@/contract/model.schema";
import { ZodError } from "zod";

/**
 * PrismaのJSONカラムからProcedure型を検証・変換する
 * @param json - Prismaから取得したJSONデータ
 * @returns 検証済みのProcedure型データ
 * @throws ZodError - 検証に失敗した場合
 */
export function validateProcedure(json: unknown) {
  return ProcedureSchema.parse(json);
}

/**
 * PrismaのJSONカラムからModel型を検証・変換する
 * @param json - Prismaから取得したJSONデータ
 * @returns 検証済みのModel型データ
 * @throws ZodError - 検証に失敗した場合
 */
export function validateModel(json: unknown) {
  return ModelSchema.parse(json);
}

/**
 * PrismaのDB行をViewModelに安全に変換する
 * @param dbRow - Prismaから取得したDB行データ．あくまでバリデーションをするためなので，dbRowの型はanyで良い．
 * @returns 検証済みのModel型データ
 * @throws ZodError - 検証に失敗した場合
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toViewModel(dbRow: any) {
  const safe = ModelSchema.parse({
    id: dbRow.id,
    name: dbRow.name,
    color: dbRow.color,
    imageUrl: dbRow.imageUrl,
    searchKeyword: dbRow.searchKeyword ?? [],
    procedure: dbRow.procedure,
  });
  return safe;
}

/**
 * ZodErrorを適切なHTTPエラーレスポンスに変換する（詳細版）
 * @param error - ZodError
 * @returns エラーメッセージと詳細情報
 */
export function formatZodErrorDetailed(error: ZodError) {
  return {
    message: "データの形式が正しくありません",
    details:
      error.issues?.map((err) => ({
        path: err.path.join("."),
        message: err.message,
        code: err.code,
        received: err.input, // 実際に受信した値
      })) || [],
  };
}

/**
 * ZodErrorを適切なHTTPエラーレスポンスに変換する
 * @param error - ZodError
 * @returns エラーメッセージと詳細情報
 */
export function formatZodError(error: ZodError) {
  return {
    message: "データの形式が正しくありません",
    details:
      error.issues?.map((err) => ({
        path: err.path.join("."),
        message: err.message,
        code: err.code,
      })) || [],
  };
}

/**
 * 安全なProcedure検証（エラーを投げずにbooleanを返す）
 * @param json - 検証対象のJSONデータ
 * @returns 検証結果
 */
export function isValidProcedure(json: unknown): boolean {
  try {
    ProcedureSchema.parse(json);
    return true;
  } catch {
    return false;
  }
}

/**
 * 任意のエラーを適切なHTTPエラーレスポンスに変換する
 * @param error - 任意のエラー
 * @returns エラーメッセージと詳細情報
 */
export function formatAnyError(error: unknown) {
  if (error instanceof ZodError) {
    return formatZodErrorDetailed(error);
  }

  if (error instanceof Error) {
    // PrismaClientInitializationErrorの特別処理
    if (error.name === "PrismaClientInitializationError") {
      return {
        message: "データベース接続エラーが発生しました",
        details: [
          {
            path: "database",
            message: error.message,
            code: "prisma_initialization_error",
          },
        ],
      };
    }

    return {
      message: "サーバーエラーが発生しました",
      details: [
        {
          path: "server",
          message: error.message,
          code: "server_error",
          stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        },
      ],
    };
  }

  return {
    message: "不明なエラーが発生しました",
    details: [
      {
        path: "unknown",
        message: String(error),
        code: "unknown_error",
      },
    ],
  };
}
