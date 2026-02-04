import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from '../dto/address-book.dto';
import type { ActiveUserData } from '../../../common/interfaces/active-user-data.interface';

@Injectable()
export class AddressBookService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get all addresses for a merchant
     */
    async findAll(user: ActiveUserData) {
        const merchantProfile = await this.prisma.merchantProfile.findUnique({
            where: { userId: user.sub },
        });

        if (!merchantProfile) {
            throw new NotFoundException('Merchant profile not found');
        }

        return this.prisma.addressBook.findMany({
            where: {
                merchantId: merchantProfile.id,
                deletedAt: null, // Only non-deleted addresses
            },
            orderBy: [
                { isDefault: 'desc' }, // Default first
                { createdAt: 'desc' },
            ],
        });
    }

    /**
     * Get a single address
     */
    async findOne(id: string, user: ActiveUserData) {
        const merchantProfile = await this.prisma.merchantProfile.findUnique({
            where: { userId: user.sub },
        });

        if (!merchantProfile) {
            throw new NotFoundException('Merchant profile not found');
        }

        const address = await this.prisma.addressBook.findFirst({
            where: {
                id,
                merchantId: merchantProfile.id,
                deletedAt: null,
            },
        });

        if (!address) {
            throw new NotFoundException('Address not found');
        }

        return address;
    }

    /**
     * Create a new address
     */
    async create(dto: CreateAddressDto, user: ActiveUserData) {
        const merchantProfile = await this.prisma.merchantProfile.findUnique({
            where: { userId: user.sub },
        });

        if (!merchantProfile) {
            throw new NotFoundException('Merchant profile not found');
        }

        // If setting as default, unset other defaults
        if (dto.isDefault) {
            await this.prisma.addressBook.updateMany({
                where: {
                    merchantId: merchantProfile.id,
                    isDefault: true,
                },
                data: {
                    isDefault: false,
                },
            });
        }

        return this.prisma.addressBook.create({
            data: {
                ...dto,
                merchantId: merchantProfile.id,
                tenantId: user.tenantId,
            },
        });
    }

    /**
     * Update an address
     */
    async update(id: string, dto: UpdateAddressDto, user: ActiveUserData) {
        const merchantProfile = await this.prisma.merchantProfile.findUnique({
            where: { userId: user.sub },
        });

        if (!merchantProfile) {
            throw new NotFoundException('Merchant profile not found');
        }

        // Verify ownership
        const address = await this.prisma.addressBook.findFirst({
            where: {
                id,
                merchantId: merchantProfile.id,
                deletedAt: null,
            },
        });

        if (!address) {
            throw new NotFoundException('Address not found');
        }

        // If setting as default, unset other defaults
        if (dto.isDefault) {
            await this.prisma.addressBook.updateMany({
                where: {
                    merchantId: merchantProfile.id,
                    isDefault: true,
                    id: { not: id },
                },
                data: {
                    isDefault: false,
                },
            });
        }

        return this.prisma.addressBook.update({
            where: { id },
            data: dto,
        });
    }

    /**
     * Soft delete an address
     */
    async remove(id: string, user: ActiveUserData) {
        const merchantProfile = await this.prisma.merchantProfile.findUnique({
            where: { userId: user.sub },
        });

        if (!merchantProfile) {
            throw new NotFoundException('Merchant profile not found');
        }

        // Verify ownership
        const address = await this.prisma.addressBook.findFirst({
            where: {
                id,
                merchantId: merchantProfile.id,
                deletedAt: null,
            },
        });

        if (!address) {
            throw new NotFoundException('Address not found');
        }

        return this.prisma.addressBook.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });
    }

    /**
     * Set an address as default
     */
    async setDefault(id: string, user: ActiveUserData) {
        const merchantProfile = await this.prisma.merchantProfile.findUnique({
            where: { userId: user.sub },
        });

        if (!merchantProfile) {
            throw new NotFoundException('Merchant profile not found');
        }

        // Verify ownership
        const address = await this.prisma.addressBook.findFirst({
            where: {
                id,
                merchantId: merchantProfile.id,
                deletedAt: null,
            },
        });

        if (!address) {
            throw new NotFoundException('Address not found');
        }

        // Unset other defaults
        await this.prisma.addressBook.updateMany({
            where: {
                merchantId: merchantProfile.id,
                isDefault: true,
            },
            data: {
                isDefault: false,
            },
        });

        // Set this as default
        return this.prisma.addressBook.update({
            where: { id },
            data: {
                isDefault: true,
            },
        });
    }
}
