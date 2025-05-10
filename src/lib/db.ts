import { PrismaClient } from "../../generated/prisma";

const prisma: PrismaClient = new PrismaClient();

export const db = prisma;
