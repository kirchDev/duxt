import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { claimNuxtProcess } from '../../../scripts/nuxt-process-guard.ts';

claimNuxtProcess(process.argv[2]!, process.argv[3]!);
writeFileSync(join(process.argv[2]!, 'mutated'), process.argv[3]!);
console.log('ready');
setInterval(() => {}, 1000);
