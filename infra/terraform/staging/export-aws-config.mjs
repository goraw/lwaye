import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputPath = process.argv[2];
if (!outputPath) {
  console.error("Usage: node export-aws-config.mjs <terraform-output-json>");
  process.exit(1);
}

const raw = JSON.parse(readFileSync(path.resolve(process.cwd(), outputPath), "utf8"));
const config = raw.staging_task_config?.value;
if (!config) {
  console.error("Terraform output JSON is missing staging_task_config.value");
  process.exit(1);
}

const targetPath = path.resolve(scriptDirectory, "..", "..", "aws", "staging.config.json");
writeFileSync(targetPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Wrote ${targetPath}`);
