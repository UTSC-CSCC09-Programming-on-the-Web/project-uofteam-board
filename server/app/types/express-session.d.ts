import 'express-session';
import { User } from './api.ts';

declare module 'express-session' {
  interface SessionData {
    user?: User;
  }
}
