import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { PaymentService } from '../payment.service';
import {
  PaymentProvider,
  PaymentStatus,
  OrderStatus,
} from 'generated/prisma/enums';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class AsaasWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
  ) {}

  async handleWebhook(payload: Record<string, any>) {
    const event = payload?.event as string;
    const externalId = payload?.payment?.id as string | undefined;

    if (!event || !externalId) {
      throw new BadRequestException(
        'Missing "event" or "payment.id" in webhook payload',
      );
    }

    const eventId = `${externalId}:${event}`;

    const alreadyProcessed = await this.prisma.paymentWebhookEvent.findUnique({
      where: {
        provider_eventId: {
          provider: PaymentProvider.ASAAS,
          eventId,
        },
      },
    });

    if (alreadyProcessed) {
      return { received: true, processed: false, reason: 'duplicate' };
    }

    const payment = await this.prisma.payment.findFirst({
      where: { provider: PaymentProvider.ASAAS, externalId },
    });

    if (!payment) {
      // orfan Event
      await this.recordEvent(eventId, event, payload);
      return { received: true, processed: false, reason: 'payment_not_found' };
    }
    switch (event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        await this.paymentService.markOrderPaid(payment.orderId, payment.id);
        break;

      case 'PAYMENT_OVERDUE':
      case 'PAYMENT_CANCELED':
      case 'PAYMENT_FAILED':
        await this.paymentService.releaseOrder(
          payment.orderId,
          payment.id,
          PaymentStatus.FAILED,
          OrderStatus.CANCELED,
        );
        break;

      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_CHARGEBACK_REQUESTED':
        await this.paymentService.releaseOrder(
          payment.orderId,
          payment.id,
          PaymentStatus.REFUNDED,
          OrderStatus.REFUNDED,
        );
        break;

      default:
        // fora do fluxo (PAYMENT_ANTICIPATED, PAYMENT_DUNNING_*, ...): nada
        break;
    }

    // registra SÓ depois de processar com sucesso:
    // se alguma transição lançar, não grava e o ASAAS reenvia
    await this.recordEvent(eventId, event, payload);

    return { received: true, processed: true };
  }

  private async recordEvent(
    eventId: string,
    event: string,
    payload: Record<string, any>,
  ) {
    await this.prisma.paymentWebhookEvent.create({
      data: {
        provider: PaymentProvider.ASAAS,
        eventId,
        eventType: event,
        payload: payload as Prisma.InputJsonValue,
        processedAt: new Date(),
      },
    });
  }
}
