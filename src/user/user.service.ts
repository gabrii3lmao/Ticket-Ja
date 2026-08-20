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
import { OrganizerDto } from 'src/auth/dto/register.dto';

@Injectable()
export class UserService {
  private readonly SALT_ROUNDS = 10;

  constructor(private prisma: PrismaService) {}

  async create(
    data: CreateUserDto,
    organizer?: OrganizerDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    await this.ensureEmailIsUnique(data.email);

    if (organizer) {
      await this.ensureDocumentIsUnique(organizer.document);
    }

    const hashedPassword = await bcrypt.hash(data.password, this.SALT_ROUNDS);

    const newUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash: hashedPassword,
        },
      });

      if (organizer) {
        await tx.organizerAplication.create({
          data: {
            legalName: organizer.legalName,
            tradeName: organizer.tradeName,
            document: organizer.document,
            userId: user.id,
            status: 'PENDING',
          },
        });
      }

      return user;
    });

    const safeUser = { ...newUser };
    // @ts-expect-error - remove sensitive field before returning
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

  private async ensureDocumentIsUnique(document: string) {
    const [application, profile] = await Promise.all([
      this.prisma.organizerAplication.findUnique({ where: { document } }),
      this.prisma.organizerProfile.findUnique({ where: { document } }),
    ]);

    if (application || profile) {
      throw new ConflictException('This document already has an account.');
    }
  }
}
