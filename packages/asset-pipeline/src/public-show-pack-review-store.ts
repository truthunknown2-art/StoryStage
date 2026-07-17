import {randomUUID} from "node:crypto";
import {dirname} from "node:path";
import {link, lstat, mkdir, readFile, unlink, writeFile} from "node:fs/promises";
import {
  hashCanonical,
  publicShowPackReviewRecordSchema,
  verifyPublicShowPackReviewRecordHash,
  type PublicShowPackReviewRecord,
} from "@storystage/story-engine";

export type PublicShowPackReviewStoreCheckpoint = "temporary-written" | "published";

export async function readPublicShowPackReviewRecord(file: string): Promise<PublicShowPackReviewRecord | null> {
  try {
    const info = await lstat(file);
    if (info.isSymbolicLink() || !info.isFile() || info.size > 2_000_000) throw new Error("The private Show Pack review record is unsafe.");
    const parsed = publicShowPackReviewRecordSchema.parse(JSON.parse(await readFile(file, "utf8")));
    if (!verifyPublicShowPackReviewRecordHash(parsed)) throw new Error("The private Show Pack review record failed its content hash.");
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function persistPublicShowPackReviewRecord(input: {file: string; record: PublicShowPackReviewRecord; onCheckpoint?: (checkpoint: PublicShowPackReviewStoreCheckpoint) => Promise<void> | void}): Promise<void> {
  const record = publicShowPackReviewRecordSchema.parse(input.record);
  if (!verifyPublicShowPackReviewRecordHash(record)) throw new Error("The Show Pack review record failed its content hash.");
  const bytes = Buffer.from(`${JSON.stringify(record, null, 2)}\n`, "utf8");
  await mkdir(dirname(input.file), {recursive: true});
  const temporaryFile = `${input.file}.${randomUUID()}.tmp`;
  await writeFile(temporaryFile, bytes, {encoding: "utf8", mode: 0o600, flag: "wx"});
  try {
    await input.onCheckpoint?.("temporary-written");
    try {
      await link(temporaryFile, input.file);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const existing = await readPublicShowPackReviewRecord(input.file);
      if (!existing || hashCanonical(existing) !== hashCanonical(record)) throw new Error("This production already has a different or invalid final review for the packaged candidate.");
    }
    await input.onCheckpoint?.("published");
  } finally {
    await unlink(temporaryFile).catch(() => undefined);
  }
  const published = await readPublicShowPackReviewRecord(input.file);
  if (!published || hashCanonical(published) !== hashCanonical(record)) throw new Error("The published Show Pack review record did not match the final decision.");
}
