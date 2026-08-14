import { Injectable } from '@nestjs/common';
import { PaymentProvider } from 'generated/prisma/enums';
import { IPaymentProvider } from '../interfaces/payment-provider.interface';
import { AsaasPaymentProvider } from '../providers/asaas/asaas.payment-provider';

@Injectable()
export class PaymentProviderFactory {
  private readonly providers = new Map<PaymentProvider, IPaymentProvider>();

  constructor(asaas: AsaasPaymentProvider) {
    this.providers.set(PaymentProvider.ASAAS, asaas);
    // this.providers.set(PaymentProvider.STRIPE, stripe)
  }

  getProvider(provider: PaymentProvider = PaymentProvider.ASAAS) {
    const instance = this.providers.get(provider);
    if (!instance) {
      throw new Error(`Payment provider "${provider}" is not registered`);
    }
    return instance;
  }
}
