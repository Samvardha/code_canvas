// AUTHENTICATION (LOGIN/SIGNUP)
export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export const validatePassword = (password: string): boolean => {
  // 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password.trim());
};

export const passwordConstraints = {
  hasMinLength: (password: string) => password.trim().length >= 8,
  hasUpperCase: (password: string) => /[A-Z]/.test(password.trim()),
  hasLowerCase: (password: string) => /[a-z]/.test(password.trim()),
  hasNumber: (password: string) => /\d/.test(password.trim()),
  hasSpecialChar: (password: string) => /[^A-Za-z0-9]/.test(password.trim()),
  matchesConfirm: (password: string, confirm: string) => password.trim() === confirm.trim(),
};

// USER PROFILE & ONBOARDING
export const validateUsernameFormat = (username: string): boolean => {
  // starts with letter, only a-z0-9_, no consecutive underscores
  return /^[a-z][a-z0-9_]*$/.test(username) && !username.includes("__");
};

export const sanitizeUsername = (val: string): string => {
  let sanitized = val.toLowerCase();
  sanitized = sanitized.replace(/[^a-z0-9_]/g, "");
  sanitized = sanitized.replace(/^[^a-z]+/, "");
  sanitized = sanitized.replace(/_{2,}/g, "_");
  return sanitized;
};

export const sanitizeBio = (val: string): string => {
  const sanitized = val.replace(/  +/g, " ");
  return sanitized.length > 0
    ? sanitized.charAt(0).toUpperCase() + sanitized.slice(1)
    : sanitized;
};

export const formatToTitleCase = (val: string): string => {
  if (!val) return "";
  return val
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ");
};
