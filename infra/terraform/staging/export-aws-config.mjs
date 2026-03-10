import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

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

const targetPath = path.resolve(process.cwd(), "..", "..", "aws", "staging.config.json");
writeFileSync(targetPath, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Wrote ${targetPath}`);
