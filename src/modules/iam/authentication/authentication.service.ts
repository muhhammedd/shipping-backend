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
import { Prisma, UserRole } from '@prisma/client';

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashingService: HashingService,
    private readonly jwtService: JwtService,
  ) { }

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
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email or Company Slug already exists');
      }
      throw error;
    }
  }

  async signIn(signInDto: SignInDto) {
    // Fetch user with profiles
    const user = await this.prisma.user.findUnique({
      where: { email: signInDto.email },
      include: {
        merchantProfile: true,
        courierProfile: true,
      },
    });

    if (!user) {
      console.error(`SignIn failed: User not found for email ${signInDto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      console.error(`SignIn failed: User account is inactive for ${signInDto.email}`);
      throw new UnauthorizedException('Account is inactive');
    }

    const isEqual = await this.hashingService.compare(
      signInDto.password,
      user.passwordHash,
    );

    if (!isEqual) {
      console.error(`SignIn failed: Invalid password for ${signInDto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Derive user name from profile or email
    let userName = user.email.split('@')[0];
    if (user.merchantProfile?.companyName) {
      userName = user.merchantProfile.companyName;
    }

    // Create JWT payload
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });

    console.log(`SignIn successful for ${user.email} with role ${user.role}`);

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: userName,
        role: user.role,
        tenantId: user.tenantId,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        merchantProfile: user.merchantProfile ? {
          id: user.merchantProfile.id,
          companyName: user.merchantProfile.companyName,
          balance: user.merchantProfile.balance.toString(),
        } : undefined,
        courierProfile: user.courierProfile ? {
          id: user.courierProfile.id,
          vehicleInfo: user.courierProfile.vehicleInfo,
          wallet: user.courierProfile.wallet.toString(),
        } : undefined,
      },
    };
  }
}
