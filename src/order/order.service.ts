import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from 'src/prisma.service';
import { Category } from 'generated/prisma/client';
import { PrismaClientKnownRequestError } from 'generated/prisma/internal/prismaNamespace';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrderService {
  private readonly FEE_RATE = 0.05;
  constructor(private prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const itemsData: Array<{ category: Category; quantity: number }> = [];

      // Phase 1: validate and reserve stock
      for (const item of createOrderDto.items) {
        const category = await tx.category.findUnique({
          where: { id: item.categoryId },
        });

        if (!category) {
          throw new NotFoundException(
            `Category "${item.categoryId}" not found`,
          );
        }

        // validate sales window
        const now = new Date();
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

        // atomic decrement with stock guard
        try {
          await tx.category.update({
            where: { id: item.categoryId, quantity: { gte: item.quantity } },
            data: { quantity: { decrement: item.quantity } },
          });
        } catch (error) {
          if (
            error instanceof PrismaClientKnownRequestError &&
            error.code === 'P2025'
          ) {
            throw new BadRequestException(
              `Insufficient tickets for "${category.name}" ` +
                `(requested: ${item.quantity}, available: ${category.quantity})`,
            );
          }
          throw error;
        }
        itemsData.push({ category, quantity: item.quantity });
      }

      // Phase 2: calculate amounts
      const subtotal = +itemsData
        .reduce((acc, { category, quantity }) => {
          return acc + Number(category.price) * quantity;
        }, 0)
        .toFixed(2);

      const fee = +(subtotal * this.FEE_RATE).toFixed(2);
      const total = +(subtotal + fee).toFixed(2);

      // Phase 3: create Order + OrderItems + tickets
      const order = await tx.order.create({
        data: {
          userId,
          subtotal,
          discount: 0,
          fee,
          total,
          orderItems: {
            create: itemsData.map(({ category, quantity }) => ({
              categoryId: category.id,
              quantity,
              unitPrice: category.price,
              total: +(Number(category.price) * quantity).toFixed(2),
              tickets: {
                create: Array.from({ length: quantity }, () => {
                  const code = `TKT-${randomUUID().split('-')[0].toUpperCase()}`;
                  return {
                    code,
                    qrCode: `http://localhost:3000/api/ticket/validate/${code}`,
                  };
                }),
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
}
