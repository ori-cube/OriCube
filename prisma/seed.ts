import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.create({
    data: {
      name: "Ori Duel",
      email: "ori-duel@gmail.com",
      avatarUrl: "https://example.com/avatars/ori-duel.png",
    },
  });

  const models = [
    {
      name: "折り鶴",
      color: "white",
      imageUrl: "https://example.com/models/crane.png",
      searchKeyword: ["origami", "crane", "fold"],
      procedure: {
        title: "鶴",
      },
    },
    {
      name: "船",
      color: "blue",
      imageUrl: "https://example.com/models/boat.png",
      searchKeyword: ["origami", "boat", "fold"],
      procedure: {
        title: "船の折り方",
      },
    },
  ];

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
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
