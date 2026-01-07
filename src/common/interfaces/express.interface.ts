import { ActiveUserData } from './active-user-data.interface';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: ActiveUserData;
    }
  }
}
