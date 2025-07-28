import { Router } from "express";
import { Users } from "#models/Users.js";
import type { UrlLink, User } from "#types/api.js";
import { checkAuth, checkPaid } from "#middleware/checkAuth.js";
import { getGoogleAuth, authParams, links } from "#oauth/googleoauth.js";
import { SessionData } from "express-session";
import { create_checkout_session } from "#stripe/checkout.js";

export const usersRouter = Router();

usersRouter.get("/me", checkAuth(false), async (req, res) => {
  res.json(req.session.user);
});

usersRouter.get("/login/callback", async (req, res) => {
  const code = req.query.code?.toString();
  const data = await getGoogleAuth(code);
  if (!data) {
    res.redirect(`${links.clientUrl}?error=auth_failed`);
    return;
  }
  const { email, name } = data;

  let user = await Users.findOne({ where: { email } });
  if (!user) {
    user = await Users.create({ name, email });
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
    url: `${links.authUrl}?${authParams}`,
  } satisfies UrlLink);
});

usersRouter.post("/logout", checkAuth(false), async (req, res) => {
  const sessionUser = req.session.user;
  if (!sessionUser) {
    throw new Error("No user session found for logout");
  }
  delete req.session.user;
  res.json({
    id: sessionUser.id,
    name: sessionUser.name,
    email: sessionUser.email,
  } satisfies User);
});
