-- CreateTable
CREATE TABLE "Profile" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Model" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "searchKeyword" TEXT[],
    "procedure" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
