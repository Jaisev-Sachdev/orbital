-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "workload" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
