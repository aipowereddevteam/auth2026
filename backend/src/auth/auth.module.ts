import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module'; 
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { PolicyService } from './policies/policy.service';
import { GroupsModule } from '../groups/groups.module';
import { ResourcesModule } from '../resources/resources.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    UsersModule, 
    GroupsModule,
    ResourcesModule,
    AuditModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        global: true,
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy, PolicyService],
  exports: [AuthService, PolicyService], 
})
export class AuthModule {}