import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { getAllModels, getModelFromId, createModel } from "@/actions/model";
import { getUserFromEmail } from "@/actions/user";
import { Model, ModelSchema } from "@/contract/model.schema";
import { toViewModel, formatAnyError } from "@/server/db/guards";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const id = url.searchParams.get("id");

    if (id) {
      const model = await getModelFromId(id);
      if (!model) {
        return new Response(JSON.stringify({ message: "Not Found" }), {
          status: 404,
          headers: corsHeaders,
        });
      }

      try {
        // Zod検証を使用して型安全に変換
        const viewModel = toViewModel(model);
        return new Response(JSON.stringify(viewModel), {
          headers: corsHeaders,
          status: 200,
        });
      } catch (error) {
        console.error("Model validation error:", error);
        return new Response(JSON.stringify(formatAnyError(error)), {
          status: 500,
          headers: corsHeaders,
        });
      }
    } else {
      const models = await getAllModels();
      if (!models.length) {
        return new Response(JSON.stringify({ message: "Not Found" }), {
          status: 404,
          headers: corsHeaders,
        });
      }

      try {
        // Zod検証を使用して型安全に変換
        const viewModels = models.map((model) => toViewModel(model));
        return new Response(JSON.stringify(viewModels), {
          headers: corsHeaders,
        });
      } catch (error) {
        console.error("Models validation error:", error);
        return new Response(JSON.stringify(formatAnyError(error)), {
          status: 500,
          headers: corsHeaders,
        });
      }
    }
  } catch (error) {
    console.error("GET /api/data error:", error);
    return new Response(JSON.stringify(formatAnyError(error)), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

export async function POST(req: NextRequest) {
  const s3 = new S3Client({
    region: process.env.S3_REGION,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    },
  });
  const formData = await req.formData();

  // フィールドの取得
  const mail = formData.get("mail") as string;
  const modelJson = formData.get("model") as string;
  const image = formData.get("image") as File;

  let model: Model;
  try {
    // JSON文字列をパースしてZod検証
    const parsedModel = JSON.parse(modelJson);
    model = ModelSchema.parse(parsedModel);
  } catch (error) {
    console.error("Model parsing/validation error:", error);
    return NextResponse.json(formatAnyError(error), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const arrayBuffer = await image.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const imageKey = `${model.id}.png`;
  const imageUrl = `${process.env.S3_BUCKET_URL}/${imageKey}`;

  try {
    const user = await getUserFromEmail(mail);
    if (!user) {
      return NextResponse.json(
        { message: "ユーザーが見つかりません。" },
        { status: 404, headers: corsHeaders }
      );
    }
    await createModel({
      userId: user.id,
      name: model.name,
      color: model.color,
      imageUrl: imageUrl,
      searchKeyword: model.searchKeyword,
      procedure: model.procedure,
    });

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: imageKey,
        Body: buffer,
        ContentType: "image/png",
      })
    );
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      {
        message: "アップロードに失敗しました。",
      },
      { status: 500, headers: corsHeaders }
    );
  }

  return NextResponse.json({
    message: "アップロードに成功しました。",
    url: "",
  });
}
