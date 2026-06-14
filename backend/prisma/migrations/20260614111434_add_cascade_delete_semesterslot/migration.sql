-- DropForeignKey
ALTER TABLE "SemesterSlot" DROP CONSTRAINT "SemesterSlot_planId_fkey";

-- AddForeignKey
ALTER TABLE "SemesterSlot" ADD CONSTRAINT "SemesterSlot_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
