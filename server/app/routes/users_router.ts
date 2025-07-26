import { Router } from "express";
import { Users } from "#models/Users.js";
import type { User } from "#types/api.js";
import { checkAuth } from "#middleware/checkAuth.js";
import { getGoogleAuth, authParams, links } from "#oauth/googleoauth.js";

export const usersRouter = Router();

usersRouter.get("/me", checkAuth, async (req, res) => {
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
  req.session.user = {
    id: user.userId,
    email: user.email,
    name: user.name,
    paid: false,
  };

  res.redirect(`${links.clientUrl}/dashboard`);
});

usersRouter.get("/login", async (req, res) => {
  res.json({
    url: `${links.authUrl}?${authParams}`
  })
});

usersRouter.post("/logout", checkAuth, async (req, res) => {
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
