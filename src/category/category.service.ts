import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/prisma.service';
import { QueryCategoryDto } from './dto/query-category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateCategoryDto, eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if(!event || event.organizerId !== userId ) {
      throw new ForbiddenException('Event not found or not yours');
    }
    
    return this.prisma.category.create({ data: { ...data, eventId: eventId } });
  }

  async findAll(query: QueryCategoryDto, eventId: string) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [categories, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        where: { eventId },
      }),
      this.prisma.category.count({ where: { eventId } }),
    ]);

    return {
      data: categories,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { event: true },
    });
    if (!category) {
      throw new NotFoundException('Category with this ID not found');
    }

    return category;
  }

  async update(id: string, data: UpdateCategoryDto) {
    const categoryExist = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!categoryExist) {
      throw new NotFoundException('Category with this ID not found');
    }

    return this.prisma.category.update({
      data: { ...data },
      where: { id },
    });
  }

  async remove(id: string) {
    const categoryExist = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!categoryExist) {
      throw new NotFoundException('Category with this ID not found');
    }

    const orderCount = await this.prisma.orderItem.count({
      where: { categoryId: id },
    });

    if (orderCount > 0) {
      throw new BadRequestException(
        `Cannot delete category: ${orderCount} order item(s) still associated`,
      );
    }

    return this.prisma.category.delete({ where: { id } });
  }
}
