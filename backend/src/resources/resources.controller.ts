import { Controller, Get, Param, UseGuards, Request, Post, Body } from '@nestjs/common';
import { ResourcesModule } from './resources.module';
import { AuthGuard } from '@nestjs/passport';
import { PoliciesGuard } from '../auth/guards/policies.guard';

@Controller('resources')
export class ResourcesController {
  
  // 1. GATE 0: Basic Auth (Must be logged in)
  // 2. GATE 1-3: PoliciesGuard checks RBAC -> ReBAC -> ABAC
  
  @UseGuards(AuthGuard('jwt'), PoliciesGuard)
  @Get(':id')
  async getResource(@Param('id') id: string, @Request() req) {
      return {
          message: 'Access Granted! You passed the Gantlet.',
          resourceId: id,
          user: req.user.email,
          context: {
              ip: req.ip,
              timestamp: new Date().toISOString()
          }
      };
  }
}
