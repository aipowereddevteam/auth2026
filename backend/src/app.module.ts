import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module'; 
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { AuditModule } from './audit/audit.module';
import { RedisModule } from './redis/redis.module';
import { GroupsModule } from './groups/groups.module';
import { ResourcesModule } from './resources/resources.module';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ limit: 10, ttl: 60000 }],
        storage: new ThrottlerStorageRedisService(
             `redis://${config.get('REDIS_HOST', 'localhost')}:${config.get('REDIS_PORT', 6379)}`
        ),
      }),
    }),
    ConfigModule.forRoot({
      isGlobal: true, 
      envFilePath: ['../.env', '.env'], 
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'postgres'),
        password: config.get<string>('DB_PASS', 'root'), 
        database: config.get<string>('DB_NAME', 'monolith_db'),
        entities: [], 
        synchronize: true, // Auto-schema update (dev only)
        autoLoadEntities: true, 
      }),
    }),
    UsersModule,
    AuthModule,
    AuditModule, 
    RedisModule, 
    GroupsModule,
    ResourcesModule, 
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}