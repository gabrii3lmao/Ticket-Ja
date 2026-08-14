import {
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from 'generated/prisma/enums';
import { CreateCustomerInput } from './dto/create-customer.dto';
import { CreatePaymentInput } from './dto/create-payment.dto';

export interface CreateCustomerOutput {
  externalId: string;
}

export interface CreatePaymentOutput {
  externalId: string;
  status: PaymentStatus;
  providerData: Record<string, unknown>;
  dueDate: Date;
}

export interface IPaymentProvider {
  readonly name: PaymentProvider;
  createCustomer(input: CreateCustomerInput): Promise<CreateCustomerOutput>;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentOutput>;
  getPaymentStatus(externalId: string): Promise<PaymentStatus>;
  cancelPayment(externalId: string): Promise<void>;
}
