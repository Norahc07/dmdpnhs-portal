import { rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const targets = [".next", "node_modules/.cache"];

function removeDir(dir) {
  const path = join(process.cwd(), dir);
  if (!existsSync(path)) return false;

  console.log(`Removing ${dir}...`);
  try {
    rmSync(path, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch {
    // Windows often needs cmd rmdir when files are briefly locked.
    if (process.platform === "win32") {
      execSync(`cmd /c rmdir /s /q "${path}"`, { stdio: "ignore" });
    } else {
      throw new Error(`Could not remove ${dir}`);
    }
  }

  if (existsSync(path)) {
    throw new Error(
      `Could not fully remove ${dir}. Stop "npm run dev" and try again.`
    );
  }
  return true;
}

for (const dir of targets) {
  removeDir(dir);
}

console.log("Cache cleared.");
