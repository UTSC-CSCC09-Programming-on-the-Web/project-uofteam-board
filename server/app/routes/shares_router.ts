import express from "express";
import { Boards } from "#models/Boards.js";
import type { BoardPermission, BoardShare } from "#types/api.js";
import { checkAuth } from "#middleware/checkAuth.js";
import { BoardShares } from "#models/BoardShares.js";
import { Users } from "#models/Users.js";
import { BoardShareUpdate } from "#types/api.js";

export const sharesSubRouter = express.Router({ mergeParams: true });

sharesSubRouter.get("/", checkAuth(), async (req, res) => {
  const ALLOWED: BoardPermission[] = ["owner", "editor", "viewer"];
  const { id } = req.params;

  const boardShareArr = await BoardShares.findAll({
    where: { boardId: id },
    include: {
      model: Users,
    },
  });
  if (!boardShareArr) {
    res.status(404).json({ error: "Board not found" });
    return;
  }

  let haveAccess = false;
  for (const share of boardShareArr) {
    if (share.userId === req.session.user?.id && ALLOWED.includes(share.permission)) {
      haveAccess = true;
      break;
    }
  }
  if (!haveAccess) {
    res.status(403).json({ error: "Do not have authority to make this change" });
    return;
  }

  res.json(
    boardShareArr
      .filter((share) => share.permission !== "owner")
      .map((s) => s.get({ plain: true }))
      .map((s) => ({
        user: {
          id: s.User.userId,
          name: s.User.name,
          email: s.User.email,
        },
        boardID: s.boardId,
        permission: s.permission,
      })) satisfies BoardShare[],
  );
});

sharesSubRouter.post("/", checkAuth(), async (req, res) => {
  const ALLOWED: BoardPermission[] = ["owner", "editor"];
  const { userEmail } = req.body;
  const { id } = req.params;

  if (!(await Boards.findByPk(id))) {
    res.status(422).json({ error: "The specified board id does not exist!" });
    return;
  }
  if (!userEmail) {
    res.status(400).json({ error: "Missing parameter userEmail from the request" });
    return;
  }
  const curBoardShare = await BoardShares.findOne({
    where: { boardId: id, userId: req.session.user?.id },
  });
  if (!curBoardShare || !ALLOWED.includes(curBoardShare.permission)) {
    res.status(403).json({ error: "You do not the authority to make this change" });
    return;
  }
  const user = await Users.findOne({ where: { email: userEmail } });
  if (!user) {
    res.status(422).json({ error: "The specified user does not exist!" });
    return;
  }

  const boardShare = await BoardShares.findOne({
    where: {
      boardId: id,
      userId: user.userId,
    },
  });
  if (boardShare) {
    res.status(422).json({ error: "Board is already shared to this user!" });
    return;
  }

  const startingPermission: Exclude<BoardPermission, "owner"> = "viewer";
  const newShare = await BoardShares.create({
    boardId: id,
    userId: user.userId,
    permission: startingPermission satisfies BoardPermission,
  });

  res.json({
    user: {
      id: user.userId,
      name: user.name,
      email: user.email,
    },
    boardID: newShare.boardId,
    permission: startingPermission,
  } satisfies BoardShare);
});

sharesSubRouter.post("/update", checkAuth(), async (req, res) => {
  const ALLOWED: BoardPermission[] = ["owner", "editor"];
  const updates: BoardShareUpdate[] = req.body;
  const { id } = req.params;

  if (updates === undefined || !Array.isArray(updates)) {
    res.status(400).json({ error: "Missing parameter updates from the request" });
    return;
  }

  const permCheck = await BoardShares.findOne({
    where: {
      boardId: id,
      userId: req.session.user?.id,
    },
  });
  if (!permCheck || !ALLOWED.includes(permCheck.permission)) {
    res.status(403).json({ error: "You do not have the authority to make this change" });
    return;
  }

  const completed: BoardShareUpdate[] = [];
  for (const update of updates) {
    if (update.boardID !== Number(id)) continue;
    const boardShare = await BoardShares.findOne({
      where: {
        boardId: id,
        userId: update.user.id,
      },
      include: {
        model: Users,
      },
    });
    if (!boardShare) continue;

    if (update.permission === "remove") {
      await boardShare.destroy();
      continue;
    }

    if (!['viewer', 'editor'].includes(update.permission)) continue;
    boardShare.permission = update.permission;
    await boardShare.save();
    const saved = boardShare.get({ plain: true });

    completed.push({
      user: {
        id: saved.User.userId,
        name: saved.User.name,
        email: saved.User.email,
      },
      boardID: saved.boardId,
      permission: saved.permission,
    } satisfies BoardShare);
  }

  res.json(completed satisfies BoardShareUpdate[]);
});
