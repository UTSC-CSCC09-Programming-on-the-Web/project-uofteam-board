import { csrfSync } from "csrf-sync";

const {
  generateToken, // Use this in your routes to generate, store, and get a CSRF token.
  csrfSynchronisedProtection, // This is the default CSRF protection middleware.
} = csrfSync({
  ignoredMethods: ["GET", "HEAD", "OPTIONS"]  // Default
});

export {
  generateToken,
  csrfSynchronisedProtection
};
