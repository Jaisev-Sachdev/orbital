-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Plan_shareToken_key" ON "Plan"("shareToken");
