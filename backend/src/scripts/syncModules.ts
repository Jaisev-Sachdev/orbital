import 'dotenv/config';
import axios from 'axios';
import prisma from '../lib/prisma';

const ACADEMIC_YEAR = process.env.NUSMODS_ACADEMIC_YEAR ?? '2025-2026';
const BASE_URL = `https://api.nusmods.com/v2/${ACADEMIC_YEAR}`;

async function syncModules() {
  console.log(`Fetching module list from NUSMods (${ACADEMIC_YEAR})...`);

  let saved = 0;
  let failed = 0;

  try {
    // Step 1: fetch the full list of modules
    const { data: moduleList } = await axios.get(`${BASE_URL}/moduleList.json`);
    console.log(`Found ${moduleList.length} modules`);

    // Step 2: fetch full details for each module and save to DB
    for (const mod of moduleList) {
      const moduleCode = String((mod as any)?.moduleCode ?? '').toUpperCase().trim();

      try {
        const { data } = await axios.get(`${BASE_URL}/modules/${moduleCode}.json`);

        // figure out which semesters it's offered in
        const semesters = Array.isArray(data.semesterData)
          ? data.semesterData.map((s: any) => s.semester)
          : [];

        const credits = Number.parseInt(String(data.moduleCredit), 10);
        if (!Number.isFinite(credits)) {
          throw new Error(`Invalid moduleCredit: ${data.moduleCredit}`);
        }

        await prisma.module.upsert({
          where: { moduleCode: data.moduleCode },
          update: {
            title: data.title,
            credits,
            description: data.description ?? null,
            prerequisite: data.prerequisite ?? null,
            semesters,
          },
          create: {
            moduleCode: data.moduleCode,
            title: data.title,
            credits,
            description: data.description ?? null,
            prerequisite: data.prerequisite ?? null,
            semesters,
          }
        });

        saved++;
        if (saved % 100 === 0) console.log(`Saved ${saved} modules...`);
      } catch (err) {
        failed++;
        console.warn(`Failed to sync module ${moduleCode || '(unknown)'}:` , err);
      }
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