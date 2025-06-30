import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/Home.tsx"),
  layout("./layouts/layout.tsx", [
    route("dashboard", "./routes/Dashboard/Dashboard.tsx"),
    route("boards/:bid", "./routes/EditBoard.tsx"),
    route("account", "./routes/Account.tsx"),
  ]),
] satisfies RouteConfig;
