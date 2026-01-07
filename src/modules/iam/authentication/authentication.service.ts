import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../core/prisma.service';
import { HashingService } from '../hashing/hashing.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashingService: HashingService,
    private readonly jwtService: JwtService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Create Tenant
        const tenant = await tx.tenant.create({
          data: {
            name: signUpDto.companyName,
            slug: signUpDto.companySlug,
          },
        });

        // 2. Create Super Admin User for this Tenant
        const passwordHash = await this.hashingService.hash(signUpDto.password);
        const user = await tx.user.create({
          data: {
            email: signUpDto.email,
            passwordHash,
            role: UserRole.ADMIN, // First user is the Tenant Admin
            tenantId: tenant.id,
          },
        });

        return {
          userId: user.id,
          tenantId: tenant.id,
        };
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Email or Company Slug already exists');
      }
      throw error;
    }
  }

  async signIn(signInDto: SignInDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: signInDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isEqual = await this.hashingService.compare(
      signInDto.password,
      user.passwordHash,
    );

    if (!isEqual) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

    return { accessToken };
  }
}
