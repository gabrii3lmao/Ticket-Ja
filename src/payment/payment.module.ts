import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { HttpModule } from '@nestjs/axios';
import { PaymentProviderFactory } from './strategy/payment-provider.factory';
import { AsaasPaymentProvider } from './providers/asaas/asaas.payment-provider';
import { AsaasConfig } from './providers/asaas/asaas.config';
import { AsaasWebhookController } from './webhooks/asaas-webhook.controller';
import { AsaasWebhookService } from './webhooks/asaas-webhook.service';
import { AsaasWebhookGuard } from './webhooks/asaas-webhook.guard';
import { PaymentExpiryService } from './payment-expiry.service';

@Module({
  controllers: [PaymentController, AsaasWebhookController],
  providers: [
    PaymentService,
    PaymentProviderFactory,
    AsaasPaymentProvider,
    AsaasConfig,
    AsaasWebhookService,
    AsaasWebhookGuard,
    PaymentExpiryService,
  ],
  imports: [HttpModule],
  exports: [PaymentService],
})
export class PaymentModule {}
