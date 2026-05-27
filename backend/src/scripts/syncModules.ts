import 'dotenv/config';
import axios from 'axios';
import prisma from '../lib/prisma';

const ACADEMIC_YEAR = '2025-2026';
const BASE_URL = `https://api.nusmods.com/v2/${ACADEMIC_YEAR}`;

async function syncModules() {
  console.log('Fetching module list from NUSMods...');

  // Step 1: fetch the full list of modules
  const { data: moduleList } = await axios.get(`${BASE_URL}/moduleList.json`);
  console.log(`Found ${moduleList.length} modules`);

  let saved = 0;
  let failed = 0;

  // Step 2: fetch full details for each module and save to DB
  for (const mod of moduleList) {
    try {
      const { data } = await axios.get(`${BASE_URL}/modules/${mod.moduleCode}.json`);

      // figure out which semesters it's offered in
      const semesters = data.semesterData?.map((s: any) => s.semester) ?? [];

      await prisma.module.upsert({
        where: { moduleCode: data.moduleCode },
        update: {
          title: data.title,
          credits: parseInt(data.moduleCredit),
          description: data.description ?? null,
          prerequisite: data.prerequisite ?? null,
          semesters,
        },
        create: {
          moduleCode: data.moduleCode,
          title: data.title,
          credits: parseInt(data.moduleCredit),
          description: data.description ?? null,
          prerequisite: data.prerequisite ?? null,
          semesters,
        }
      });

      saved++;
      if (saved % 100 === 0) console.log(`Saved ${saved} modules...`);

    } catch (err) {
      failed++;
    }
  }

  console.log(`Done. Saved: ${saved}, Failed: ${failed}`);
  await prisma.$disconnect();
}

syncModules();