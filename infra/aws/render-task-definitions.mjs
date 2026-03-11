import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const defaultConfigPath = path.join(rootDirectory, "staging.config.json");
const outputDirectory = path.join(rootDirectory, "generated");

function parseArgs() {
  const args = process.argv.slice(2);
  const configFlagIndex = args.findIndex((arg) => arg === "--config");
  if (configFlagIndex >= 0 && args[configFlagIndex + 1]) {
    return { configPath: path.resolve(process.cwd(), args[configFlagIndex + 1]) };
  }
  return { configPath: defaultConfigPath };
}

function required(value, label) {
  if (!value) {
    throw new Error(`Missing required config value: ${label}`);
  }
  return value;
}

function awsLogs(logGroup, region) {
  return {
    logDriver: "awslogs",
    options: {
      "awslogs-group": logGroup,
      "awslogs-region": region,
      "awslogs-stream-prefix": "ecs"
    }
  };
}

function secret(name, valueFrom) {
  return { name, valueFrom };
}

function environment(name, value) {
  return { name, value };
}

function buildApiTask(config) {
  return {
    family: `lwaye-api-${config.environment}`,
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    cpu: "512",
    memory: "1024",
    executionRoleArn: required(config.executionRoleArn, "executionRoleArn"),
    taskRoleArn: required(config.apiTaskRoleArn, "apiTaskRoleArn"),
    containerDefinitions: [
      {
        name: "api",
        image: "REPLACE_ME",
        essential: true,
        portMappings: [{ containerPort: 4000, hostPort: 4000, protocol: "tcp" }],
        environment: [
          environment("NODE_ENV", "production"),
          environment("PORT", "4000"),
          environment("SMS_PROVIDER", "sns"),
          environment("SNS_REGION", required(config.region, "region")),
          environment("STORAGE_PROVIDER", "s3"),
          environment("PUSH_PROVIDER", "expo")
        ],
        secrets: [
          secret("DATABASE_URL", required(config.parameters.databaseUrl, "parameters.databaseUrl")),
          secret("S3_BUCKET", required(config.parameters.s3Bucket, "parameters.s3Bucket")),
          secret("S3_REGION", required(config.parameters.s3Region, "parameters.s3Region")),
          secret("S3_PUBLIC_BASE_URL", required(config.parameters.s3PublicBaseUrl, "parameters.s3PublicBaseUrl"))
        ],
        logConfiguration: awsLogs(required(config.logGroups.api, "logGroups.api"), required(config.region, "region"))
      }
    ]
  };
}

function buildAdminTask(config) {
  return {
    family: `lwaye-admin-${config.environment}`,
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    cpu: "256",
    memory: "512",
    executionRoleArn: required(config.executionRoleArn, "executionRoleArn"),
    taskRoleArn: required(config.adminTaskRoleArn, "adminTaskRoleArn"),
    containerDefinitions: [
      {
        name: "admin",
        image: "REPLACE_ME",
        essential: true,
        portMappings: [{ containerPort: 80, hostPort: 80, protocol: "tcp" }],
        logConfiguration: awsLogs(required(config.logGroups.admin, "logGroups.admin"), required(config.region, "region"))
      }
    ]
  };
}

function buildMigrateTask(config) {
  return {
    family: `lwaye-migrate-${config.environment}`,
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    cpu: "256",
    memory: "512",
    executionRoleArn: required(config.executionRoleArn, "executionRoleArn"),
    taskRoleArn: required(config.apiTaskRoleArn, "apiTaskRoleArn"),
    containerDefinitions: [
      {
        name: "migrate",
        image: "REPLACE_ME",
        essential: true,
        command: ["npm", "run", "migrate", "--workspace", "@lwaye/api"],
        environment: [
          environment("NODE_ENV", "production"),
          environment("SMS_PROVIDER", "sns"),
          environment("SNS_REGION", required(config.region, "region")),
          environment("STORAGE_PROVIDER", "s3"),
          environment("PUSH_PROVIDER", "expo")
        ],
        secrets: [
          secret("DATABASE_URL", required(config.parameters.databaseUrl, "parameters.databaseUrl")),
          secret("S3_BUCKET", required(config.parameters.s3Bucket, "parameters.s3Bucket")),
          secret("S3_REGION", required(config.parameters.s3Region, "parameters.s3Region")),
          secret("S3_PUBLIC_BASE_URL", required(config.parameters.s3PublicBaseUrl, "parameters.s3PublicBaseUrl"))
        ],
        logConfiguration: awsLogs(required(config.logGroups.migrate, "logGroups.migrate"), required(config.region, "region"))
      }
    ]
  };
}

function main() {
  const { configPath } = parseArgs();
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const environmentName = required(config.environment, "environment");
  const targetDirectory = path.join(outputDirectory, environmentName);
  mkdirSync(targetDirectory, { recursive: true });

  writeFileSync(path.join(targetDirectory, "api-task-definition.json"), `${JSON.stringify(buildApiTask(config), null, 2)}\n`);
  writeFileSync(path.join(targetDirectory, "admin-task-definition.json"), `${JSON.stringify(buildAdminTask(config), null, 2)}\n`);
  writeFileSync(path.join(targetDirectory, "migrate-task-definition.json"), `${JSON.stringify(buildMigrateTask(config), null, 2)}\n`);

  console.log(`Generated ECS task definitions in ${targetDirectory}`);
}

main();
