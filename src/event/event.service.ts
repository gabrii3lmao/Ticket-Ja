import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { Event } from 'generated/prisma/client';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateEventDto, userId: string): Promise<Event> {
    return this.prisma.event.create({ data: { ...data, userId: userId } });
  }

  async findOne(id: string): Promise<Event | null> {
    return this.prisma.event.findUnique({ where: { id } });
  }

  async findAll(): Promise<Event[]> {
    return this.prisma.event.findMany();
  }

  async findManyByUserId(userId: string): Promise<Event[]> {
    return this.prisma.event.findMany({ where: { userId } });
  }

  async update(id: string, data: UpdateEventDto): Promise<Event> {
    const eventExist = await this.prisma.event.findUnique({ where: { id } });
    if (!eventExist) {
      throw new NotFoundException('Event with this ID not found');
    }
    return this.prisma.event.update({ where: { id }, data: { ...data } });
  }

  async delete(id: string): Promise<Event> {
    const eventExist = await this.prisma.event.findUnique({ where: { id } });
    if (!eventExist) {
      throw new NotFoundException('Event with this ID not found');
    }
    return this.prisma.event.delete({ where: { id } });
  }
}
