import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { getAllModels, getModelsFromId, createModel } from "@/actions/model";
import { getUserFromEmail } from "@/actions/user";
import { Model } from "@/types/model";

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
      const models = await getModelsFromId(id);
      const procedures = models.map((m) => m.procedure);
      return new Response(JSON.stringify(procedures[0] ?? null), {
        headers: corsHeaders,
        status: procedures.length > 0 ? 200 : 404,
      });
    } else {
      const models = await getAllModels();
      const procedures = models.map((m) => m.procedure);
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
  // TODO: envを変更する
  const s3 = new S3Client({
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT,
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

  // TODO: ここはS3の仕様に沿ったものにする．
  const imageKey = `origami/images/${model.id}.png`;
  const imageUrl = `${process.env.S3_BUCKET_URL}/${imageKey}`;
  try {
    const user = await getUserFromEmail(mail);
    if (!user) return;
    await createModel({
      userId: user?.id,
      name: model.name,
      color: model.color,
      imageUrl: imageUrl,
      searchKeyword: model.searchKeyword,
      procedure: model.procedure,
    });

    await s3.send(
      new PutObjectCommand({
        Bucket: "ori-cube",
        Key: imageKey,
        Body: buffer,
        ContentType: "image/png",
        ACL: "public-read",
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
