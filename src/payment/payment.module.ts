import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { HttpModule } from '@nestjs/axios';
import { PaymentProviderFactory } from './strategy/payment-provider.factory';
import { AsaasPaymentProvider } from './providers/asaas/asaas.payment-provider';
import { AsaasConfig } from './providers/asaas/asaas.config';

@Module({
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PaymentProviderFactory,
    AsaasPaymentProvider,
    AsaasConfig,
  ],
  imports: [HttpModule],
  exports: [PaymentService],
})
export class PaymentModule {}
