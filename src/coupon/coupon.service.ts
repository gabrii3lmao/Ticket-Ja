import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, DiscountType } from 'generated/prisma/enums';
import { UserPayload } from 'src/auth/decorators/current-user.decorator';
import { PrismaService } from 'src/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { QueryCouponDto } from './dto/query-coupon.dto';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class CouponService {
  constructor(private prisma: PrismaService) {}

  async create(eventId: string, user: UserPayload, data: CreateCouponDto) {
    const event = await this.getAndValidateOwnedEvent(eventId, user);

    this.assertCouponValue(data.discountType, data.value);

    return this.prisma.coupon.create({
      data: {
        ...data,
        code: data.code.trim().toUpperCase(),
        eventId: event.id,
      },
    });
  }

  async getAll(user: UserPayload, eventId: string, query: QueryCouponDto) {
    const { limit = 10, page = 1, code, discountType } = query;
    const event = await this.getAndValidateOwnedEvent(eventId, user);

    const skip = (page - 1) * limit;

    const where: Prisma.CouponWhereInput = {
      code: code ? { contains: code, mode: 'insensitive' } : undefined,
      eventId: event.id,
      discountType: discountType || undefined,
    };

    const [coupons, total] = await this.prisma.$transaction([
      this.prisma.coupon.findMany({
        where,
        skip,
        take: Number(limit),
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return {
      data: coupons,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOne(user: UserPayload, eventId: string, id: string) {
    const event = await this.getAndValidateOwnedEvent(eventId, user);

    const coupon = await this.prisma.coupon.findUnique({
      where: { id, eventId: event.id },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return coupon;
  }

  async update(
    id: string,
    eventId: string,
    user: UserPayload,
    data: UpdateCouponDto,
  ) {
    const event = await this.getAndValidateOwnedEvent(eventId, user);

    const coupon = await this.prisma.coupon.findUnique({
      where: { id, eventId: event.id },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    if (data.discountType !== undefined && data.value !== undefined) {
      this.assertCouponValue(data.discountType, data.value);
    }

    return this.prisma.coupon.update({
      where: { id: coupon.id },
      data: data.code
        ? { ...data, code: data.code.trim().toUpperCase() }
        : data,
    });
  }

  async delete(id: string, eventId: string, user: UserPayload) {
    const event = await this.getAndValidateOwnedEvent(eventId, user);

    const coupon = await this.prisma.coupon.findUnique({
      where: { id, eventId: event.id },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return this.prisma.coupon.delete({ where: { id } });
  }

  private assertCouponValue(discountType: DiscountType, value: number): void {
    if (value <= 0) {
      throw new BadRequestException('Coupon value must be greater than zero');
    }

    if (discountType === DiscountType.PERCENTAGE && value > 100) {
      throw new BadRequestException(
        'Percentage coupon value must not exceed 100',
      );
    }
  }

  private async getAndValidateOwnedEvent(eventId: string, user: UserPayload) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { organizerProfile: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (user.role !== Role.ADMIN && event.organizerProfile.userId !== user.id) {
      throw new ForbiddenException('Event not found or not yours');
    }

    return event;
  }
}
