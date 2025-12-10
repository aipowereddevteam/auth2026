import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // Import TypeORM
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';   // Import the Entity you just made

@Module({
  imports: [TypeOrmModule.forFeature([User])],   // <--- This line creates the DB table
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}