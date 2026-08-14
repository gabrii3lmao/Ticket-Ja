import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PaymentMethod, PaymentProvider } from 'generated/prisma/enums';
import { BasePaymentProvider } from '../base.payment-provider';
import { AsaasConfig } from './asaas.config';
import { PaymentStatus } from 'generated/prisma/enums';
import { AsaasCustomer, AsaasPayment, AsaasPixQrCode } from './asaas.types';
import { CreateCustomerInput } from 'src/payment/interfaces/dto/create-customer.dto';
import {
  CreateCustomerOutput,
  CreatePaymentOutput,
} from 'src/payment/interfaces/payment-provider.interface';
import { CreatePaymentInput } from 'src/payment/interfaces/dto/create-payment.dto';

@Injectable()
export class AsaasPaymentProvider extends BasePaymentProvider {
  readonly name = PaymentProvider.ASAAS;

  constructor(http: HttpService, config: AsaasConfig) {
    super(http, config);
  }

  async createCustomer(
    input: CreateCustomerInput,
  ): Promise<CreateCustomerOutput> {
    const customer = await this.request<AsaasCustomer>('/customers', {
      method: 'POST',
      data: JSON.stringify({
        name: input.name,
        email: input.email,
        cpfCnpj: input.taxId,
        phone: input.phone,
        notificationDisabled: true,
      }),
    });
    return { externalId: customer.id };
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentOutput> {
    const payment = await this.request<AsaasPayment>('/payments', {
      method: 'POST',
      data: JSON.stringify({
        customer: input.customerExternalId,
        billingType: 'PIX',
        value: input.amount,
        dueDate: input.dueDate.toISOString().slice(0, 10),
        description: input.description,
      }),
    });

    const providerData: Record<string, unknown> = {
      invoiceUrl: payment.invoiceUrl,
      dueDate: payment.dueDate,
    };

    // PIX exige buscar o QR code separadamente
    if (input.method === PaymentMethod.PIX) {
      const qr = await this.request<AsaasPixQrCode>(
        `/payments/${payment.id}/pixQrCode`,
      );
      providerData.pixQrCode = qr.encodedImage;
      providerData.pixCopiaECola = qr.payload;
      providerData.pixExpirationDate = qr.expirationDate;
    }

    return {
      externalId: payment.id,
      status: this.mapStatus(payment.status),
      providerData,
      dueDate: new Date(payment.dueDate),
    };
  }

  async getPaymentStatus(externalId: string) {
    const payment = await this.request<AsaasPayment>(`/payments/${externalId}`);
    return this.mapStatus(payment.status);
  }

  async cancelPayment(externalId: string) {
    await this.request(`/payments/${externalId}/cancel`, { method: 'POST' });
  }

  protected mapStatus(rawStatus: string): PaymentStatus {
    switch (rawStatus) {
      case 'RECEIVED':
      case 'CONFIRMED':
        return PaymentStatus.APPROVED;
      case 'REFUNDED':
      case 'REFUND_REQUESTED':
        return PaymentStatus.REFUNDED;
      case 'OVERDUE':
      case 'FAILED':
      case 'CANCELED':
      case 'CHARGEBACK_REQUESTED':
        return PaymentStatus.FAILED;
      default:
        return PaymentStatus.PENDING;
    }
  }
}
