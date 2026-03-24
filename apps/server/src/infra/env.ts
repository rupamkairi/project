import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(10050),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  APP_VERSION: z.string().default("0.1.0"),

  // Neon (Postgres)
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Redis
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  // Auth
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("30d"),

  // Storage - S3
  STORAGE_PROVIDER: z.enum(["local", "s3", "gcs", "r2"]).default("s3"),
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default("ap-south-1"),
  S3_PUBLIC_URL: z.string().url().optional(),

  // Notification
  EMAIL_PROVIDER: z
    .enum(["console", "smtp", "resend", "sendgrid"])
    .default("console"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),

  SMS_PROVIDER: z.enum(["console", "twilio", "msg91"]).default("console"),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),

  // Maps
  GEO_PROVIDER: z.enum(["osm", "google", "mapbox"]).default("osm"),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  console.error("❌ Environment validation failed");
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exit(1);
}

export { env };
