import { csrfSync } from "csrf-sync";

const {
  invalidCsrfTokenError, // This is just for convenience if you plan on making your own middleware.
  getTokenFromState, // The default method for retrieving a token from state.
  generateToken, // Use this in your routes to generate, store, and get a CSRF token.
  csrfSynchronisedProtection, // This is the default CSRF protection middleware.
} = csrfSync({
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],  // Default
});

export {
  invalidCsrfTokenError,
  getTokenFromState,
  generateToken,
  csrfSynchronisedProtection
};
