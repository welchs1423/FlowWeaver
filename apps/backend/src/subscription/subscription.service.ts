import { Injectable, InternalServerErrorException } from '@nestjs/common';
import StripeLib from 'stripe';
import { UsersService } from '../users/users.service';

@Injectable()
export class SubscriptionService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly stripe: any;

  constructor(private readonly usersService: UsersService) {
    const secretKey = process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder';
    this.stripe = new StripeLib(secretKey, { apiVersion: '2026-03-25.dahlia' });
  }

  async createCheckoutSession(userId: string, userEmail: string) {
    const successUrl =
      process.env.STRIPE_SUCCESS_URL ?? 'http://localhost:3000/dashboard?upgraded=true';
    const cancelUrl = process.env.STRIPE_CANCEL_URL ?? 'http://localhost:3000';
    const priceId = process.env.STRIPE_PRO_PRICE_ID ?? 'price_placeholder_pro';

    try {
      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer_email: userEmail,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { userId },
      });

      return { url: session.url as string };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(`Stripe 세션 생성 실패: ${message}`);
    }
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';
    if (!webhookSecret) return;

    let event: { type: string; data: { object: { metadata?: { userId?: string } } } };
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret) as typeof event;
    } catch {
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const userId = event.data.object.metadata?.userId;
      if (userId) {
        await this.usersService.upgradeToPro(userId);
      }
    }
  }
}
