import { SetMetadata } from '@nestjs/common';
import { SKIP_RATE_LIMIT_KEY } from '../rate-limit.guard';

export const SkipRateLimit = () => SetMetadata(SKIP_RATE_LIMIT_KEY, true);
