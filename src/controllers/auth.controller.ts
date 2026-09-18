import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { UserModel } from 'src/models/user.model';
import { JwtService } from 'src/services/auth/jwt.service';
import { AppError } from 'src/utils/errors';
import { generateUserId } from 'src/utils/generate.userId';

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

// ── Image Resolution Helper ─────────────────────────────────────────────
function getHighResGoogleAvatar(url?: string | null, size: number = 512): string {
  if (!url) return '';
  // Replaces default low-res =s96-c, =s96, etc., with higher resolution
  if (url.includes('googleusercontent.com')) {
    return url.replace(/=s\d+(-c)?$/, `=s${size}-c`);
  }
  return url;
}

export class AuthController {
  // ── Desktop: access_token flow ──────────────────────────────────────────
  public googleLogin = async (req: Request, res: Response): Promise<void> => {
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
  };

  // ── Mobile: auth-code flow ──────────────────────────────────────────────
  public googleLoginMobile = async (req: Request, res: Response): Promise<void> => {
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
  };

  // ── Shared logic ────────────────────────────────────────────────────────
  private async findOrCreateUser(sub: string, email: string, name: string, picture: string) {
    // Transform default 96px image to 512px crisp resolution
    const highResPicture = getHighResGoogleAvatar(picture, 512);

    let user = await UserModel.findOne({ googleId: sub });
    if (!user) {
      user = await UserModel.findOne({ email });

      if (user) {
        user.googleId = sub;
        user.profilePhoto = highResPicture;
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
          profilePhoto: highResPicture,
          lastActive: now,
        };

        user = await UserModel.create(userData);
      }
    } else if (user.profilePhoto !== highResPicture) {
      // Optional: keep existing users' avatars updated to high-res on login
      user.profilePhoto = highResPicture;
      await user.save();
    }

    const { ...rest } = user.toJSON();

    const accessToken = JwtService.generateToken({ ...rest, userId: rest.userId });

    return { token: accessToken, status: true, user: rest };
  }
}