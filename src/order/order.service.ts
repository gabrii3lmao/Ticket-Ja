import {
  BadRequestException,
  Injectable,
  NotFoundException,
  BadGatewayException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from 'src/prisma.service';
import {
  Category,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from 'generated/prisma/client';
import {
  Decimal,
  PrismaClientKnownRequestError,
} from 'generated/prisma/internal/prismaNamespace';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaymentService } from 'src/payment/payment.service';

@Injectable()
export class OrderService {
  private readonly FEE_RATE = new Decimal('0.05');
  private readonly PIX_EXPIRATION_MS = 30 * 60 * 1000; // 30 min
  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: string) {
    const { order, payment } = await this.prisma.$transaction(async (tx) => {
      // Phase 1: validate and reserve stock
      const itemsData = await this.reserveAndValidateStock(
        tx,
        createOrderDto.items,
      );

      // Phase 2: calculate amounts
      const { subtotal, fee, total } = this.calculateAmount(itemsData);

      // Phase 3: create Order + OrderItems + tickets
      const order = await this.persistOrder(tx, userId, itemsData, {
        subtotal,
        fee,
        total,
      });

      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          amount: order.total,
          provider: PaymentProvider.ASAAS,
          paymentMethod: PaymentMethod.PIX,
          status: PaymentStatus.PENDING,
        },
      });

      return { order, payment };
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new NotFoundException('User not found');

    try {
      const { externalId: customerExternalId } =
        await this.paymentService.ensureGatewayCustomer(userId, {
          name: user.name,
          email: user.email,
          taxId: user.taxId ?? undefined,
        });

      const charge = await this.paymentService.createPayment({
        customerExternalId,
        amount: order.total.toNumber(),
        method: PaymentMethod.PIX,
        dueDate: this.pixDueDate(),
      }); // now + 30min}

      const updatedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          externalId: charge.externalId,
          providerData: charge.providerData as Prisma.InputJsonValue,
          dueDate: charge.dueDate,
          status: charge.status,
        },
      });
      return { ...order, payment: updatedPayment };
    } catch (error) {
      throw new BadGatewayException('Payment gateway unavailable');
    }
  }

  private async reserveAndValidateStock(
    tx: Prisma.TransactionClient,
    items: CreateOrderDto['items'],
  ): Promise<Array<{ category: Category; quantity: number }>> {
    const itemsById = items.reduce<Map<string, number>>((acc, item) => {
      acc.set(item.categoryId, (acc.get(item.categoryId) ?? 0) + item.quantity);
      return acc;
    }, new Map());

    const categories = await tx.category.findMany({
      where: { id: { in: [...itemsById.keys()] } },
      include: { event: true },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const now = new Date();

    for (const [categoryId, quantity] of itemsById) {
      const category = categoryMap.get(categoryId);

      if (!category) {
        throw new NotFoundException(`Category "${categoryId}" not found`);
      }

      // Event must be PUBLISHED to allow ticket sales
      if (category.event.status !== 'PUBLISHED') {
        throw new BadRequestException(
          `Event "${category.event.name}" is not published (current status: ${category.event.status})`,
        );
      }

      // validate sales window
      if (category.salesStart && now < category.salesStart) {
        throw new BadRequestException(
          `Sales for "${category.name}" start on ${category.salesStart.toISOString()}`,
        );
      }
      if (category.salesEnd && now > category.salesEnd) {
        throw new BadRequestException(
          `Sales for "${category.name}" ended on ${category.salesEnd.toISOString()}`,
        );
      }

      if (category.event.startDate && category.event.startDate < now) {
        throw new BadRequestException(
          `Event "${category.event.name}" has already begun`,
        );
      }

      if (category.quantity < quantity) {
        throw new BadRequestException(
          `Insufficient tickets for "${category.name}" (requested: ${quantity}, available: ${category.quantity})`,
        );
      }
    }

    await Promise.all(
      [...itemsById].map(async ([categoryId, quantity]) => {
        const category = categoryMap.get(categoryId)!;

        try {
          await tx.category.update({
            where: { id: categoryId, quantity: { gte: quantity } },
            data: { quantity: { decrement: quantity } },
          });
        } catch (error) {
          if (
            error instanceof PrismaClientKnownRequestError &&
            error.code === 'P2025'
          ) {
            throw new BadRequestException(
              `Insufficient tickets for "${category.name}" ` +
                `(requested: ${quantity}, available: ${category.quantity})`,
            );
          }
          throw error;
        }
      }),
    );

    return [...itemsById].map(([categoryId, quantity]) => ({
      category: categoryMap.get(categoryId)!,
      quantity,
    }));
  }

  private calculateAmount(
    itemsData: Array<{ category: Category; quantity: number }>,
  ) {
    const subtotal = itemsData.reduce((acc, { category, quantity }) => {
      return acc.plus(category.price.times(quantity));
    }, new Prisma.Decimal(0));

    const fee = subtotal.times(this.FEE_RATE).toDecimalPlaces(2);
    const total = subtotal.plus(fee);

    return {
      subtotal,
      fee,
      total,
    };
  }

  private buildTickets(
    quantity: number,
    userId: string,
    eventId: string,
  ): Array<{
    code: string;
    qrCode: string;
    user: { connect: { id: string } };
    event: { connect: { id: string } };
  }> {
    return Array.from({ length: quantity }, () => {
      const code = `TKT-${randomBytes(12).toString('base64url')}`;
      return {
        code,
        qrCode: `http://localhost:3000/api/ticket/validate/${code}`,
        user: { connect: { id: userId } },
        event: { connect: { id: eventId } },
      };
    });
  }

  private async persistOrder(
    tx: Prisma.TransactionClient,
    userId: string,
    itemsData: Array<{ category: Category; quantity: number }>,
    amounts: { subtotal: Decimal; fee: Decimal; total: Decimal },
  ) {
    return tx.order.create({
      data: {
        userId,
        subtotal: amounts.subtotal,
        discount: 0,
        fee: amounts.fee,
        total: amounts.total,
        orderItems: {
          create: itemsData.map(({ category, quantity }) => ({
            category: { connect: { id: category.id } },
            quantity,
            unitPrice: category.price,
            total: category.price.times(quantity),
            tickets: {
              create: this.buildTickets(quantity, userId, category.eventId),
            },
          })),
        },
      },
      include: {
        orderItems: {
          include: { tickets: true },
        },
      },
    });
  }

  private pixDueDate() {
    const now = new Date();
    return new Date(now.getTime() + this.PIX_EXPIRATION_MS);
  }
}
