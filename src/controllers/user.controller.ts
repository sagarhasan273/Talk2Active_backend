import { Request, Response } from 'express';
import { CreateUserSchema, LogInUserSchema, UpdateUserSchema, UserAccountActivateSchema, UserAccountSessionSchema, UserAccountUpdateSchema } from 'src/schemas/user.shema';
import { UserService } from 'src/services/user.service';
import { AppError } from 'src/utils/errors';
import logger from 'src/utils/logger';

export class UserController {
  private service = new UserService();

  public async logInUser(req: Request, res: Response): Promise<void> {
    let validatedInput;
    try {
      validatedInput = LogInUserSchema.parse(req.body);
    } catch (error) {
      logger.error('Invalid user data!');
      res.status(400).json({ status: false, message: 'Invalid user data!' });
      return;
    }
    try {
      const user = await this.service.logInUser(validatedInput);
      if (!user) {
        throw new AppError('Invalid email or password', 401, 'User Service');
      }

      res.status(200).json({ data: user.user, token: user.token, status: true });
    } catch (error) {
      if (error instanceof AppError) {
        logger.error(`${error.at}: ${error.message}`);
        res.status(error.statusCode).json({ message: error.message, status: false });
        return;
      }
      logger.error('An error occurred while logging in!');
      res.status(500).json({ message: 'An error occurred while logging in', status: false });
    }
  }

  public async createUser(req: Request, res: Response): Promise<void> {
    let validatedInput;
    try {
      validatedInput = CreateUserSchema.parse(req.body);
    } catch (error) {
      logger.error('Invalid user data provided for creation!');
      res.status(400).json({ status: false, message: 'Invalid user data provided for creation!' });
      return;
    }

    try {
      const user = await this.service.createUser(validatedInput);
      if (!user) {
        throw new AppError('User did not appeared in controller!', 409, 'User Controller');
      }

      res.status(201).json({ data: user.user, token: user.token, status: true });
    } catch (error) {
      if (error instanceof AppError) {
        logger.error(`${error.at}: ${error.message}`);
        res.status(error.statusCode).json({ message: error.message, status: false });
        return;
      }

      logger.error('An error occurred while creating the user!');
      res.status(500).json({ message: 'An error occurred while creating the user', status: false });
    }
  }

  public async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new AppError('User ID is required', 400, 'User Controller');
      }

      const user = await this.service.getUserById(id);

      res.status(200).json({ user, status: true });
    } catch (error) {
      if (error instanceof AppError) {
        logger.error(`${error.at}: ${error.message}`);
        res.status(error.statusCode).json({ message: error.message, status: false });
        return;
      }

      logger.error('An error occurred while updating the user profile!');
      res.status(500).json({ message: 'An error occurred while updating the user profile!', status: false });
    }
  }

  public async getUser(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader?.split(' ')[1];
      if (!token) {
        throw new AppError('Authorization token is required', 401, 'User Service');
      }
      const user = await this.service.getUser(token);

      res.status(200).json({ user, status: true });
    } catch (error) {
      if (error instanceof AppError) {
        logger.error(`${error.at}: ${error.message}`);
        res.status(error.statusCode).json({ message: error.message, status: false });
        return;
      }

      logger.error('An error occurred while getting the user!');
      res.status(500).json({ message: 'An error occurred while getting the user!', status: false })
    }
  }

  public async updateUser(req: Request, res: Response): Promise<void> {
    let validatedInput;
    try {
      validatedInput = UpdateUserSchema.parse(req.body);
    } catch (error) {
      logger.error('Invalid user data provided for update!');
      res.status(400).json({ status: false, message: 'Invalid user data provided for update!' });
      return;
    }

    try {
      const user = await this.service.updateUser(validatedInput);

      res.status(201).json(user);
    } catch (error) {
      if (error instanceof AppError) {
        logger.error(`${error.at}: ${error.message}`);
        res.status(error.statusCode).json({ message: error.message, status: false });
        return;
      }

      logger.error('An error occurred while updating the user profile!');
      res.status(500).json({ message: 'An error occurred while updating the user profile!', status: false });
    }
  }

  public async updateUserAccount(req: Request, res: Response): Promise<void> {
    let validatedInput;
    try {
      validatedInput = UserAccountUpdateSchema.parse(req.body);
    } catch (error) {
      logger.error('Invalid user account details provided for update!');
      res.status(400).json({ status: false, message: 'Invalid user account details provided for update!' });
      return;
    }

    try {
      const user = await this.service.updateUserAccount(validatedInput);

      res.status(201).json(user);
    } catch (error) {
      if (error instanceof AppError) {
        logger.error(`${error.at}: ${error.message}`);
        res.status(error.statusCode).json({ message: error.message, status: false });
        return;
      }

      logger.error('An error occurred while updating the user account!');
      res.status(500).json({ message: 'An error occurred while updating the user account!', status: false });
    }
  }
  public async updateUserAccountActivate(req: Request, res: Response): Promise<void> {
    let validatedInput;
    try {
      validatedInput = UserAccountActivateSchema.parse(req.body);
    } catch (error) {
      logger.error('Invalid user data provided for update!');
      res.status(400).json({ status: false, message: 'Invalid user data provided for update!' });
      return;
    }

    try {
      const user = await this.service.updateUserAccountActivate(validatedInput);

      res.status(201).json(user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ message: errorMessage });
    }
  }

  public async updateUserAccountSession(req: Request, res: Response): Promise<void> {
    let validatedInput;
    try {
      validatedInput = UserAccountSessionSchema.parse(req.body);
    } catch (error) {
      logger.error('Invalid user data provided for update!');
      res.status(400).json({ status: false, message: 'Invalid user data provided for update!' });
      return;
    }

    try {
      const user = await this.service.updateUserAccountSession(validatedInput);

      res.status(201).json(user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ message: errorMessage });
    }
  }
}
