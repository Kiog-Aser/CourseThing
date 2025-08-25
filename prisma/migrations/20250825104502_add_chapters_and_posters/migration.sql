/*
  Warnings:

  - A unique constraint covering the columns `[courseId,slug,chapterId]` on the table `Lesson` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Lesson_courseId_slug_key";

-- AlterTable
ALTER TABLE "public"."Course" ADD COLUMN     "poster" TEXT;

-- AlterTable
ALTER TABLE "public"."Lesson" ADD COLUMN     "chapterId" TEXT,
ALTER COLUMN "courseId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."Chapter" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "poster" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "courseId" TEXT NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Chapter_courseId_order_idx" ON "public"."Chapter"("courseId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_courseId_slug_key" ON "public"."Chapter"("courseId", "slug");

-- CreateIndex
CREATE INDEX "Lesson_chapterId_order_idx" ON "public"."Lesson"("chapterId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_courseId_slug_chapterId_key" ON "public"."Lesson"("courseId", "slug", "chapterId");

-- AddForeignKey
ALTER TABLE "public"."Chapter" ADD CONSTRAINT "Chapter_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lesson" ADD CONSTRAINT "Lesson_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "public"."Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
