import {
  Controller,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post(':flowId')
  @HttpCode(HttpStatus.OK)
  trigger(
    @Param('flowId') flowId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.webhooksService.trigger(flowId, body ?? {});
  }
}
