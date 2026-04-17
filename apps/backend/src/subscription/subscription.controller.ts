import {
  Controller,
  Post,
  Headers,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

interface JwtUser {
  id: string;
  email: string;
}

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  createCheckoutSession(@CurrentUser() user: JwtUser) {
    return this.subscriptionService.createCheckoutSession(user.id, user.email);
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    const rawBody = req.rawBody ?? Buffer.alloc(0);
    await this.subscriptionService.handleWebhook(rawBody, sig);
    return { received: true };
  }
}
