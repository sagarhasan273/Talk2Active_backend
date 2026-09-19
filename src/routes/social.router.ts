import { RelationshipController } from "src/controllers/social.controller";
import { authMiddleware } from "src/middlewares/auth.middleware";
import { BaseRouter } from "./base.router";

export class RelationshipRouter extends BaseRouter {
    private relationshipController = new RelationshipController();

    protected routes(): void {
        // Follow a user
        this.router.post('/follow', authMiddleware, (req, res) => this.relationshipController.followUser(req, res));
        // Unfollow a user
        this.router.post('/unfollow', authMiddleware, (req, res) => this.relationshipController.unfollowUser(req, res));

        // Send a friend request
        this.router.post('/friend-request', authMiddleware, (req, res) => this.relationshipController.sendFriendRequest(req, res));
        // Accept a friend request
        this.router.post('/friend-request/accept', authMiddleware, (req, res) => this.relationshipController.acceptFriendRequest(req, res));
        // Decline a friend request
        this.router.post('/friend-request/decline', authMiddleware, (req, res) => this.relationshipController.declineFriendRequest(req, res));
        // Remove a friend
        this.router.post('/friend/remove', authMiddleware, (req, res) => this.relationshipController.removeFriend(req, res));

        // Get followers
        this.router.get('/followers/:userId', authMiddleware, (req, res) => this.relationshipController.getFollowers(req, res));
        // Get following
        this.router.get('/following/:userId', authMiddleware, (req, res) => this.relationshipController.getFollowing(req, res));
        // Get friends
        this.router.get('/friends/:userId', authMiddleware, (req, res) => this.relationshipController.getFriends(req, res));
        // get all relations
        this.router.get('/all-relations/:userId', authMiddleware, (req, res) => this.relationshipController.getAllRelations(req, res));
        // Get pending friend requests
        this.router.get('/friend-requests/:userId', authMiddleware, (req, res) => this.relationshipController.getPendingRequests(req, res));
        // Get user stats
        this.router.get('/stats/:userId', authMiddleware, (req, res) => this.relationshipController.getUserStats(req, res));

        // Block a user
        this.router.post('/block', authMiddleware, (req, res) => this.relationshipController.blockUser(req, res));
        // Unblock a user
        this.router.post('/unblock', authMiddleware, (req, res) => this.relationshipController.unblockUser(req, res));
    }
}
