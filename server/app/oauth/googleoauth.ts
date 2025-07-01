import queryString from "query-string";

export const links = {
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
};

// https://clerk.com/blog/oauth2-react-user-authorization
const config = {
  authUrl: links.authUrl,
  tokenUrl: links.tokenUrl,
  clientUrl: links.clientUrl,

  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUrl: process.env.REDIRECT_URL,
  tokenSecret: process.env.TOKEN_SECRET,
  tokenExpiration: 3600, // 1 hour
};

export const authParams = queryString.stringify({
  client_id: config.clientId,
  redirect_uri: config.redirectUrl,
  response_type: "code",
  scope: "profile email",
  access_type: "offline",
  state: "standard_oauth",
  prompt: "consent",
});

const getTokenParams = (code: string) =>
  queryString.stringify({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUrl,
  });

export async function getGoogleAuth(
  code?: string,
): Promise<{ email: string; name: string } | undefined> {
  if (!code) {
    return;
  }
  const tokenParams = getTokenParams(code as string);
  const tokenResponse = await fetch(`${config.tokenUrl}?${tokenParams}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  if (!tokenResponse.ok) {
    return;
  }
  const tokenData = (await tokenResponse.json()) as { access_token: string; id_token: string };
  if (!tokenData?.id_token) {
    return;
  }

  const { email, name } = JSON.parse(atob(tokenData.id_token.split(".")[1]));
  return { email, name };
}
