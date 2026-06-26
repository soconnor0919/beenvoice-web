/**
 * Ensures every drizzle/*.sql migration file has a matching entry in meta/_journal.json.
 * Run: bun scripts/verify-drizzle-journal.ts
 */
import { readdirSync, readFileSync } from "fs";
import path from "path";

const drizzleDir = path.resolve(import.meta.dir, "../drizzle");
const journalPath = path.join(drizzleDir, "meta/_journal.json");

const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
  entries: Array<{ idx: number; tag: string }>;
};

const sqlTags = readdirSync(drizzleDir)
  .filter((name) => /^\d+_.+\.sql$/.test(name))
  .map((name) => name.replace(/\.sql$/, ""))
  .sort();

const journalTags = journal.entries.map((entry) => entry.tag).sort();

const missingFromJournal = sqlTags.filter((tag) => !journalTags.includes(tag));
const missingSql = journalTags.filter((tag) => !sqlTags.includes(tag));

const idxSequence = journal.entries.map((entry) => entry.idx);
const expectedIdx = journal.entries.map((_, i) => i);
const badIdx = idxSequence.some((idx, i) => idx !== expectedIdx[i]);

let failed = false;

if (missingFromJournal.length > 0) {
  console.error("[verify-drizzle-journal] SQL files missing from journal:");
  for (const tag of missingFromJournal) console.error(`  - ${tag}`);
  failed = true;
}

if (missingSql.length > 0) {
  console.error("[verify-drizzle-journal] Journal entries without SQL files:");
  for (const tag of missingSql) console.error(`  - ${tag}`);
  failed = true;
}

if (badIdx) {
  console.error("[verify-drizzle-journal] Journal idx values are not sequential from 0");
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log(
  `[verify-drizzle-journal] OK — ${sqlTags.length} migrations match journal entries`,
);
