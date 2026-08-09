import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { User } from 'generated/prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  private readonly SALT_ROUNDS = 10;

  constructor(private prisma: PrismaService) {}

  async create(data: CreateUserDto): Promise<Omit<User, 'passwordHash'>> {
    await this.ensureEmailIsUnique(data.email);

    const hashedPassword = await bcrypt.hash(data.password, this.SALT_ROUNDS);

    const newUser = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: hashedPassword,
      },
    });

    const safeUser = { ...newUser };
    //@ts-expect-error: delete is recomended
    delete safeUser.passwordHash;
    return safeUser;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async deleteUser(id: string): Promise<User | undefined> {
    const existingUser = await this.prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      throw new NotFoundException('User with this ID not found');
    }

    const organizer = await this.prisma.organizerProfile.findUnique({
      where: { userId: id },
    });

    const orderCount = await this.prisma.order.count({ where: { userId: id } });
    if (orderCount > 0) {
      throw new BadRequestException(
        `Cannot delete account: ${orderCount} order(s) still associated`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (organizer) {
        await tx.event.deleteMany({
          where: { organizerProfileId: organizer.id },
        });
        await tx.venue.deleteMany({
          where: { organizerProfileId: organizer.id },
        });
        await tx.organizerProfile.deleteMany({ where: { userId: id } });
      }
      return tx.user.delete({ where: { id } });
    });
  }

  private async ensureEmailIsUnique(email: string): Promise<void> {
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new ConflictException(
        'An account with this email address already exists.',
      );
    }
  }
}
