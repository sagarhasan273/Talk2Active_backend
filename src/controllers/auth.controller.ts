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
  if (url.includes('googleusercontent.com')) {
    // Strip query parameters or trailing size suffix to replace with high-res flag
    return url.replace(/=s\d+(-c)?$/, `=s${size}-c`);
  }
  return url;
}

// ── Unique Alphanumeric Username Generator ──────────────────────────────
function sanitizeUsername(name: string, email: string): string {
  // Strip non-alphanumeric chars, take the first 15 chars, append 4 random digits
  const baseName = name.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
  const prefix = (baseName || 'user').slice(0, 15);
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}_${randomSuffix}`;
}

export class AuthController {
  // ── Desktop: Access Token Flow ──────────────────────────────────────────
  public googleLogin = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({ message: 'Google access token is required' });
        return;
      }

      const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!googleRes.ok) {
        res.status(401).json({ message: 'Invalid or expired Google token' });
        return;
      }

      const { sub, email, name, picture } = await googleRes.json();
      const response = await this.findOrCreateUser(sub, email, name, picture);
      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // ── Mobile: Auth-Code Flow (Fast ID-Token Verification) ─────────────────
  public googleLoginMobile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { code, redirect_uri } = req.body;

      if (!code) {
        res.status(400).json({ message: 'Authorization code is required' });
        return;
      }

      let tokens;
      try {
        const tokenResponse = await client.getToken({ code, redirect_uri });
        tokens = tokenResponse.tokens;
      } catch {
        res.status(401).json({ message: 'Failed to exchange authorization code with Google' });
        return;
      }

      if (!tokens.id_token && !tokens.access_token) {
        res.status(401).json({ message: 'No valid token received from Google' });
        return;
      }

      let sub: string;
      let email: string;
      let name: string;
      let picture: string;

      // 1. Fast path: Verify ID token locally if available (no extra HTTP fetch)
      if (tokens.id_token) {
        const ticket = await client.verifyIdToken({
          idToken: tokens.id_token,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (!payload || !payload.email) {
          res.status(401).json({ message: 'Invalid ID token payload' });
          return;
        }

        sub = payload.sub;
        email = payload.email;
        name = payload.name || payload.given_name || 'User';
        picture = payload.picture || '';
      } else {
        // 2. Fallback: Query Google userinfo if only access_token was returned
        const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        if (!googleRes.ok) {
          res.status(401).json({ message: 'Failed to fetch userinfo from Google' });
          return;
        }

        const userInfo = await googleRes.json();
        sub = userInfo.sub;
        email = userInfo.email;
        name = userInfo.name;
        picture = userInfo.picture;
      }

      const response = await this.findOrCreateUser(sub, email, name, picture);
      res.status(200).json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // ── Shared User Resolution ─────────────────────────────────────────────
  private async findOrCreateUser(sub: string, email: string, name: string, picture?: string) {
    const highResPicture = getHighResGoogleAvatar(picture, 512);

    // 1. Try finding by Google ID first
    let user = await UserModel.findOne({ googleId: sub });

    if (!user) {
      // 2. Try finding existing account by email to link Google ID
      user = await UserModel.findOne({ email });

      if (user) {
        user.googleId = sub;
        if (highResPicture && (!user.profilePhoto || user.profilePhoto.includes('googleusercontent.com'))) {
          user.profilePhoto = highResPicture;
        }
        await user.save();
      } else {
        // 3. Create fresh user
        const genUserId = generateUserId();
        if (!genUserId) {
          throw new AppError('Failed to generate user ID', 500, 'User Repository');
        }

        const username = sanitizeUsername(name, email);

        user = await UserModel.create({
          genUserId,
          googleId: sub,
          email,
          name,
          username,
          profilePhoto: highResPicture || null,
          lastActive: new Date(),
        });
      }
    } else if (highResPicture && user.profilePhoto !== highResPicture && user.profilePhoto?.includes('googleusercontent.com')) {
      // Refresh Google avatar if it was updated
      user.profilePhoto = highResPicture;
      await user.save();
    }

    const userData = user.toJSON();
    const resolvedUserId = (userData.userId || userData._id)?.toString();

    const accessToken = JwtService.generateToken({
      ...userData,
      userId: resolvedUserId,
    });

    return {
      status: true,
      token: accessToken,
      user: {
        ...userData,
        userId: resolvedUserId,
      },
    };
  }

  // ── Centralized Error Handler ───────────────────────────────────────────
  private handleError(error: unknown, res: Response) {
    if (error instanceof AppError) {
      res.status(error.statusCode || 400).json({
        status: false,
        message: error.message,
        at: error.at,
      });
      return;
    }

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    res.status(500).json({ status: false, message: errorMessage });
  }
}