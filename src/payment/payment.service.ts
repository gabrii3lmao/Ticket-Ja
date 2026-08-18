import { Injectable } from '@nestjs/common';
import { PaymentProviderFactory } from './strategy/payment-provider.factory';
import {
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  TicketStatus,
} from 'generated/prisma/enums';
import { CreateCustomerInput } from './interfaces/dto/create-customer.dto';
import { CreatePaymentInput } from './interfaces/dto/create-payment.dto';
import { PrismaService } from 'src/prisma.service';
import { PrismaClientKnownRequestError } from 'generated/prisma/internal/prismaNamespace';

@Injectable()
export class PaymentService {
  constructor(
    private readonly factory: PaymentProviderFactory,
    private readonly prisma: PrismaService,
  ) {}

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

  async ensureGatewayCustomer(
    userId: string,
    input: Pick<CreateCustomerInput, 'name' | 'email' | 'taxId'>,
  ): Promise<{ externalId: string }> {
    const existing = await this.prisma.gatewayCustomer.findUnique({
      where: { userId_provider: { userId, provider: PaymentProvider.ASAAS } },
    });

    if (existing) return { externalId: existing.customerId };

    const { externalId } = await this.provider().createCustomer(input);
    try {
      await this.prisma.gatewayCustomer.create({
        data: {
          userId,
          provider: PaymentProvider.ASAAS,
          customerId: externalId,
        },
      });
      return { externalId };
    } catch (error) {
      // P2002 = Another req was created in meantime
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const again = await this.prisma.gatewayCustomer.findUnique({
          where: {
            userId_provider: { userId, provider: PaymentProvider.ASAAS },
          },
        });
        if (again) return { externalId: again.customerId };
      }
      throw error;
    }
  }

  async markOrderPaid(orderId: string, paymentId: string) {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });

      if (!order || order.status !== OrderStatus.PENDING) return;

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.APPROVED, paidAt: new Date() },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PAID },
      });
    });
  }

  async releaseOrder(
    orderId: string,
    paymentId: string,
    paymentStatus: PaymentStatus,
    orderStatus: OrderStatus,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true },
      });
      if (!order || order.status !== OrderStatus.PENDING) return;

      for (const item of order.orderItems) {
        await tx.category.update({
          where: { id: item.categoryId },
          data: { quantity: { increment: item.quantity } },
        });
      }

      await tx.ticket.updateMany({
        where: { orderItem: { orderId } },
        data: { status: TicketStatus.CANCELED },
      });

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: paymentStatus },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: orderStatus },
      });
    });
  }
}
