import { createJiti } from "jiti";
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(root, "..");
const src = path.join(projectRoot, "src");

loadEnv({ path: path.join(projectRoot, ".env.local") });
loadEnv({ path: path.join(projectRoot, ".env") });

const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  alias: { "@": src },
});

const { forceUserTestingDemoAccounts } = jiti(
  path.join(src, "lib", "ensure-user-testing-demo.js")
);
const { createAdminClient } = jiti(path.join(src, "lib", "supabase", "admin.js"));

console.log("Forcing User Testing Guide demo accounts…");
const result = await forceUserTestingDemoAccounts();
console.log("Done:", result);

const admin = createAdminClient();
const { data: sample } = await admin
  .from("students")
  .select("lrn, profile_id, activation_status")
  .in("lrn", ["111111111111", "888888888888"]);
console.log("Sample students:", sample);
