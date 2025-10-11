import { RelationshipStatusEnum } from "src/enums/social.enum";
import { RelationshipRepository } from "src/repositories/social.repository";
import { RelationshipInput } from "src/types/social.type";
import { AppError } from "src/utils/errors";


export class RelationshipService {
    private relationshipRepository = new RelationshipRepository();

    async followUser(input: RelationshipInput): Promise<void> {
        try {
            await this.relationshipRepository.createRelationship(input);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to follow user!', 500, 'Relationship Service');
        }
    }

    async unfollowUser(input: RelationshipInput): Promise<void> {
        try {
            const { requester, recipient, type } = input;
            await this.relationshipRepository.removeRelationship(requester.toString(), recipient.toString(), type);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to unfollow user!', 500, 'Relationship Service');
        }
    }

    async sendFriendRequest(input: RelationshipInput): Promise<void> {
        try {
            await this.relationshipRepository.createRelationship(input);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to send friend request!', 500, 'Relationship Service');
        }
    }

    async acceptFriendRequest(input: RelationshipInput): Promise<void> {
        try {
            await this.relationshipRepository.updateRelationship(input.requester.toString(), { relationshipId: input.recipient.toString(), status: RelationshipStatusEnum.ACCEPTED });
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to accept friend request!', 500, 'Relationship Service');
        }
    }

    async declineFriendRequest(input: RelationshipInput): Promise<void> {
        try {
            await this.relationshipRepository.updateRelationship(input.requester.toString(), { relationshipId: input.recipient.toString(), status: RelationshipStatusEnum.ACCEPTED });
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to decline friend request!', 500, 'Relationship Service');
        }
    }
}