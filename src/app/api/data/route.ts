import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { getAllModels, getModelFromId, createModel } from "@/actions/model";
import { getUserFromEmail } from "@/actions/user";
import { Model, Procedure } from "@/types/model";

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
      // データベースに保存されている形式を，フロントに合わせた．
      const viewModel: Model = {
        id: model.id,
        name: model.name,
        color: model.color,
        imageUrl: model.imageUrl,
        searchKeyword: model.searchKeyword,
        procedure: model.procedure as Procedure,
      };
      return new Response(JSON.stringify(viewModel ?? null), {
        headers: corsHeaders,
        status: 200,
      });
    } else {
      const models = await getAllModels();
      if (!models.length) {
        return new Response(JSON.stringify({ message: "Not Found" }), {
          status: 404,
          headers: corsHeaders,
        });
      }
      const procedures = models.map((model) => {
        // データベースに保存されている形式を，フロントに合わせた．
        const viewModel: Model = {
          id: model.id,
          name: model.name,
          color: model.color,
          imageUrl: model.imageUrl,
          searchKeyword: model.searchKeyword,
          procedure: model.procedure as Procedure,
        };
        return viewModel;
      });
      return new Response(JSON.stringify(procedures), { headers: corsHeaders });
    }
  } catch (error) {
    console.error("GET /api/models error:", error);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), {
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
  const model = JSON.parse(formData.get("model") as string) as Required<Model>;
  const image = formData.get("image") as File;

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
