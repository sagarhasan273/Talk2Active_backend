// src/routes/rating.router.ts
import { RatingController } from 'src/controllers/rating.controller';
import { authMiddleware } from 'src/middlewares/auth.middleware';
import { BaseRouter } from './base.router';

export class RatingRouter extends BaseRouter {
    private ratingController = new RatingController();

    protected routes(): void {
        // Submit or update a user rating
        this.router.post(
            '/',
            authMiddleware,
            (req, res) => this.ratingController.submitRating(req, res)
        );

        // Fetch aggregate rating stats (average, count, totalScore) for a user
        this.router.get(
            '/stats/:userId',
            authMiddleware,
            (req, res) => this.ratingController.getUserStats(req, res)
        );
    }
}