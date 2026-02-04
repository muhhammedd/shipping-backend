import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../core/prisma.service';
import { HashingService } from '../iam/hashing/hashing.service';
import { UserRole, Prisma } from '@prisma/client';
import { ActiveUserData } from '../../common/interfaces/active-user-data.interface';

@Injectable()
export class UsersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly hashingService: HashingService,
    ) { }

    async create(createUserDto: any, activeUser: ActiveUserData) {
        const passwordHash = await this.hashingService.hash(createUserDto.password);

        try {
            return await this.prisma.$transaction(async (tx) => {
                const user = await tx.user.create({
                    data: {
                        email: createUserDto.email,
                        passwordHash,
                        role: createUserDto.role,
                        tenantId: activeUser.tenantId,
                    },
                });

                if (createUserDto.role === UserRole.MERCHANT) {
                    await tx.merchantProfile.create({
                        data: {
                            userId: user.id,
                            tenantId: activeUser.tenantId,
                            companyName: createUserDto.companyName || user.email,
                        },
                    });
                } else if (createUserDto.role === UserRole.COURIER) {
                    await tx.courierProfile.create({
                        data: {
                            userId: user.id,
                            tenantId: activeUser.tenantId,
                            vehicleInfo: createUserDto.vehicleInfo,
                        },
                    });
                }

                return user;
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new ConflictException('Email already exists');
            }
            throw error;
        }
    }

    async findAll(activeUser: ActiveUserData, role?: UserRole) {
        return this.prisma.user.findMany({
            where: {
                tenantId: activeUser.tenantId,
                role: role,
            },
            include: {
                merchantProfile: true,
                courierProfile: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string, activeUser: ActiveUserData) {
        const user = await this.prisma.user.findFirst({
            where: {
                id,
                tenantId: activeUser.tenantId,
            },
            include: {
                merchantProfile: true,
                courierProfile: true,
            },
        });

        if (!user) {
            throw new NotFoundException(`User #${id} not found`);
        }

        return user;
    }

    async update(id: string, updateUserDto: any, activeUser: ActiveUserData) {
        // Basic update logic
        const { password, ...data } = updateUserDto;

        if (password) {
            data.passwordHash = await this.hashingService.hash(password);
        }

        try {
            return await this.prisma.user.update({
                where: { id, tenantId: activeUser.tenantId },
                data,
            });
        } catch (error) {
            throw new NotFoundException(`User #${id} not found or access denied`);
        }
    }

    async remove(id: string, activeUser: ActiveUserData) {
        try {
            // Soft delete by setting isActive to false
            return await this.prisma.user.update({
                where: { id, tenantId: activeUser.tenantId },
                data: { isActive: false },
            });
        } catch (error) {
            throw new NotFoundException(`User #${id} not found or access denied`);
        }
    }
}
