import { PrismaClient } from "../generated/prisma/index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const user = await prisma.user.create({
    data: {
      name: "Ori Duel",
      email: "ori-duel@gmail.com",
      avatarUrl:
        "https://kotonohaworks.com/free-icons/wp-content/uploads/kkrn_icon_user_1.png",
    },
  });

  const baseModels = [
    {
      name: "トラック",
      color: "yellow",
      imageUrl:
        "https://pub-2a912ed59cc94e139be4a2d207f42e8f.r2.dev/origami/images/0f1bbba5-f9c2-40ff-afb5-10b002e4cc49.png",
      searchKeyword: ["とらっく", "トラック", "track"],
    },
    {
      name: "よっと",
      color: "blue",
      imageUrl:
        "https://pub-2a912ed59cc94e139be4a2d207f42e8f.r2.dev/origami/images/31f49135-dc44-4a5e-accd-7c948ecde5fa.png",
      searchKeyword: ["よっと", "bort", "ヨット"],
    },
  ];

  const models = baseModels.map((m) => {
    const filePath = path.resolve(__dirname, "./mock", `${m.name}.json`);
    const json = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return { ...m, procedure: json };
  });

  for (const m of models) {
    await prisma.model.create({
      data: {
        userId: user.id,
        name: m.name,
        color: m.color,
        imageUrl: m.imageUrl,
        searchKeyword: m.searchKeyword,
        procedure: m.procedure,
      },
    });
  }

  console.log("✅ Seed data with JSON procedures inserted!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
