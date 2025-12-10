import { Injectable } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';
import { Resource } from '../../resources/entities/resource.entity';
import { Group } from '../../groups/entities/group.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class PolicyService {
  constructor(
    @InjectRepository(Group)
    private groupRepo: Repository<Group>,
    @InjectRepository(Resource)
    private resourceRepo: Repository<Resource>,
  ) {}

  async checkPermission(user: User, resourceId: number, ip: string): Promise<boolean> {
    // 1. GATE 1: RBAC (The Bouncer)
    // If user is ADMIN, they might bypass everything (Optional)
    // If user is GUEST, they might be rejected
    if (user.role === 'guest') return false; 

    const resource = await this.resourceRepo.findOne({ where: { id: resourceId } });
    if (!resource) return false; // 404

    // 2. GATE 2: ReBAC (The Org Chart)
    // Check if User belongs to the Group that owns this Resource
    const userGroups = await this.groupRepo
      .createQueryBuilder('group')
      .innerJoin('group.users', 'user', 'user.id = :userId', { userId: user.id })
      .getMany();

    const isMember = userGroups.some(g => g.id === resource.ownerGroupId);
    
    // If NOT a member, DENY (unless they are a super admin, but let's stick to strict ReBAC)
    if (!isMember && user.role !== 'admin') {
        return false;
    }

    // 3. GATE 3: ABAC (The Sheriff)
    // If Confidential, MUST be on VPN (e.g., 10.0.0.x)
    if (resource.classification === 'Confidential') {
        // Simple check: "Is IP starting with 10.?"
        const isVpn = ip.startsWith('10.') || ip === '127.0.0.1'; // Allow localhost for dev
        if (!isVpn) return false;
    }

    // ALL GATES PASSED
    return true;
  }
}
