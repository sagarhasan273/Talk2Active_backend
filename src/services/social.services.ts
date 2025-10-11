import { RelationshipRepository } from "src/repositories/social.repository";
import { FollowRequestInput } from "src/types/social.type";
import { AppError } from "src/utils/errors";


export class RelationshipService {
    private relationshipRepository = new RelationshipRepository();

    async followUser(input: FollowRequestInput): Promise<void> {
        try {
            const relationship = await this.relationshipRepository.createRelationship(input);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to follow user!', 500, 'Relationship Service');
        }
    }
}