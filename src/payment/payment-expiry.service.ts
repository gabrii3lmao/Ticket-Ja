import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderStatus, PaymentStatus } from 'generated/prisma/enums';
import { PrismaService } from 'src/prisma.service';
import { PaymentService } from './payment.service';

@Injectable()
export class PaymentExpiryService {
  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
  ) {}
  @Cron(CronExpression.EVERY_5_MINUTES)
  async expirePendingPayments() {
    const expired = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.PENDING,
        dueDate: {
          lt: new Date(),
        },
        order: { status: OrderStatus.PENDING },
      },
      include: { order: true },
    });

    for (const p of expired) {
      if (p.externalId) {
        try {
          await this.paymentService.cancelPayment(p.externalId);
        } catch {
          /* Pagamento indisponivel, segue o jogo */
        }
      }
      await this.paymentService.releaseOrder(
        p.orderId,
        p.id,
        PaymentStatus.FAILED,
        OrderStatus.CANCELED,
      );
    }
  }
}
