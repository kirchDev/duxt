/**
 * The collection, as the ZIP a reader downloads.
 *
 * THE CANONICAL ACQUISITION ROUTE, and the reason it exists: the pages are a
 * reference, and a Bruno collection is a thing you OPEN. A reader who wants the
 * requests wants the files, at the exact version and locale the page they are
 * reading was built from — which a link to the repository's default branch
 * cannot give them and a "Fetch in Bruno" link, which clones whatever HEAD is
 * today, cannot either.
 *
 * WRITTEN BY HAND, and the ~90 lines are the point. A ZIP with no compression
 * is a header, the bytes, and a table saying where each one started; the three
 * archivers that would have supplied it are all a dependency this layer's
 * consumers would carry into every build, for a file that is already a tree of
 * small text files where compression buys a few kilobytes. The repository's own
 * rule about a heavy browser dependency says the same thing one level up.
 *
 * STORED, NOT DEFLATED, for that reason: method 0 needs no compressor at all,
 * and `unzip`, macOS Archive Utility, Windows Explorer and Bruno's own import
 * all read it.
 *
 * DETERMINISTIC. Every timestamp is the DOS epoch rather than "now", so a site
 * that rebuilds nightly does not publish a new download for a collection nobody
 * changed — the archive is a function of the files, and of nothing else.
 */
import type { DuxtSectionInput } from './sections-resolve';
import { BRUNO_UNPUBLISHED } from './bruno-parse';

/** One file in the archive. */
export interface DuxtZipEntry {
  /** The path inside the archive, `/`-separated. */
  name: string;
  data: string;
}

/**
 * Where a section's archive is served.
 *
 * By COLLECTION rather than by prefix: two languages deliberately claim one
 * prefix, so a prefix names two archives and would serve the wrong one to the
 * second. The collection name is unique per version and per locale, and both
 * the type writing the link and the module emitting the file compute it from
 * here so the two cannot drift.
 */
export function brunoZipPath(collection: string): string {
  return `${DUXT_BRUNO_ASSETS}/${brunoZipName(collection)}`;
}

/**
 * The directory the archives are served from.
 *
 * Exported because the module that WRITES them needs the same two halves the
 * page's link is built from. Composed rather than spelled out twice: the two
 * agreeing by coincidence is how a download 404s after somebody renames one.
 */
export const DUXT_BRUNO_ASSETS = '/_duxt/bruno';

/** One archive's file name inside that directory. */
export function brunoZipName(collection: string): string {
  return `${collection}.zip`;
}

/**
 * The files of the collection that are published, in order.
 *
 * `environments/` is left out, and that is not a default a consumer can turn
 * off. An environment file is where a Bruno collection keeps its hosts, tokens
 * and keys — the real one in the wild that this type was written against has
 * `JWT_SECRET` in it — and this archive is served on the open web. The pages
 * already refuse to read one; an archive that shipped it would be the same leak
 * by the other route.
 */
export function brunoZipEntries(input: DuxtSectionInput): DuxtZipEntry[] {
  return input
    .files()
    .filter((file) => !file.startsWith(`${BRUNO_UNPUBLISHED}/`))
    .map((file) => ({ name: file, data: input.read(file) }));
}

/** The archive, as bytes. */
export function zipStore(entries: DuxtZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const central: Uint8Array[] = [];

  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const data = encoder.encode(entry.data);
    const crc = crc32(data);

    const local = new Uint8Array(30 + name.length);
    const view = new DataView(local.buffer);

    view.setUint32(0, 0x04034b50, true); // local file header
    view.setUint16(4, 20, true); // version needed — 2.0, stored
    view.setUint16(6, 0x0800, true); // the name is UTF-8
    view.setUint16(8, 0, true); // method 0: stored
    view.setUint16(10, 0, true); // time — the DOS epoch, see the file header
    view.setUint16(12, 0x0021, true); // date — 1980-01-01
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, name.length, true);
    view.setUint16(28, 0, true); // no extra field

    local.set(name, 30);
    locals.push(local, data);

    const record = new Uint8Array(46 + name.length);
    const entryView = new DataView(record.buffer);

    entryView.setUint32(0, 0x02014b50, true); // central directory header
    entryView.setUint16(4, 20, true); // version made by
    entryView.setUint16(6, 20, true); // version needed
    entryView.setUint16(8, 0x0800, true);
    entryView.setUint16(10, 0, true);
    entryView.setUint16(12, 0, true);
    entryView.setUint16(14, 0x0021, true);
    entryView.setUint32(16, crc, true);
    entryView.setUint32(20, data.length, true);
    entryView.setUint32(24, data.length, true);
    entryView.setUint16(28, name.length, true);
    entryView.setUint16(30, 0, true); // extra
    entryView.setUint16(32, 0, true); // comment
    entryView.setUint16(34, 0, true); // disk number
    entryView.setUint16(36, 0, true); // internal attributes
    entryView.setUint32(38, 0o100644 << 16, true); // external: a regular file
    entryView.setUint32(42, offset, true);

    record.set(name, 46);
    central.push(record);

    offset += local.length + data.length;
  }

  const directory = concat(central);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);

  endView.setUint32(0, 0x06054b50, true); // end of central directory
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, directory.length, true);
  endView.setUint32(16, offset, true);

  return concat([...locals, directory, end]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);

  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }

  return out;
}

/**
 * The table, built once.
 *
 * A ZIP entry carries a CRC-32 of its own contents and readers check it, so
 * this is not optional — an archive with a wrong one extracts with a warning in
 * the best case and is refused in the worst.
 */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index++) {
    let value = index;

    for (let bit = 0; bit < 8; bit++) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[index] = value >>> 0;
  }

  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}
