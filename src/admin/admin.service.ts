import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { QueryOrganizerApplication } from './dto/query-organizer-application.dto';
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  Role,
} from 'generated/prisma/client';
import { RejectReasonDto } from './dto/rejected-reason.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { PaymentService } from 'src/payment/payment.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
  ) {}

  async listOrganizerApplications(query: QueryOrganizerApplication) {
    const {
      page = 1,
      limit = 10,
      legalName,
      tradeName,
      status,
      document,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const orderBy = { [sortBy]: sortOrder };

    const where: Prisma.OrganizerAplicationWhereInput = {
      status,
      document,
      legalName: legalName
        ? { contains: legalName, mode: 'insensitive' }
        : undefined,
      tradeName: tradeName
        ? { contains: tradeName, mode: 'insensitive' }
        : undefined,
    };

    const [data, total] = await Promise.all([
      this.prisma.organizerAplication.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: { id: true, email: true, name: true, createdAt: true },
          },
        },
      }),
      this.prisma.organizerAplication.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async approveOrganizerApplication(id: string) {
    const application = await this.prisma.organizerAplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('Organizer application not found');
    }

    if (application.status !== 'PENDING') {
      throw new BadRequestException(
        'Only PENDING applications can be approved',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const organizerProfile = await tx.organizerProfile.create({
        data: {
          legalName: application.legalName,
          tradeName: application.tradeName,
          document: application.document,
          userId: application.userId,
        },
      });

      await tx.user.update({
        where: { id: application.userId },
        data: { role: Role.ORGANIZER },
      });

      await tx.organizerAplication.delete({ where: { id } });

      return organizerProfile;
    });
  }

  async rejectOrganizerApplication(id: string, dto: RejectReasonDto) {
    const application = await this.prisma.organizerAplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('Organizer application not found');
    }

    if (application.status !== 'PENDING') {
      throw new BadRequestException(
        'Only PENDING applications can be rejected',
      );
    }

    return this.prisma.organizerAplication.update({
      where: { id },
      data: { status: 'REJECTED', rejectedReason: dto.rejectReason },
    });
  }

  async listOrders(query: QueryOrderDto) {
    const {
      limit = 10,
      page = 1,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status = 'PENDING',
    } = query;

    const skip = (page - 1) * limit;
    const orderBy = { [sortBy]: sortOrder };

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { status },
        skip,
        orderBy,
      }),
      this.prisma.order.count({ where: { status } }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOrderDetail(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: true,
        payment: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            taxId: true,
            phone: true,
          },
        },
      },
    });
  }

  async confirmPayment(orderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return this.paymentService.markOrderPaid(orderId, payment.id);
  }

  async rejectPayment(orderId: string, reason?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    await this.prisma.payment.update({
      where: { orderId },
      data: { rejectReason: reason, rejectedAt: new Date() },
    });

    return this.paymentService.releaseOrder(
      orderId,
      payment.id,
      PaymentStatus.REJECTED,
      OrderStatus.CANCELED,
    );
  }
}
