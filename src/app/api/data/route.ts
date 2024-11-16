import {
  PutObjectCommand,
  S3Client,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { streamToBuffer } from "@/utils/stream-to-buffer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(req: NextRequest) {
  /*
  仕様
    "api/data"
      GETを叩くと、折り紙の折り方のJSONをリストに格納したものが返される
      return:
        [
          {Model},
          {Model},
          ...
        ]
    "api/data"{params: {id: number}}
      R2の中から、指定idのデータを一つ取得できる
      return:
        {Model}
  */
  const s3 = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY!,
      secretAccessKey: process.env.R2_SECRET_KEY!,
    },
  });

  const command = new ListObjectsV2Command({ Bucket: "oricube" });

  const response = await s3.send(command);
  const jsonList: object[] = [];
  try {
    if (!req.nextUrl.searchParams.get("id")) {
      // 全てのデータをjson形式で取得する
      if (response.Contents && response.Contents.length > 0) {
        await Promise.all(
          response.Contents?.map(async (item) => {
            if (!(item.Key?.split("/")[1] === "images")) {
              const jsonUrl = `${process.env.R2_BUCKET_URL}/${item.Key}`;
              const jsonFetchData = await fetch(jsonUrl);
              const jsonData = await jsonFetchData.json();
              jsonList.push(jsonData);
            }
          })
        );
      }

      return new Response(JSON.stringify(jsonList), {
        headers: corsHeaders,
      });
    } else {
      const id = req.nextUrl.searchParams.get("id");
      // 指定idのデータをjson形式で取得する
      if (response.Contents && response.Contents.length > 0) {
        await Promise.all(
          response.Contents?.map(async (item) => {
            const title = item.Key?.split("/").pop();
            if (title === id) {
              const jsonUrl = `${process.env.R2_BUCKET_URL}/${item.Key}`;
              const jsonFetchData = await fetch(jsonUrl);
              const jsonData = await jsonFetchData.json();
              jsonList.push(jsonData);
            }
          })
        );
      }
      return new Response(JSON.stringify(jsonList[0]), {
        headers: corsHeaders,
      });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ status: 500 });
  }
}

export async function POST(req: NextRequest) {
  /*
  仕様
    "api/data" POST props: mail: string, id: number, data: string
      引数に与えたdata(Model型)をDBに保存する
      {user mail}/{id}形式でDBに保存される
  */
  const s3 = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY!,
      secretAccessKey: process.env.R2_SECRET_KEY!,
    },
  });
  const formData = await req.formData();

  // フィールドの取得
  const mail = formData.get("mail") as string | null;
  const id = formData.get("id") as string | null;
  const data = formData.get("data") as string | null;
  const image = formData.get("image") as File;
  const buffer = await streamToBuffer(image.stream());
  try {
    const jsonKey = `origami/${mail}/${id}`;
    const imageKey = `origami/images/${id}.png`;
    await s3.send(
      new PutObjectCommand({
        Bucket: "oricube",
        Key: jsonKey,
        Body: data!, // JSONを送信できる形式に変換
        ACL: "public-read",
      })
    );
    await s3.send(
      new PutObjectCommand({
        Bucket: "oricube",
        Key: imageKey,
        Body: buffer,
        ContentType: "image/png",
        ACL: "public-read",
      })
    );

    const uploadedUrl = `${process.env.R2_ENDPOINT}/${jsonKey}`;

    return NextResponse.json({
      message: "アップロードに成功しました。",
      url: uploadedUrl,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      {
        message: "アップロードに失敗しました。",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
