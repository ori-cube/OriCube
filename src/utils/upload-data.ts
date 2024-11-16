import axios from "axios";
import { Session } from "next-auth";
import { v4 as createUuid } from "uuid";
import { Model } from "@/types/model";

const touchData = (
  data: Model,
  uuid: string,
  mail: string | null | undefined
) => {
  if (!mail) return;
  data["id"] = uuid;
  data["searchKeyword"] = [data.name];
  data[
    "imageUrl"
  ] = `${process.env.NEXT_PUBLIC_R2_BUCKET_URL}/origami/images/${uuid}.png`;
  return data;
};

export const insertData = async (
  image: File,
  session: Session | null,
  data: Model
) => {
  const uuid = createUuid();
  if (!session) {
    console.log("ログインしてください");
  } else {
    const fixedData = touchData(data, uuid, session.user?.email);

    const jsonData = JSON.stringify(fixedData);
    const formData = new FormData();
    formData.append("mail", session.user?.email || "");
    formData.append("id", uuid);
    formData.append("data", jsonData); // 必要に応じて JSON 文字列に変換
    formData.append("image", image); // image は File オブジェクト
    await axios.post("/api/data", formData).then(() => {
      console.log("upload完了");
    });
  }
};
