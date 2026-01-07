import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user || !user.tenantId) {
      return next.handle();
    }

    if (request.body && typeof request.body === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      request.body.tenantId = user.tenantId;
    }

    return next.handle();
  }
}
