"use server";

import { db } from "@/lib/db";

export async function createUser(
  name: string,
  email: string,
  avatarUrl: string
) {
  return await db.user.create({
    data: {
      name,
      email,
      avatarUrl,
    },
  });
}

export async function getUserFromId(id: string) {
  return await db.user.findFirst({
    where: {
      id: id,
    },
  });
}

// Emailで検索したいユースケースがあるかも，と考え作成．
export async function getUserFromEmail(email: string) {
  return await db.user.findFirst({
    where: {
      email: email,
    },
  });
}

export async function deleteUser(id: string) {
  return await db.user.delete({
    where: {
      id: id,
    },
  });
}
