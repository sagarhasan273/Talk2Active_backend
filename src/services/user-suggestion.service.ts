import { UserSuggestionRepository } from "src/repositories/user-suggestion.repository";
import { ReturnResponseType } from "src/types/base.type";
import { AppError } from "src/utils/errors";

export class UserSuggestionService {
    private userSuggestionRepository = new UserSuggestionRepository();

    async getNewUsersSuggestions(userId: string, page: number = 1, limit: number = 10): Promise<ReturnResponseType> {
        try {
            const { newUsers, total, totalPages } = await this.userSuggestionRepository.getNewUsersSuggestions(userId, page, limit);

            const metaData = {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }

            return { data: newUsers, metaData }

        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }
            throw new AppError('Failed to get NewUsers Suggestions!', 500, 'Relationship Service');
        }
    }
}