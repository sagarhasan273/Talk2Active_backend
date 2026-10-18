import { RelationshipController } from 'src/controllers/social.controller';
import { authMiddleware } from 'src/middlewares/auth.middleware';
import { BaseRouter } from './base.router';

export class RelationshipRouter extends BaseRouter {
    private relationshipController = new RelationshipController();

    protected routes(): void {
        // Follow / Unfollow
        this.router.post('/follow', authMiddleware, (req, res) => this.relationshipController.followUser(req, res));
        this.router.post('/unfollow', authMiddleware, (req, res) => this.relationshipController.unfollowUser(req, res));

        // Remove Friend (breaks mutual follow)
        this.router.post('/friend/remove', authMiddleware, (req, res) => this.relationshipController.removeFriend(req, res));

        // Social Graph Lists
        this.router.get('/:userId/followers', authMiddleware, (req, res) => this.relationshipController.getFollowers(req, res));
        this.router.get('/:userId/following', authMiddleware, (req, res) => this.relationshipController.getFollowing(req, res));
        this.router.get('/:userId/friends', authMiddleware, (req, res) => this.relationshipController.getFriends(req, res));
        this.router.get('/:userId/all-relations', authMiddleware, (req, res) => this.relationshipController.getAllRelations(req, res));

        // User Stats (follower_count, following_count, friend_count)
        this.router.get('/stats/:userId', authMiddleware, (req, res) => this.relationshipController.getUserStats(req, res));

        // Get Blocked Users
        this.router.get('/:userId/blocked', authMiddleware, (req, res) => this.relationshipController.getBlockedUsers(req, res));
        // Block / Unblock
        this.router.post('/block', authMiddleware, (req, res) => this.relationshipController.blockUser(req, res));
        this.router.post('/unblock', authMiddleware, (req, res) => this.relationshipController.unblockUser(req, res));

        // Report User
        this.router.post('/report', authMiddleware, (req, res) => this.relationshipController.reportUser(req, res));
    }
}