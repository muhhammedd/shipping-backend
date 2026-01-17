import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { ActiveUserData } from '../interfaces/active-user-data.interface';

interface RequestWithUser extends Request {
  user?: ActiveUserData;
}

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      return next.handle();
    }

    // Super Admin can bypass tenant isolation to manage all tenants
    if (user.role === 'SUPER_ADMIN') {
      return next.handle();
    }

    if (user.tenantId && request.body && typeof request.body === 'object') {
      (request.body as Record<string, unknown>).tenantId = user.tenantId;
    }

    return next.handle();
  }
}
