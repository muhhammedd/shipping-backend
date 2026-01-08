import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { ActiveUserData } from '../interfaces/active-user-data.interface';

interface RequestWithUser extends Request {
  user?: ActiveUserData;
}

export const ActiveUser = createParamDecorator(
  (
    field: keyof ActiveUserData | undefined,
    ctx: ExecutionContext,
  ): ActiveUserData | ActiveUserData[keyof ActiveUserData] | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (field && user) {
      return user[field];
    }
    return user;
  },
);
