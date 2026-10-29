import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..');

const isTest = process.env.NODE_ENV === 'test';

/**
 * A development fallback secret keeps `npm run dev` working out of the box.
 * Outside development the server refuses to start without a real one, so a
 * deployment can never accidentally sign tokens with a public value.
 */
const DEV_SECRET = 'classfix-development-secret-do-not-use-in-production';

function resolveSecret() {
  const fromEnv = process.env.JWT_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET must be set when NODE_ENV=production. Copy .env.example to .env and set a long random value.',
    );
  }
  return DEV_SECRET;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: resolveSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  bcryptRounds: isTest ? 4 : Number(process.env.BCRYPT_ROUNDS ?? 10),
  databaseFile: process.env.DATABASE_FILE
    ? path.resolve(process.env.DATABASE_FILE)
    : path.join(ROOT, 'data', 'classfix.db'),
  uploadDir: process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.join(ROOT, 'data', 'uploads'),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 2 * 1024 * 1024),
  /**
   * Browser origins allowed to call the API.
   *
   * `localhost` and `127.0.0.1` are different origins to a browser, so both
   * spellings of the Vite dev server and preview server are listed. Without
   * this, opening the app on one spelling while the API expects the other
   * fails the CORS preflight with no obvious cause.
   */
  corsOrigins: (
    process.env.CORS_ORIGINS ??
    [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:4173',
      'http://127.0.0.1:4173',
    ].join(',')
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  /** Seed accounts all share this password so the demo is easy to sign into. */
  seedPassword: process.env.SEED_PASSWORD ?? 'classfix123',
  /**
   * Login throttle. Raised under test so a suite that signs in repeatedly is
   * not fighting the limiter; the limiter itself is covered by its own test.
   */
  loginRateLimit: {
    windowMs: Number(process.env.LOGIN_WINDOW_MS ?? 60_000),
    max: Number(process.env.LOGIN_MAX_ATTEMPTS ?? (isTest ? 10_000 : 10)),
  },
};

export const usingDevSecret = config.jwtSecret === DEV_SECRET;
