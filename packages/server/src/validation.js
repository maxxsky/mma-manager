// Input validation for auth routes (P5 #54, BE5).
export const USERNAME_RE = /^[A-Za-z0-9_.-]{3,32}$/;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72; // bcrypt ignores everything past 72 bytes
export const EMAIL_MAX_LENGTH = 254;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isStr = (v) => typeof v === "string" && v.length > 0;

/** Returns an error message, or null when the registration body is valid. */
export function validateRegistration({ username, email, password } = {}) {
  if (!isStr(username) || !isStr(email) || !isStr(password)) {
    return "username, email, and password are required";
  }
  if (!USERNAME_RE.test(username)) {
    return "username must be 3-32 characters: letters, digits, _ . -";
  }
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_RE.test(email)) {
    return "email is not valid";
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (Buffer.byteLength(password, "utf8") > PASSWORD_MAX_BYTES) {
    return `password must be at most ${PASSWORD_MAX_BYTES} bytes`;
  }
  return null;
}

/** Login only needs two non-empty strings; anything else is rejected before the DB. */
export function validateLogin({ email, password } = {}) {
  return isStr(email) && isStr(password) ? null : "email and password are required";
}
