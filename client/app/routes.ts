import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/Home/Home.tsx"),
  layout("./layouts/Layout.tsx", [
    route("dashboard", "./routes/Dashboard/Dashboard.tsx"),
    route("account", "./routes/Account/Account.tsx"),
  ]),
  route("boards/:bid", "./routes/EditBoard/EditBoard.tsx"),
] satisfies RouteConfig;
