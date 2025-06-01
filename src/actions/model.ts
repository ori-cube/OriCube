"use server";

import { db } from "@/lib/db";
import { InputJsonValue } from "@prisma/client/runtime/library";

interface ModelProps {
  userId: string;
  name: string;
  color: string;
  imageUrl: string;
  searchKeyword: string[];
  procedure: InputJsonValue;
}

export async function createModel({
  userId,
  name,
  color,
  imageUrl,
  searchKeyword,
  procedure,
}: ModelProps) {
  return await db.model.create({
    data: {
      userId,
      name,
      color,
      imageUrl,
      searchKeyword,
      procedure,
    },
  });
}

export async function getAllModels() {
  return await db.model.findMany();
}

export async function getModelFromId(id: string) {
  return await db.model.findFirst({
    where: {
      id: id,
    },
  });
}

export async function getModelsFromUserId(userId: string) {
  return await db.model.findMany({
    where: {
      userId: userId,
    },
  });
}

export async function deleteModelFromId(id: string) {
  return await db.model.delete({
    where: {
      id: id,
    },
  });
}

// ユーザ単位でモデルを削除したい場合に使用
export async function deleteModelFromUserId(userId: string) {
  return await db.model.deleteMany({
    where: {
      userId: userId,
    },
  });
}
