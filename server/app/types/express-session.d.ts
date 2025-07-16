import "express-session";
import { User } from "./api.js";

declare module "express-session" {
  interface SessionData {
    user?: User;
  }
}
