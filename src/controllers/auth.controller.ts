import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { UserModel } from 'src/models/user.model';
import { JwtService } from 'src/services/auth/jwt.service';
import { AppError } from 'src/utils/errors';
import { generateUserId } from 'src/utils/generate.userId';
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
);

export class AuthController {
  // ── Desktop: access_token flow ──────────────────────────────────────────
  public async googleLogin(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!googleRes.ok) {
        res.status(401).json({ message: 'Invalid Google token' });
        return;
      }

      const { sub, email, name, picture } = await googleRes.json();
      const response = await this.findOrCreateUser(sub, email, name, picture);
      res.status(200).json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ message: errorMessage });
    }
  }

  // ── Mobile: auth-code flow ──────────────────────────────────────────────
  public async googleLoginMobile(req: Request, res: Response): Promise<void> {
    try {
      const { code, redirect_uri } = req.body;

      if (!code) {
        res.status(400).json({ message: 'Authorization code is required' });
        return;
      }

      // exchange code for tokens with error handling
      let tokens;
      try {
        const tokenResponse = await client.getToken({ code, redirect_uri });
        tokens = tokenResponse.tokens;
      } catch (tokenError) {
        res.status(401).json({ message: 'Failed to exchange authorization code' });
        return;
      }

      if (!tokens.access_token) {
        res.status(401).json({ message: 'No access token received' });
        return;
      }

      const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!googleRes.ok) {
        res.status(401).json({ message: 'Invalid Google token' });
        return;
      }

      const userInfo = await googleRes.json();
      const response = await this.findOrCreateUser(
        userInfo.sub,
        userInfo.email,
        userInfo.name,
        userInfo.picture
      );

      res.status(200).json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ message: errorMessage });
    }
  }

  // ── Shared logic ────────────────────────────────────────────────────────
  private async findOrCreateUser(sub: string, email: string, name: string, picture: string) {
    let user = await UserModel.findOne({ googleId: sub });
    if (!user) {
      user = await UserModel.findOne({ email });

      if (user) {
        user.googleId = sub;
        user.profilePhoto = picture;
        await user.save();
      } else {
        const userId = generateUserId();

        if (!userId) {
          throw new AppError('Failed to generate user ID', 500, 'User Repository');
        }

        const now = new Date();

        const userData = {
          genUserId: userId,
          googleId: sub,
          email,
          name,
          username: name,
          profilePhoto: picture,
          lastActive: now,
        }

        user = await UserModel.create(userData);
      }
    }

    const { ...rest } = user.toJSON();

    const accessToken = JwtService.generateToken({ ...rest, userId: rest.userId, });

    return { token: accessToken, status: true, user: rest };
  }
}