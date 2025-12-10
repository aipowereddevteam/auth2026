import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  async log(action: string, userId?: number, ip?: string, userAgent?: string, details?: string) {
    const log = this.auditRepository.create({
      action,
      userId,
      ip,
      userAgent,
      details,
    });
    // We don't await this to avoid blocking the main request flow (fire and forget)
    // In critical systems, you might want to await or put into a queue
    this.auditRepository.save(log).catch(err => console.error('Audit Log Failed', err));
  }
}
