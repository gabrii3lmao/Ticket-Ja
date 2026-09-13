import { Injectable } from '@nestjs/common';
import {
  OrderStatus,
  PaymentStatus,
  TicketStatus,
} from 'generated/prisma/enums';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  async markOrderPaid(orderId: string, paymentId: string) {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });

      if (!order || order.status !== OrderStatus.PENDING) return;

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.APPROVED, confirmedAt: new Date() },
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
    reason?: string,
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

      const updateData: Prisma.PaymentUpdateInput = {
        status: paymentStatus,
      };

      if (reason) {
        updateData.rejectReason = reason;
        updateData.rejectedAt = new Date();
      }

      await tx.payment.update({
        where: { id: paymentId },
        data: updateData,
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: orderStatus },
      });
    });
  }
}
