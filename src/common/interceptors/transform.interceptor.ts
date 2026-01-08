import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: unknown;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data: unknown) => {
        const isObject = data && typeof data === 'object';
        const hasData = isObject && 'data' in (data as Record<string, unknown>);
        const hasMeta = isObject && 'meta' in (data as Record<string, unknown>);

        return {
          success: true,
          message: 'Operation successful',
          data: hasData ? (data as { data: T }).data : (data as T),
          meta: hasMeta ? (data as { meta: unknown }).meta : undefined,
        };
      }),
    );
  }
}
