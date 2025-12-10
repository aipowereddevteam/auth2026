import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as fs from 'fs';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

import { AuditService } from '../audit/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService, 
    private jwtService: JwtService,
    private auditService: AuditService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis // <--- Inject Redis
  ) {}

  // 1. LOGIN LOGIC
  async signIn(email: string, pass: string, ip: string, userAgent: string) {
    const user = await this.usersService.findOneByEmail(email); 

    if (!user || !(await bcrypt.compare(pass, user.password))) {
      await this.auditService.log('LOGIN_FAIL', undefined, ip, userAgent, `Email: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isMfaEnabled) {
      // OLD: const payload = { sub: user.id, email: user.email, isMfaPending: true };
      // OLD: temp_token: await this.jwtService.signAsync(payload, { expiresIn: '5m' }), 
      
      // NEW: Redis Stateful Session
      const sessionId = uuidv4();
      await this.redis.set(`mfa_session:${sessionId}`, user.id, 'EX', 120); // 2 mins TTL

      return {
        status: 'mfa_required',
        mfa_session_id: sessionId, // Client sends this back
      };
    }

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refresh_token);
    await this.auditService.log('LOGIN_SUCCESS', user.id, ip, userAgent);
    
    return tokens;
  }

  // --- HELPER: GENERATE BOTH TOKENS ---
  async getTokens(userId: number, email: string, role: string) {
      const payload = { sub: userId, email, role };
      const [at, rt] = await Promise.all([
          this.jwtService.signAsync(payload, { expiresIn: '15m' }), // Short lived
          this.jwtService.signAsync(payload, { expiresIn: '7d' }),  // Long lived
      ]);
      return {
          access_token: at,
          refresh_token: rt,
      };
  }

  async updateRefreshToken(userId: number, refreshToken: string) {
      await this.usersService.setRefreshToken(userId, refreshToken);
  }

  // --- REFRESH TOKEN LOGIC ---
  async refreshTokens(refreshToken: string) {
      // 1. Check Blacklist
      const isBlacklisted = await this.redis.get(`blacklist:${refreshToken}`);
      if (isBlacklisted) throw new UnauthorizedException('Token revoked');

      try {
          // 2. Decode Token to get User ID
          const payload = await this.jwtService.verifyAsync(refreshToken);
          const userId = payload.sub;

          const user = await this.usersService.findOneById(userId);
          if (!user || !user.hashedRefreshToken) throw new UnauthorizedException('Access Denied');

          const rtMatches = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
          if (!rtMatches) throw new UnauthorizedException('Access Denied');

          const tokens = await this.getTokens(user.id, user.email, user.role);
          await this.updateRefreshToken(user.id, tokens.refresh_token);
          return tokens;
      } catch (e) {
          throw new UnauthorizedException('Invalid Refresh Token');
      }
  }

  // 2. MFA: GENERATE SECRET & QR CODE
  async generateMfaSecret(userId: number, email: string) {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(email, 'MyMonolithApp', secret);

    await this.usersService.updateMfaSecret(userId, secret);
    await this.auditService.log('MFA_GENERATE', userId);

    return {
      secret,
      qrCode: await qrcode.toDataURL(otpauthUrl),
    };
  }

  async verifyMfa(userId: number, token: string) {
    const user = await this.usersService.findOneById(userId);
    if (!user || !user.mfaSecret) {
        throw new UnauthorizedException('User not found or MFA not setup');
    }
    
    // Increase window to allow large out-of-sync clocks (±2 minutes)
    authenticator.options = { window: 4 };
    
    // Check if secret is just text or a proper base32 string (Google Auth expects Base32)
    // We generated it with authenticator.generateSecret() so it should be fine.
    
    // DEBUG: Generate the token we expect
    const expectedToken = authenticator.generate(user.mfaSecret);
    console.log(`[MFA_DEBUG] Server Time: ${new Date().toISOString()}`);
    console.log(`[MFA_DEBUG] Expected Token: ${expectedToken} vs Received: ${token}`);

    const isValid = authenticator.verify({ token, secret: user.mfaSecret });
    
    if (!isValid) { 
        console.log(`[MFA_DEBUG] Verify failed for user ${userId}. Token: ${token}, Secret: ${user.mfaSecret}`);
        throw new UnauthorizedException('Invalid MFA code');
    }
    return isValid;
  }
  
  // --- HELPER: GENERATE BACKUP CODES ---
  private async generateBackupCodes(userId: number) {
      const codes = Array.from({ length: 10 }, () => uuidv4().slice(0, 8).toUpperCase()); // 8-char codes
      
      // Hash them individually
      const hashedCodes = await Promise.all(codes.map(code => bcrypt.hash(code, 10)));
      
      await this.usersService.updateBackupCodes(userId, hashedCodes);
      return codes; 
  }

  async verifyMfaAndLogin(sessionId: string, code: string) {
      // 1. Retrieve User ID from Redis
      const userIdStr = await this.redis.get(`mfa_session:${sessionId}`);
      if (!userIdStr) {
          throw new UnauthorizedException('Session expired or invalid');
      }
      const userId = parseInt(userIdStr, 10);
      const user = await this.usersService.findOneById(userId);

      if (!user) throw new UnauthorizedException('User not found');

      console.log(`[MFA_DEBUG] Login attempt for user ${userId} with code ${code}`);

      // 2. Verify Code (TOTP or Backup Code)
      let isValid = false;
      
      // First, try TOTP
      try {
          isValid = await this.verifyMfa(userId, code);
          console.log('[MFA_DEBUG] TOTP Valid');
      } catch (e) {
         console.log('[MFA_DEBUG] TOTP Invalid, checking backup codes...');
      }

      // If TOTP failed, try Backup Codes
      if (!isValid && user.backupCodes) {
          for (const hashedCode of user.backupCodes) {
              if (await bcrypt.compare(code, hashedCode)) {
                  isValid = true;
                  // Remove the used code
                  const newCodes = user.backupCodes.filter(c => c !== hashedCode);
                  await this.usersService.updateBackupCodes(userId, newCodes);
                  await this.auditService.log('MFA_BACKUP_CODE_USED', userId);
                  console.log('[MFA_DEBUG] Backup Code Valid');
                  break;
              }
          }
      }

      if (!isValid) throw new UnauthorizedException('Invalid MFA code');
      
      // 3. Prevent Replay (Delete Session)
      await this.redis.del(`mfa_session:${sessionId}`);

      const tokens = await this.getTokens(userId, user.email, user.role);
      await this.updateRefreshToken(userId, tokens.refresh_token);
      
      await this.auditService.log('LOGIN_MFA_SUCCESS', userId);
      return tokens;
  }

  async enableMfa(userId: number, code: string) {
      await this.verifyMfa(userId, code);
      await this.usersService.updateMfaEnabled(userId, true);
      
      // Generate and return backup codes
      const backupCodes = await this.generateBackupCodes(userId);
      
      await this.auditService.log('MFA_ENABLE', userId);
      return { message: 'MFA Enabled Successfully', backupCodes }; 
  }

  async disableMfa(userId: number) {
      await this.usersService.disableMfa(userId);
      await this.auditService.log('MFA_DISABLE', userId);
      return { message: 'MFA Disabled Successfully' };
  }

  // 5. GOOGLE LOGIN
  async handleGoogleLogin(profile: any, ip: string, userAgent: string) {
    const email = profile.emails[0].value;
    fs.appendFileSync('auth-debug.log', `[GOOGLE_LOGIN] Email from Google: ${email}\n`);
    let user = await this.usersService.findOneByEmail(email);
    if (user) {
        fs.appendFileSync('auth-debug.log', `[GOOGLE_LOGIN] Found existing user: ID=${user.id}, Email=${user.email}\n`);
    } else {
        fs.appendFileSync('auth-debug.log', `[GOOGLE_LOGIN] No user found for ${email}, creating new...\n`);
    }

    if (!user) {
        const password = Math.random().toString(36).slice(-8);
        user = await this.usersService.create({ email, password });
        user.googleId = profile.id; 
        await this.usersService.save(user); // Explicit save for googleId update
        await this.auditService.log('REGISTER_GOOGLE', user.id, ip, userAgent);
    } else {
        if (!user.googleId) {
            user.googleId = profile.id;
            await this.usersService.save(user);
        }
    }

    if (user.isMfaEnabled) {
       // NEW: Redis Stateful Session
      const sessionId = uuidv4();
      await this.redis.set(`mfa_session:${sessionId}`, user.id, 'EX', 120); // 2 mins TTL

      return {
        status: 'mfa_required',
        mfa_session_id: sessionId,
      };
    }

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refresh_token);
    await this.auditService.log('LOGIN_GOOGLE_SUCCESS', user.id, ip, userAgent);

    return tokens;
  }

  async getProfile(userId: number) {
      const user = await this.usersService.findOneById(userId);
      fs.appendFileSync('auth-debug.log', `[GET_PROFILE] Requested ID: ${userId}, Found User Email: ${user?.email}\n`);
      if (!user) throw new UnauthorizedException('User not found');
      // Strip sensitive data
      const { password, hashedRefreshToken, mfaSecret, backupCodes, ...rest } = user;
      // return isMfaEnabled so frontend knows state
      return rest;
  }

  async logout(refreshToken: string, accessToken?: string) {
      // Blacklist the refresh token for 7 days
      await this.redis.set(`blacklist:${refreshToken}`, 'true', 'EX', 7 * 24 * 60 * 60);
      
      if (accessToken) {
          // Blacklist Access Token for 15 mins (Match JWT expiry)
          await this.redis.set(`blacklist:${accessToken}`, 'true', 'EX', 15 * 60); 
      }

      return { message: 'Logged out successfully' };
  }
}