import { Injectable } from '@nestjs/common';
import { PaymentProviderFactory } from './strategy/payment-provider.factory';
import { PaymentProvider } from 'generated/prisma/enums';
import { CreateCustomerInput } from './interfaces/dto/create-customer.dto';
import { CreatePaymentInput } from './interfaces/dto/create-payment.dto';

@Injectable()
export class PaymentService {
  constructor(private readonly factory: PaymentProviderFactory) {}

  private provider(provider: PaymentProvider = PaymentProvider.ASAAS) {
    return this.factory.getProvider(provider);
  }

  createCustomer(input: CreateCustomerInput) {
    return this.provider().createCustomer(input);
  }

  createPayment(input: CreatePaymentInput) {
    return this.provider().createPayment(input);
  }

  getPaymentStatus(externalId: string) {
    return this.provider().getPaymentStatus(externalId);
  }

  cancelPayment(externalId: string) {
    return this.provider().cancelPayment(externalId);
  }
}
