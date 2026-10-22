// Config — shared configuration with env validation
// Auth secret validation happens at import time to fail fast

// There is no fallback secret. A secret written in the code lets anyone forge
// tokens for a server that was started without JWT_SECRET (P5 #53, BE4).
export const JWT_SECRET_MIN_LENGTH = 32;
const PLACEHOLDER_SECRETS = new Set(["change-me-to-a-random-secret", "dev-secret-do-not-use-in-prod"]);
const HOW_TO = "Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('base64'))\"";

export function getJwtSecret(env = process.env) {
  const secret = env.JWT_SECRET;
  if (!secret) {
    throw new Error(`JWT_SECRET is not set. The server refuses to start without it. ${HOW_TO}`);
  }
  if (PLACEHOLDER_SECRETS.has(secret) || secret.length < JWT_SECRET_MIN_LENGTH) {
    throw new Error(`JWT_SECRET must be a random value of at least ${JWT_SECRET_MIN_LENGTH} characters, not a placeholder. ${HOW_TO}`);
  }
  return secret;
}
