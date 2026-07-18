// Config — shared configuration with env validation
// Auth secret validation happens at import time to fail fast

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET is required in production. Set JWT_SECRET environment variable before starting the server."
    );
  }

  console.warn(
    "⚠️  WARNING: JWT_SECRET not set, using dev fallback. " +
    "Set JWT_SECRET=your-secret in environment for real security. " +
    "DO NOT use this fallback in production."
  );
  return "dev-secret-do-not-use-in-prod";
}
