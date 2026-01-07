import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { ActiveUserData } from '../interfaces/active-user-data.interface';

export const ActiveUser = createParamDecorator(
  (
    field: keyof ActiveUserData | undefined,
    ctx: ExecutionContext,
  ): ActiveUserData | Partial<ActiveUserData> | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user: ActiveUserData | undefined = request.user;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return field ? (user?.[field] as any) : user;
  },
);
