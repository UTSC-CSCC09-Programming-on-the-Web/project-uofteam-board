import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("boards/mine", "routes/dashboard.tsx"),
] satisfies RouteConfig;
