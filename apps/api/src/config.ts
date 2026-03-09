export type SmsProvider = "console" | "twilio" | "disabled";
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
  smsProvider: parseProvider<SmsProvider>(process.env.SMS_PROVIDER ?? "", ["console", "twilio", "disabled"], process.env.NODE_ENV === "production" ? "disabled" : "console"),
  twilio: {
    accountSid: optionalEnv("TWILIO_ACCOUNT_SID"),
    authToken: optionalEnv("TWILIO_AUTH_TOKEN"),
    fromPhone: optionalEnv("TWILIO_FROM_PHONE")
  },
  storageProvider: parseProvider<StorageProvider>(process.env.STORAGE_PROVIDER ?? "local", ["local", "s3"], "local"),
  s3: {
    bucket: optionalEnv("S3_BUCKET"),
    region: optionalEnv("S3_REGION"),
    accessKeyId: optionalEnv("S3_ACCESS_KEY_ID"),
    secretAccessKey: optionalEnv("S3_SECRET_ACCESS_KEY"),
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

  if (config.smsProvider === "twilio") {
    env("TWILIO_ACCOUNT_SID");
    env("TWILIO_AUTH_TOKEN");
    env("TWILIO_FROM_PHONE");
  }

  if (config.nodeEnv === "production" && config.smsProvider === "disabled") {
    throw new Error("SMS_PROVIDER must be configured for production");
  }

  if (config.storageProvider === "s3") {
    env("S3_BUCKET");
    env("S3_REGION");
    env("S3_ACCESS_KEY_ID");
    env("S3_SECRET_ACCESS_KEY");
    env("S3_PUBLIC_BASE_URL");
  }
}
