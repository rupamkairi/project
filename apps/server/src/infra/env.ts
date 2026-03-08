import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3000),
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

  // Storage
  STORAGE_PROVIDER: z.enum(["local", "s3", "gcs", "r2"]).default("local"),
  STORAGE_LOCAL_PATH: z.string().default("./uploads"),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  CDN_BASE_URL: z.string().optional(),

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
