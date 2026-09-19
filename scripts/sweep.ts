import "dotenv/config";
import { sweepTestUsers } from "../utils/sweep";

// Usage: npm run sweep -- [--dry-run] [--older-than-hours=2]
const dryRun = process.argv.includes("--dry-run");
const hoursArg = process.argv.find((a) => a.startsWith("--older-than-hours="));
const olderThanHours = hoursArg ? Number(hoursArg.split("=")[1]) : 2;

if (!Number.isFinite(olderThanHours) || olderThanHours < 0) {
  console.error("--older-than-hours must be a non-negative number");
  process.exit(1);
}

async function main() {
  const result = await sweepTestUsers({ olderThanHours, dryRun });
  console.log(`Scanned ${result.scanned} users; ${result.matched.length} test users older than ${olderThanHours}h.`);
  for (const u of result.matched) console.log(`  ${dryRun ? "would delete" : "deleted"}  ${u.email}  (created ${u.createdAt})`);
  if (dryRun) console.log("Dry run: nothing was deleted.");
  else console.log(`Deleted ${result.deleted}.`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
