import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = join(scriptDir, "..");
const frontend = join(root, "apps", "frontend");
const backend = join(root, "apps", "backend");
const restoreCommit = "b240eb5";

function ensureParentDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function restoreFromGit(gitPath, target) {
  if (existsSync(target)) {
    return true;
  }

  const result = spawnSync(
    "git",
    ["-C", root, "show", `${restoreCommit}:${gitPath}`],
    {
      encoding: "buffer",
      stdio: ["ignore", "pipe", "ignore"],
    }
  );

  if (result.status === 0) {
    ensureParentDir(target);
    writeFileSync(target, result.stdout);
    console.log(`Restored ${target.split(/[\\/]/).pop()} from git history`);
    return true;
  }

  return false;
}

function copyIfMissing(target, template) {
  if (existsSync(target)) {
    return;
  }

  ensureParentDir(target);
  copyFileSync(template, target);
  console.log(
    `Created ${target.split(/[\\/]/).pop()} from ${template
      .split(/[\\/]/)
      .pop()} - add your real Firebase config`
  );
}

restoreFromGit(
  "apps/frontend/src/lib/firebase.ts",
  join(frontend, "src", "lib", "firebase.ts")
) ||
  copyIfMissing(
    join(frontend, "src", "lib", "firebase.ts"),
    join(frontend, "src", "lib", "firebase.example.ts")
  );

restoreFromGit(
  "apps/frontend/google-services.json",
  join(frontend, "google-services.json")
) ||
  copyIfMissing(
    join(frontend, "google-services.json"),
    join(frontend, "google-services.json.example")
  );

restoreFromGit(".firebaserc", join(root, ".firebaserc")) ||
  copyIfMissing(join(root, ".firebaserc"), join(root, ".firebaserc.example"));

copyIfMissing(join(backend, ".env"), join(backend, ".env.example"));

if (!existsSync(join(backend, "src", "config", "serviceAccount.json"))) {
  console.log(
    "Missing apps/backend/src/config/serviceAccount.json - download from Firebase Console."
  );
}

console.log("Local config check done.");
