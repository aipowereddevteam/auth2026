import { Body, Controller, Post, HttpCode, HttpStatus, UseGuards, Get, Request, UnauthorizedException, Res } from '@nestjs/common';
import * as express from 'express'; // <--- Fix import for isolatedModules
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport'; 

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async signIn(@Body() signInDto: Record<string, any>, @Request() req, @Res({ passthrough: true }) res: express.Response) {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    const result = await this.authService.signIn(signInDto.email, signInDto.password, ip, userAgent);
    
    if ('refresh_token' in result) {
        this.setRefreshTokenCookie(res, result.refresh_token);
        const { refresh_token, ...rest } = result;
        return rest; 
    }
    return result;
  }

  // 👇 NEW PROTECTED ROUTE 👇
  @UseGuards(AuthGuard('jwt')) 
  @UseGuards(AuthGuard('jwt')) 
  @Get('profile')
  getProfile(@Request() req) {
    return this.authService.getProfile(req.user.userId); 
  }

  // --- MFA ENDPOINTS ---

  @UseGuards(AuthGuard('jwt'))
  @Post('mfa/generate')
  async registerMfa(@Request() req) {
      return this.authService.generateMfaSecret(req.user.userId, req.user.email);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('mfa/enable')
  async enableMfa(@Request() req, @Body() body) {
      return this.authService.enableMfa(req.user.userId, body.code);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('mfa/disable')
  async disableMfa(@Request() req) {
      return this.authService.disableMfa(req.user.userId);
  }

  // Uses Redis Session ID
  @Post('mfa/verify')
  async verifyMfaLogin(@Body() body, @Res({ passthrough: true }) res: express.Response) {
      const result = await this.authService.verifyMfaAndLogin(body.mfa_session_id, body.code);
      this.setRefreshTokenCookie(res, result.refresh_token);
      return { access_token: result.access_token };
  }

  // --- GOOGLE OAUTH ENDPOINTS ---

  @UseGuards(AuthGuard('google'))
  @Get('google')
  async googleAuth(@Request() req) {
    // Check Guard initiates the Google login flow
  }

  @UseGuards(AuthGuard('google'))
  @Get('google/callback')
  async googleAuthRedirect(@Request() req, @Res() res: express.Response) { // Removed passthrough: true to handle redirect manually
    const result = req.user;

    // CASE 1: MFA REQUIRED
    if (result && result.status === 'mfa_required') {
        return res.redirect(`http://localhost:3000/login/mfa?session_id=${result.mfa_session_id}`);
    }

    // CASE 2: SUCCESS (Tokens Issued)
    if (result && 'refresh_token' in result) {
        this.setRefreshTokenCookie(res, result.refresh_token);
        // Redirect to Frontend Dashboard
        return res.redirect('http://localhost:3000/dashboard');
    }
    
    // CASE 3: FAILURE
    return res.redirect('http://localhost:3000/login?error=GoogleAuthFailed');
  }

  // --- REFRESH TOKEN ENDPOINT ---
  @Post('refresh')
  async refreshTokens(@Body() body, @Request() req, @Res({ passthrough: true }) res: express.Response) {
      const refreshToken = req.cookies['refresh_token'] || body.refresh_token;

      if (!refreshToken) {
          throw new UnauthorizedException('Missing refresh token');
      }
      
      const result = await this.authService.refreshTokens(refreshToken);
      this.setRefreshTokenCookie(res, result.refresh_token);
      return { access_token: result.access_token };
  }

  @Post('logout')
  async logout(@Body() body, @Request() req, @Res({ passthrough: true }) res: express.Response) {
      const refreshToken = req.cookies['refresh_token'] || body.refresh_token;
      if (!refreshToken) return { message: 'Already logged out' };
      
      // Extract Access Token from Header (Authorization: Bearer <token>)
      const authHeader = req.headers.authorization;
      const accessToken = authHeader ? authHeader.split(' ')[1] : undefined;

      await this.authService.logout(refreshToken, accessToken);
      res.clearCookie('refresh_token');
      return { message: 'Logged out successfully' };
  }

  // Helper
  private setRefreshTokenCookie(res: express.Response, token: string) {
      res.cookie('refresh_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production', // False for localhost http
          sameSite: 'lax', // Lax is better for OAuth redirects
          maxAge: 7 * 24 * 60 * 60 * 1000, 
      });
  }
}