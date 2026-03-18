import { Request, Response } from 'express';
import { UserModel } from 'src/models/user.model';
import { JwtService } from 'src/services/auth/jwt.service';

export class AuthController {
    public async googleLogin(req: Request, res: Response): Promise<void> {
        try {
            const { token } = req.body;

            // ✅ use userinfo endpoint — token is access_token not id_token
            const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!googleRes.ok) {
                res.status(401).json({ message: 'Invalid Google token' });
                return;
            }

            const { sub, email, name, picture } = await googleRes.json();

            // find or create user
            let user = await UserModel.findOne({ googleId: sub });
            if (!user) {
                user = await UserModel.findOne({ email });
                if (user) {
                    // link google to existing account
                    user.googleId = sub;
                    user.profilePhoto = picture;
                    await user.save();
                } else {
                    // brand new user
                    user = await UserModel.create({ googleId: sub, email, name, picture });
                }
            }

            const accessToken = JwtService.generateToken(user);

            res.status(200).json({ token: accessToken, status: true });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            res.status(500).json({ message: errorMessage });
        }
    }
}