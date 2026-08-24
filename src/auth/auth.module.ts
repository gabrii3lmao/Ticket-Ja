import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from 'src/user/user.module';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategy/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ActiveUserPipe } from './pipes/active-user.pipe';
import { RefreshTokenService } from './refresh-token.service';
import { PrismaModule } from 'src/prisma.module';

@Module({
  controllers: [AuthController],
  imports: [
    PrismaModule,
    UserModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRATION', '15m'),
        },
      }),
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    ActiveUserPipe,
    RefreshTokenService,
    JwtService,
  ],
})
export class AuthModule {}
