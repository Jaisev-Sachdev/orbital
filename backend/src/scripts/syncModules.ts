import 'dotenv/config';
import axios from 'axios';
import prisma from '../lib/prisma';

const ACADEMIC_YEAR = process.env.NUSMODS_ACADEMIC_YEAR ?? '2025-2026';
const BASE_URL = `https://api.nusmods.com/v2/${ACADEMIC_YEAR}`;
const CONCURRENCY = 10;

async function syncModules() {
  console.log(`Fetching module list from NUSMods (${ACADEMIC_YEAR})...`);

  let saved = 0;
  let failed = 0;

  let moduleList: any[];
  try {
    const { data } = await axios.get(`${BASE_URL}/moduleList.json`);
    moduleList = data;
    console.log(`Found ${moduleList.length} modules`);
  } catch (err) {
    console.error('Failed to fetch module list from NUSMods:', err);
    process.exitCode = 1;
    return;
  }

  try {
    // Process modules in batches to avoid sequential N+1 HTTP requests
    for (let i = 0; i < moduleList.length; i += CONCURRENCY) {
      const batch = moduleList.slice(i, i + CONCURRENCY);

      await Promise.all(batch.map(async (mod) => {
        const moduleCode = String((mod as any)?.moduleCode ?? '').toUpperCase().trim();

        try {
          const { data } = await axios.get(`${BASE_URL}/modules/${moduleCode}.json`);

          const semesters = Array.isArray(data.semesterData)
            ? data.semesterData.map((s: any) => s.semester)
            : [];

          const credits = Number.parseInt(String(data.moduleCredit), 10);
          if (!Number.isFinite(credits)) {
            throw new Error(`Invalid moduleCredit: ${data.moduleCredit}`);
          }

          // NUSMods workload is [lecture, tutorial, lab, project, prep]
          let workload: number[] = [];
          if (Array.isArray(data.workload)) {
            workload = data.workload.map((w: any) => {
              const n = Number(w);
              return Number.isFinite(n) ? n : 0;
            });
          }

          await prisma.module.upsert({
            where: { moduleCode: data.moduleCode },
            update: {
              title: data.title,
              credits,
              description: data.description ?? null,
              prerequisite: data.prerequisite ?? null,
              semesters,
              workload,
            },
            create: {
              moduleCode: data.moduleCode,
              title: data.title,
              credits,
              description: data.description ?? null,
              prerequisite: data.prerequisite ?? null,
              semesters,
              workload,
            }
          });

          saved++;
          if (saved % 100 === 0) console.log(`Saved ${saved} modules...`);
        } catch (err) {
          failed++;
          console.warn(`Failed to sync module ${moduleCode || '(unknown)'}:`, err);
        }
      }));
    }

    console.log(`Done. Saved: ${saved}, Failed: ${failed}`);
  } finally {
    await prisma.$disconnect();
  }
}

syncModules().catch((err) => {
  console.error('syncModules failed:', err);
  process.exitCode = 1;
});
