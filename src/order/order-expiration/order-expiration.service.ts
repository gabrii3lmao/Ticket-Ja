import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderStatus, PaymentStatus } from 'generated/prisma/enums';
import { PaymentService } from 'src/payment/payment.service';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class OrderExpirationService {
  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
  ) {}
  @Cron(CronExpression.EVERY_MINUTE)
  async expirePendingReservations(): Promise<number> {
    const orders = await this.getPendingOrders();

    await Promise.all(
      orders.map((order) =>
        this.paymentService.releaseOrder(
          order.id,
          order.payment!.id,
          PaymentStatus.REJECTED,
          OrderStatus.CANCELED,
          'Reservation TTL expired',
        ),
      ),
    );

    return orders.length;
  }

  private async getPendingOrders() {
    const now = new Date();
    return this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        reservedUntil: { lte: now },
        payment: { isNot: null },
      },
      include: {
        payment: true,
      },
    });
  }
}
