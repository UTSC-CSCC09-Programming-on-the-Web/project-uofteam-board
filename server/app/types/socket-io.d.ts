import "socket.io";
import { User } from "./api.js";

declare module "socket.io" {
  interface Socket {
    userData?: User & { paid: boolean };
  }
}
