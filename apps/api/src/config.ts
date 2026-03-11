export type SmsProvider = "console" | "sns" | "disabled";
export type StorageProvider = "local" | "s3";
export type PushProvider = "console" | "expo";

function env(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function parseProvider<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  const normalized = value.trim().toLowerCase();
  return (allowed as readonly string[]).includes(normalized) ? (normalized as T) : fallback;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? "postgres://lwaye:lwaye@127.0.0.1:5432/lwaye",
  smsProvider: parseProvider<SmsProvider>(process.env.SMS_PROVIDER ?? "", ["console", "sns", "disabled"], process.env.NODE_ENV === "production" ? "disabled" : "console"),
  sns: {
    region: optionalEnv("SNS_REGION") ?? optionalEnv("AWS_REGION"),
    senderId: optionalEnv("SNS_SENDER_ID"),
    smsType: process.env.SNS_SMS_TYPE?.trim() || "Transactional"
  },
  storageProvider: parseProvider<StorageProvider>(process.env.STORAGE_PROVIDER ?? "local", ["local", "s3"], "local"),
  s3: {
    bucket: optionalEnv("S3_BUCKET"),
    region: optionalEnv("S3_REGION"),
    publicBaseUrl: optionalEnv("S3_PUBLIC_BASE_URL"),
    endpoint: optionalEnv("S3_ENDPOINT"),
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "false").trim().toLowerCase() === "true"
  },
  pushProvider: parseProvider<PushProvider>(process.env.PUSH_PROVIDER ?? "console", ["console", "expo"], "console")
};

export function validateRuntimeConfig() {
  if (!Number.isFinite(config.port) || config.port <= 0) {
    throw new Error("PORT must be a positive number");
  }

  if (config.smsProvider === "sns") {
    env("SNS_REGION", process.env.AWS_REGION);
  }

  if (config.nodeEnv === "production" && config.smsProvider === "disabled") {
    throw new Error("SMS_PROVIDER must be configured for production");
  }

  if (config.storageProvider === "s3") {
    env("S3_BUCKET");
    env("S3_REGION");
    env("S3_PUBLIC_BASE_URL");
  }
}
