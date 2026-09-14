import { uploadImage } from 'src/config';
import { InventoryController } from 'src/controllers/inventory.controller';
import { BaseRouter } from './base.router';

export class InventoryRouter extends BaseRouter {
  private inventoryController = new InventoryController();

  protected routes(): void {
    this.router.get('/ice-servers', (req, res) => {
      this.inventoryController.iceServers(req, res);
    });
    this.router.post('/image/upload', uploadImage.single('image'), (req, res) =>
      this.inventoryController.uploadImage(req, res)
    );
    this.router.post('/ai/ask', (req, res) =>
      this.inventoryController.askAi(req, res)
    );
  }
}
