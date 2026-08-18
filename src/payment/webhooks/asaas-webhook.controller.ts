import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/auth/decorators/public.decorator';
import { AsaasWebhookGuard } from './asaas-webhook.guard';
import { AsaasWebhookService } from './asaas-webhook.service';

@ApiTags('payments')
@Controller('payments/webhook/asaas')
export class AsaasWebhookController {
  constructor(private readonly webhookService: AsaasWebhookService) {}
  @Post()
  @Public()
  @UseGuards(AsaasWebhookGuard)
  @ApiOperation({
    summary: 'ASAAS payment webhook',
    description:
      'Receives ASAAS payment events. Deduplicated via payment.id + event; transitions order/payment state idempotently.',
  })
  @ApiResponse({ status: 201, description: 'Webhook accepted and processed' })
  @ApiResponse({ status: 400, description: 'Missing event or payment.id' })
  @ApiResponse({ status: 401, description: 'Invalid webhook token' })
  handle(@Body() payload: Record<string, any>) {
    return this.webhookService.handleWebhook(payload);
  }
}
