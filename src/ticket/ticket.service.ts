import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { QueryTicketDto } from './dto/query-ticket.dto';
import type { UserPayload } from 'src/auth/decorators/current-user.decorator';
import { Role } from 'generated/prisma/enums';

@Injectable()
export class TicketService {
  constructor(private prisma: PrismaService) {}

  async findAll(queryDto: QueryTicketDto, userId: string) {
    const {
      page = 1,
      limit = 10,
      code,
      eventId,
      orderId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
    } = queryDto;

    const skip = (page - 1) * limit;
    const orderBy = { [sortBy]: sortOrder };

    const where = {
      ...(status && { status }),
      ...(eventId && { eventId }),
      ...(userId && { userId }),
      ...(code && { code }),
      ...(orderId && { orderItem: { orderId } }),
    };

    const [tickets, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        skip,
        take: Number(limit),
        orderBy,
        where,
        include: {
          event: {
            select: { name: true },
          },
          orderItem: {
            select: { orderId: true, categoryId: true },
          },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data: tickets,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, user: UserPayload) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        orderItem: { include: { order: true, category: true } },
        event: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (user.role !== Role.ADMIN && ticket.userId !== user.id) {
      throw new ForbiddenException('Ticket not found or not yours');
    }

    return ticket;
  }

  async validate(code: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { code },
      include: { event: { include: { venue: true } } },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return {
      ticket: { code, status: ticket.status, createdAt: ticket.createdAt },
      event: {
        name: ticket.event.name,
        startDate: ticket.event.startDate,
        venue: {
          name: ticket.event.venue.name,
          city: ticket.event.venue.city,
          state: ticket.event.venue.state,
        },
      },
      valid: ticket.status === 'VALID' && ticket.event.status === 'PUBLISHED',
    };
  }

  async markAsUsed(id: string, user: UserPayload) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (user.role !== Role.ADMIN && ticket.userId !== user.id) {
      throw new ForbiddenException('Ticket not found or not yours');
    }

    if (ticket.status !== 'VALID') {
      throw new BadRequestException(
        `Ticket is invalid. Current status: ${ticket.status}`,
      );
    }

    const result = await this.prisma.ticket.updateMany({
      where: {
        id,
        status: 'VALID',
      },
      data: {
        status: 'USED',
        usedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new BadRequestException(
        'Ticket was already used or invalidated concurrently',
      );
    }

    return result;
  }
}
