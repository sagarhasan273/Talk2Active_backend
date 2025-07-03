import { Router } from 'express';

export abstract class BaseRouter {
  public router: Router;

  constructor() {
    this.router = Router();
    this.routes();
  }

  protected abstract routes(): void;
}
