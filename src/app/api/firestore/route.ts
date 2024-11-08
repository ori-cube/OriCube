import { cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import serviceAccount from "../../../../firestore-admin-key.json";
import { restore } from "firestore-export-import";
// import fs from "fs";
import data from "./data.json";

const COLLECTION_NAME = "origami";

// // Firebase初期化
if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount as ServiceAccount), // ここで型を指定
  });
}
const db = getFirestore();
const tmp = {
  name: "data",
  dict: {
    first: 1,
    second: 2,
  },
};

export async function POST(req: Request) {
  // アップロード
  const docRef = db.collection(COLLECTION_NAME).doc();
  docRef.set(tmp);

  return new Response(
    JSON.stringify({ message: "Data inserted successfully" }),
    {
      status: 200,
    }
  );
}
