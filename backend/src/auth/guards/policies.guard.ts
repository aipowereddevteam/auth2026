import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PolicyService } from '../policies/policy.service';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private policyService: PolicyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const ip = request.ip || request.connection.remoteAddress;
    
    // Assume Resource ID is in params for this demo
    const resourceId = parseInt(request.params.id, 10); 
    
    if (!user || !resourceId) {
        // If not a resource-specific endpoint, or user not logged in, maybe skip?
        // But for this guard, we enforce strict checking.
        return false;
    }

    const hasPermission = await this.policyService.checkPermission(user, resourceId, ip);
    if (!hasPermission) {
        throw new ForbiddenException('Access Denied by Hybrid Policy (RBAC/ReBAC/ABAC)');
    }

    return true;
  }
}
