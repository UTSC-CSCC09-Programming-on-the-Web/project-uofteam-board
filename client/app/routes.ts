import { type RouteConfig, index, route, prefix, layout } from "@react-router/dev/routes";

export default [
  index("routes/Home.tsx"),
  layout("./layouts/layout.tsx", [
    ...prefix("boards", [
      route(":bid", "./routes/EditBoard.tsx"),
      route("mine", "./routes/BrowseMyBoards.tsx"),
      route("public", "./routes/BrowsePublicBoards.tsx"),
    ]),
    route("account", "./routes/Account.tsx"),
  ]),
] satisfies RouteConfig;
