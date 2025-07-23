import { Request, Response } from 'express';
import { CreateUserSchema, LogInUserSchema } from 'src/schemas/user.shema';
import { UserService } from 'src/services/user.service';

export class UserController {
  private service = new UserService();

  public async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this.service.getUserById(id);
      if (!user) {
        res.status(401).json({ message: 'Invalid email or password' });
        return;
      }
      res.status(200).json({ user, status: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      if (errorMessage === 'User already exists') {
        res.status(409).json({ message: errorMessage });
      }
    }
  }

  public async createUser(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = CreateUserSchema.parse(req.body);
      if (!validatedData) {
        res.status(400).json({ status: false, message: 'Invalid user data' });
        return;
      }
      const user = await this.service.createUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ message: errorMessage });
    }
  }

  public async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const user = await this.service.updateUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ message: errorMessage });
    }
  }

  public async logInUser(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = LogInUserSchema.parse(req.body);
      if (!validatedInput) {
        res.status(400).json({ message: 'Email and password are required' });
        return;
      }
      const user = await this.service.logInUser(validatedInput);
      if (!user) {
        res.status(401).json({ message: 'Invalid email or password' });
        return;
      }
      res.status(200).json(user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      if (errorMessage === 'User already exists') {
        res.status(409).json({ message: errorMessage });
      }
    }
  }

  public async getUser(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader?.split(' ')[1];
      if (!token) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      const user = await this.service.getUser(token);
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      res.status(200).json({ user, status: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ message: errorMessage });
    }
  }
}
