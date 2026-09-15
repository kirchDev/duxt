import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

// Keep the transaction alive across config reloads in the same Nuxt worker.
const registry = globalThis as typeof globalThis & {
  duxtNuxtOwners?: Map<string, DatabaseSync>;
};
const ownerRootEnv = 'DUXT_NUXT_OWNER_ROOT';
const ownerPidEnv = 'DUXT_NUXT_OWNER_PID';

function isOwnerFork(root: string, ownerFile: string): boolean {
  if (process.env[ownerRootEnv] !== root) return false;
  const ownerPid = Number(process.env[ownerPidEnv]);
  if (!Number.isSafeInteger(ownerPid) || ownerPid !== process.ppid)
    return false;
  try {
    const owner = JSON.parse(readFileSync(ownerFile, 'utf8')) as {
      pid?: number;
    };
    return owner.pid === ownerPid;
  } catch {
    return false;
  }
}

function conflict(root: string, command: string, owner: string): Error {
  return new Error(
    `Cannot start ${command}: ${owner} owns ${root}. Stop that process before retrying. ` +
      'Do not delete its .data, database/WAL files or Nuxt build directory.'
  );
}

function checkLegacyLock(root: string, command: string): void {
  const filename = join(root, 'node_modules/.cache/nuxt/.nuxt/nuxt.lock');
  let info: { pid: number; command: string };
  try {
    info = JSON.parse(readFileSync(filename, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw new Error(
      `Cannot verify Nuxt lock ${filename}. Confirm its owner has exited before removing it.`,
      { cause: error }
    );
  }
  if (!Number.isSafeInteger(info.pid) || info.pid <= 0) {
    throw new Error(
      `Cannot verify owner of Nuxt lock ${filename}. Confirm its owner has exited before removing it.`
    );
  }
  if (info.pid === process.pid) return;
  try {
    process.kill(info.pid, 0);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return;
  }
  throw conflict(root, command, `${info.command} (PID ${info.pid})`);
}

/** Claim every mutable artifact of this site before Nuxt loads its modules. */
export function claimNuxtProcess(root: string, command: string): void {
  root = realpathSync(root);
  const owners = (registry.duxtNuxtOwners ??= new Map());
  if (owners.has(root)) return;

  const directory = join(root, '.data', 'nuxt-process');
  mkdirSync(directory, { recursive: true });
  const ownerFile = join(directory, 'owner.json');
  // Nuxt dev reloads configuration in direct child processes. They inherit the
  // outer dev process's environment and may use its still-held transaction.
  if (isOwnerFork(root, ownerFile)) return;
  const database = new DatabaseSync(join(directory, 'ownership.sqlite'));
  try {
    // An OS-backed exclusive transaction survives neither exit nor SIGKILL.
    // No lease expiry or unlink race can evict a live owner.
    database.exec('BEGIN EXCLUSIVE');
  } catch (error) {
    database.close();
    if ((error as { errcode?: number }).errcode !== 5) throw error;
    let owner = 'another Nuxt process (startup in progress)';
    try {
      const info = JSON.parse(readFileSync(ownerFile, 'utf8'));
      owner = `${info.command} (PID ${info.pid})`;
    } catch {
      /* The first owner may still be writing its diagnostic. */
    }
    throw conflict(root, command, owner);
  }
  try {
    // Older/unwrapped CLI processes may only have Nuxt's own lock. Its age
    // never proves the PID is dead; Nuxt can reclaim a dead lock itself later.
    checkLegacyLock(root, command);
    writeFileSync(ownerFile, JSON.stringify({ pid: process.pid, command }));
    owners.set(root, database);
    process.env[ownerRootEnv] = root;
    process.env[ownerPidEnv] = String(process.pid);
  } catch (error) {
    database.close();
    throw error;
  }
}
