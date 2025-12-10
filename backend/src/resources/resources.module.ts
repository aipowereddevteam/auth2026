import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resource } from './entities/resource.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Resource])],
  exports: [TypeOrmModule], // Exports Repository<Resource>
})
export class ResourcesModule {}
