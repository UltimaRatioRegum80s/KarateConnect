// ============================================================
// One-time user seeding with HASHED PINs.
// Usage:
//   1. Create exco-members.json (DO NOT COMMIT — gitignore it):
//      [
//        { "name": "Jane Doe", "pin": "S3cret-Pin", "role": "member", "title": "Executive Member" },
//        { "name": "Admin Name", "pin": "Str0ng#Pin", "role": "admin", "title": "President" }
//      ]
//   2. Run: npx tsx server/scripts/seed-users.ts exco-members.json
//   3. Delete the JSON file. Distribute PINs privately.
//
// Re-running updates the PIN hash for existing names (rotation).
// ============================================================
import fs from "fs/promises";
import { eq, sql as dsql } from "drizzle-orm";
import { db } from "../db";
import { users } from "@shared/schema";
import { hashPin } from "../auth";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npx tsx server/scripts/seed-users.ts <members.json>");
    process.exit(1);
  }
  const members: { name: string; pin: string; role?: string; title?: string }[] = JSON.parse(
    await fs.readFile(file, "utf8"),
  );

  for (const m of members) {
    if (!m.name || !m.pin || m.pin.length < 6) {
      console.error(`Skipping ${m.name ?? "?"}: PIN must be at least 6 characters`);
      continue;
    }
    const pinHash = await hashPin(m.pin);
    const [existing] = await db
      .select()
      .from(users)
      .where(dsql`lower(${users.name}) = ${m.name.toLowerCase()}`);

    if (existing) {
      await db
        .update(users)
        .set({ pin: pinHash, role: m.role ?? existing.role, title: m.title ?? existing.title, is_active: true, updatedAt: new Date() })
        .where(eq(users.id, existing.id));
      console.log(`Updated: ${m.name}`);
    } else {
      await db.insert(users).values({
        name: m.name,
        pin: pinHash,
        role: m.role ?? "member",
        title: m.title ?? "Executive Member",
        is_active: true,
      });
      console.log(`Created: ${m.name}`);
    }
  }
  console.log("Done. Delete the JSON file now.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
