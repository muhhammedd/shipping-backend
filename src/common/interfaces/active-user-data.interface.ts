import { UserRole } from '@prisma/client';

export interface ActiveUserData {
  sub: string;
  email: string;
  role: UserRole;
  tenantId: string;
}
