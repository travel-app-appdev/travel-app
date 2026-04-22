export type AuthFieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  general?: string;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(values: {
  email: string;
  password: string;
}): AuthFieldErrors {
  const errors: AuthFieldErrors = {};

  const email = values.email.trim();
  const password = values.password;

  if (!email) {
    errors.email = "Please enter your email.";
  } else if (!emailRegex.test(email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (!password) {
    errors.password = "Please enter your password.";
  }

  return errors;
}

export function validateRegister(values: {
  name: string;
  email: string;
  password: string;
}): AuthFieldErrors {
  const errors: AuthFieldErrors = {};

  const name = values.name.trim();
  const email = values.email.trim();
  const password = values.password;

  if (!name) {
    errors.name = "Please enter your name.";
  }

  if (!email) {
    errors.email = "Please enter your email.";
  } else if (!emailRegex.test(email)) {
    errors.email = "Please enter a valid email address.";
  }

  if (!password) {
    errors.password = "Please enter your password.";
  } else if (password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }

  return errors;
}

export function hasErrors(errors: AuthFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}
