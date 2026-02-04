
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../core/prisma.service';

@Injectable()
export class BillingService {
    private stripe: Stripe;
    private readonly logger = new Logger(BillingService.name);

    constructor(
        private configService: ConfigService,
        private prisma: PrismaService,
    ) {
        const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY');
        if (apiKey) {
            this.stripe = new Stripe(apiKey, {
                apiVersion: '2026-01-28.clover', // Latest supported version
            });
        } else {
            this.logger.warn('STRIPE_SECRET_KEY not found in env. Billing will be disabled.');
        }
    }

    async createCheckoutSession(tenantId: string, plan: string) {
        if (!this.stripe) throw new BadRequestException('Billing system not configured');

        // 1. Get Tenant details
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) throw new BadRequestException('Tenant not found');

        // 2. Map plan string to Stripe Price ID (Mocked for now)
        const priceId = this.getPriceIdForPlan(plan);
        if (!priceId) throw new BadRequestException('Invalid plan selected');

        // 3. Create Session
        try {
            const session = await this.stripe.checkout.sessions.create({
                mode: 'subscription',
                payment_method_types: ['card'],
                customer_email: 'admin@' + tenant.slug + '.com', // Placeholder
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                metadata: {
                    tenantId: tenant.id,
                    plan: plan
                },
                success_url: `${this.configService.get('FRONTEND_URL')}/dashboard?checkout=success`,
                cancel_url: `${this.configService.get('FRONTEND_URL')}/billing?checkout=cancel`,
            });

            return { url: session.url };
        } catch (error) {
            this.logger.error('Stripe Checkout Error', error);
            throw new BadRequestException('Failed to create checkout session');
        }
    }

    private getPriceIdForPlan(plan: string): string | null {
        // In a real app, these would be in DB or Config
        const prices = {
            'BASIC': 'price_basic_test_123',
            'PREMIUM': 'price_premium_test_123',
            'ENTERPRISE': 'price_enterprise_test_123'
        };
        return prices[plan] || null;
    }
}
