import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { UserModel } from 'src/models/user.model';
import { JwtService } from 'src/services/auth/jwt.service';
import { AppError } from 'src/utils/errors';
import { generateUserId } from 'src/utils/generate.userId';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function getHighResGoogleAvatar(url?: string | null): string {
  if (!url) return '';
  return url.replace(/=s\d+(-c)?$/, '=s512-c');
}

export class AuthController {
  public googleLogin = async (req: Request, res: Response): Promise<void> => {
    try {
      const rawToken = req.body.token || req.body.credential;

      if (!rawToken) {
        res.status(400).json({ status: false, message: 'Google token is required' });
        return;
      }

      let sub: string;
      let email: string;
      let name: string;
      let picture: string | undefined;

      // A valid JWT ID Token has exactly 3 base64 segments (2 dots) and starts with ey
      const isIdToken = rawToken.split('.').length === 3 && !rawToken.startsWith('ya29.');

      if (isIdToken) {
        // 1. JWT ID Token verification
        const ticket = await client.verifyIdToken({
          idToken: rawToken,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (!payload || !payload.email) {
          res.status(401).json({ status: false, message: 'Invalid ID token' });
          return;
        }

        sub = payload.sub;
        email = payload.email;
        name = payload.name || payload.given_name || 'User';
        picture = payload.picture;
      } else {
        // 2. OAuth2 Access Token (ya29...) - fetch profile via Google UserInfo API
        const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${rawToken}` },
        });

        if (!googleRes.ok) {
          res.status(401).json({ status: false, message: 'Invalid or expired Google access token' });
          return;
        }

        const data = await googleRes.json();
        sub = data.sub;
        email = data.email;
        name = data.name || data.given_name || 'User';
        picture = data.picture;
      }

      const response = await this.findOrCreateUser(sub, email, name, picture);
      res.status(200).json(response);
    } catch (error) {
      console.error('[GoogleLogin Error]:', error);
      this.handleError(error, res);
    }
  };

  private async findOrCreateUser(sub: string, email: string, name: string, picture?: string) {
    const highResPicture = getHighResGoogleAvatar(picture);

    let user = await UserModel.findOne({ $or: [{ googleId: sub }, { email }] });

    if (user) {
      if (!user.googleId) user.googleId = sub;
      if (highResPicture && !user.profilePhoto) user.profilePhoto = highResPicture;
      await user.save();
    } else {
      const genUserId = generateUserId() || Date.now().toString();
      const baseName = (name || email.split('@')[0])
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase()
        .slice(0, 12);
      const username = `${baseName || 'user'}_${Math.floor(1000 + Math.random() * 9000)}`;

      user = await UserModel.create({
        genUserId,
        googleId: sub,
        email,
        name: name || 'User',
        username,
        profilePhoto: highResPicture || null,
        lastActive: new Date(),
      });
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

  private handleError(error: unknown, res: Response) {
    if (error instanceof AppError) {
      res.status(error.statusCode || 400).json({ status: false, message: error.message });
      return;
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    res.status(500).json({ status: false, message });
  }
}