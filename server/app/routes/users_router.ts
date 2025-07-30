import { Router } from "express";
import { User } from "#models/Users.js";
import type { UrlLink, User } from "#types/api.js";
import { checkAuth, checkPaid } from "#middleware/checkAuth.js";
import { getGoogleAuth, authParams, links } from "#services/googleoauth.js";
import { SessionData } from "express-session";
import { create_checkout_session } from "#services/stripecheckout.js";
import { disconnectUserSocket } from "#ws/canvas.js";
import { generateToken, getTokenFromState } from "#services/csrftoken.js";

export const usersRouter = Router();

usersRouter.get("/me", checkAuth(false), async (req, res) => {
  res.json(req.session.user);
});

usersRouter.get("/me/picture", checkAuth(false), async (req, res) => {
  const userInfo = await User.findByPk(req.session.user?.id);
  if (!userInfo) throw Error("Got authenticated request for non-existant user!");
  res.redirect(302, userInfo.pictureUrl);
});

usersRouter.get("/login/callback", async (req, res) => {
  // Check state for CSRF
  const csrfToken = req.query.state;
  if (csrfToken !== getTokenFromState(req)) {
    res.redirect(`${links.clientUrl}`);
    console.error("Got Invalid CSRF Token from Ouath Callback", req.query)
    return;
  }

  const code = req.query.code?.toString();
  const data = await getGoogleAuth(code);
  if (!data) {
    res.redirect(`${links.clientUrl}?error=auth_failed`);
    return;
  }
  const { email, name, picture } = data;

  let user = await User.findOne({ where: { email } });
  if (!user) {
    user = await User.create({ name, email, pictureUrl: picture });
  }

  const paid = await checkPaid(user.userId);
  req.session.user = {
    id: user.userId,
    email: user.email,
    name: user.name,
    paid: paid,
  } satisfies SessionData["user"];

  if (!paid) {
    const checkoutLink = await create_checkout_session(req.session.user);
    if (checkoutLink != null) {
      res.redirect(checkoutLink.url);
      return;
    }
  }
  res.redirect(`${links.clientUrl}/${paid ? "dashboard" : "account"}`);
});

usersRouter.get("/login", async (req, res) => {
  res.json({
    url: `${links.authUrl}?${authParams(generateToken(req, true))}`,
  } satisfies UrlLink);
});

usersRouter.post("/logout", checkAuth(false), async (req, res) => {
  const sessionUser = req.session.user;
  if (!sessionUser) {
    throw new Error("No user session found for logout");
  }
  
  disconnectUserSocket(sessionUser.id);
  req.session.destroy((err) => {
    if (err) {
      res.clearCookie('connect.sid');
      console.error("Failed to destory session!");
      throw err;
    } else {
      res.json({
        id: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
      } satisfies User);
    }
  });
});
