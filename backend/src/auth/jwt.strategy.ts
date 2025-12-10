import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis
  ) {
    super({
      // 1. Where do we get the token? -> From the "Authorization: Bearer <token>" header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // 2. Secret Key (Must match the one in auth.module.ts)
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback_secret', 
      passReqToCallback: true, // <--- Enable req access
    });
  }

  // 3. If the token is valid, this function runs
  async validate(req: any, payload: any) {
    // 4. Check Blacklist (Redis)
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (token) {
        const isBlacklisted = await this.redis.get(`blacklist:${token}`);
        if (isBlacklisted) throw new UnauthorizedException('Token revoked');
    }

    // This object becomes "req.user" in your controllers
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}