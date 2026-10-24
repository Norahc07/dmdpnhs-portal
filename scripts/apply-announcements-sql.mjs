import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const sql = readFileSync(path.join(root, "supabase", "announcements.sql"), "utf8");
const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const endpoints = [
  `${url}/pg/query`,
  `${url}/postgres/v1/query`,
];

let applied = false;
for (const endpoint of endpoints) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await response.text();
  console.log("SQL endpoint", response.status);
  if (response.ok) {
    applied = true;
    break;
  }
  if (response.status !== 404) {
    console.log(text.slice(0, 400));
  }
}

const bucket = await admin.storage.createBucket("announcement-files", {
  public: true,
  fileSizeLimit: 5242880,
  allowedMimeTypes: [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
});
if (bucket.error && !/already exists/i.test(bucket.error.message)) {
  console.log("Bucket:", bucket.error.message);
} else {
  console.log("Storage bucket ready");
}

const probe = await admin.from("announcements").select("id").limit(1);
if (probe.error) {
  console.log("Tables not applied yet:", probe.error.message);
  if (!applied) process.exit(2);
} else {
  console.log("Announcements table ready");
}
