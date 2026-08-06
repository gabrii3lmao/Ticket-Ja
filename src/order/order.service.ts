import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from 'src/prisma.service';
import { Category, Prisma } from 'generated/prisma/client';
import { PrismaClientKnownRequestError } from 'generated/prisma/internal/prismaNamespace';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrderService {
  private readonly FEE_RATE = 0.05;
  constructor(private prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
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

      await tx.payment.create({
        data: {
          orderId: order.id,
          amount: order.total,
          provider: 'ASAAS',
          paymentMethod: 'PIX',
          status: 'PENDING',
        },
      });

      return order;
    });
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
  ): { subtotal: number; fee: number; total: number } {
    const subtotal = +itemsData
      .reduce((acc, { category, quantity }) => {
        return acc + Number(category.price) * quantity;
      }, 0)
      .toFixed(2);

    const fee = +(subtotal * this.FEE_RATE).toFixed(2);
    const total = +(subtotal + fee).toFixed(2);

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
    amounts: { subtotal: number; fee: number; total: number },
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
            total: +(Number(category.price) * quantity).toFixed(2),
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
}
