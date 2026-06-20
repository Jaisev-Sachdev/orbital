import 'dotenv/config';
import prisma from '../lib/prisma';

async function main() {
  // CS modules specifically, since that's what the parser needs to handle for grad requirements
  const csModules = await prisma.module.findMany({
    where: {
      moduleCode: { startsWith: 'CS' },
      prerequisite: { not: null }
    },
    select: { moduleCode: true, prerequisite: true },
    orderBy: { moduleCode: 'asc' }
  });

  const nonEmpty = csModules.filter(m => m.prerequisite && m.prerequisite.trim() !== '');

  console.log(`Total CS modules with non-null prerequisite: ${nonEmpty.length}\n`);

  // Print a spread: shortest, longest, and a random sample
  const sorted = [...nonEmpty].sort((a, b) => (a.prerequisite!.length - b.prerequisite!.length));

  console.log('=== 10 SHORTEST ===');
  for (const m of sorted.slice(0, 10)) {
    console.log(`${m.moduleCode}: ${JSON.stringify(m.prerequisite)}`);
  }

  console.log('\n=== 10 LONGEST ===');
  for (const m of sorted.slice(-10)) {
    console.log(`${m.moduleCode}: ${JSON.stringify(m.prerequisite)}`);
  }

  console.log('\n=== 15 RANDOM SAMPLE ===');
  const shuffled = [...nonEmpty].sort(() => Math.random() - 0.5);
  for (const m of shuffled.slice(0, 15)) {
    console.log(`${m.moduleCode}: ${JSON.stringify(m.prerequisite)}`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exitCode = 1;
});
