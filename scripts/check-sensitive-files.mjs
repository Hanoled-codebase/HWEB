import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const repositoryRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();
const repositoryFiles = execFileSync(
  "git",
  ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
  {
    cwd: repositoryRoot,
    encoding: "utf8",
  },
).split("\0").filter(Boolean);

const forbiddenPaths = [
  { rule: "database backup directory", pattern: /(^|\/)db-backups?\//i },
  { rule: "BSON database export", pattern: /\.bson(?:\.|$)/i },
  { rule: "credential directory", pattern: /credentials?_directory/i },
  { rule: "account directory PDF", pattern: /accounts?_directory\.pdf$/i },
  { rule: "public generated export", pattern: /(^|\/)public\/exports\/.+$/i },
  { rule: "public generated upload", pattern: /(^|\/)public\/uploads\/.+$/i },
  { rule: "database dump", pattern: /\.(?:dump|sql\.dump)$/i },
  { rule: "private key container", pattern: /\.(?:key|p12|pfx)$/i },
  // e.g. an Edge appliance's edge.db, which stores its private keys.
  { rule: "SQLite database", pattern: /\.(?:db|sqlite3?)(?:-(?:shm|wal|journal))?$/i },
];

const forbiddenContent = [
  { rule: "private key material", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  {
    rule: "hard-coded authentication secret",
    pattern: /(?:JWT_SECRET|JWT_REFRESH_SECRET|ADMIN_JWT_SECRET|SERVICE_API_KEY|OFFLINE_LEASE_SECRET|OFFLINE_RECEIPT_SECRET)\s*(?:=|:)\s*["'][^"']{8,}["']/,
  },
];

const textExtensions = new Set([
  ".cjs", ".env", ".js", ".json", ".jsx", ".mjs", ".prisma", ".sh",
  ".ts", ".tsx", ".yaml", ".yml",
]);
const findings = [];

for (const file of repositoryFiles) {
  const absolutePath = join(repositoryRoot, file);
  // A deletion in the current change is already contained. Once committed,
  // it will disappear from `git ls-files` entirely.
  if (!existsSync(absolutePath)) continue;

  for (const check of forbiddenPaths) {
    if (check.pattern.test(file)) findings.push(`${file}: ${check.rule}`);
  }

  if (
    file.endsWith(".env.example") ||
    /(^|\/)(?:__tests__|tests?|fixtures?)\//i.test(file) ||
    file.endsWith("package-lock.json") ||
    file === "scripts/check-sensitive-files.mjs" ||
    !textExtensions.has(extname(file).toLowerCase())
  ) continue;

  if (statSync(absolutePath).size > 2 * 1024 * 1024) continue;
  const content = readFileSync(absolutePath, "utf8");
  for (const check of forbiddenContent) {
    if (check.pattern.test(content)) findings.push(`${file}: ${check.rule}`);
  }
}

if (findings.length > 0) {
  console.error("Sensitive-file scan failed. No secret values are displayed.");
  for (const finding of [...new Set(findings)].sort()) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`Sensitive-file scan passed (${repositoryFiles.length} repository files checked).`);
