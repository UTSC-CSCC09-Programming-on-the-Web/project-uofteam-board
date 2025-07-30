import queryString from "query-string";

export const links = {
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  profileUrl: "https://www.googleapis.com/oauth2/v1/userinfo",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
};

// https://clerk.com/blog/oauth2-react-user-authorization
// https://developers.google.com/identity/protocols/oauth2/web-server
const config = {
  authUrl: links.authUrl,
  tokenUrl: links.tokenUrl,
  clientUrl: links.clientUrl,

  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUrl: process.env.REDIRECT_URL,
  tokenSecret: process.env.TOKEN_SECRET,
  tokenExpiration: 300, // 5 minutes
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
): Promise<{ email: string; name: string; picture: string } | undefined> {
  if (!code) {
    return;
  }
  const tokenParams = getTokenParams(code);
  const tokenResponse = await fetch(`${config.tokenUrl}?${tokenParams}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  if (!tokenResponse.ok) {
    return;
  }
  const wholeResponse = await tokenResponse.json();
  const tokenData = wholeResponse as { access_token: string; id_token: string };
  if (!tokenData?.id_token || !tokenData?.access_token) return;

  // Get the profile information
  const profileResponse = await fetch(
    `${links.profileUrl}/?access_token=${tokenData.access_token}`,
    { method: "GET" },
  );
  const userProfileInfo = (await profileResponse.json()) as {
    email: string;
    name: string;
    picture: string;
  };

  const { email, name, picture } = userProfileInfo;
  return { email, name, picture };
}
