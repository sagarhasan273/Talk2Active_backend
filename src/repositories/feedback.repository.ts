import { FeedbackModel, IFeedback } from '../models/feedback.model';

export class FeedbackRepository {
    public async create(data: Partial<IFeedback>): Promise<IFeedback> {
        const feedback = new FeedbackModel(data);
        return await feedback.save();
    }

    public async findPaginated(skip: number, limit: number) {
        const [data, total] = await Promise.all([
            FeedbackModel.find()
                .populate('user', 'name profilePhoto')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            FeedbackModel.countDocuments(),
        ]);

        return { data, total };
    }

    public async findById(id: string): Promise<IFeedback | null> {
        return await FeedbackModel.findById(id);
    }

    public async update(feedback: IFeedback): Promise<IFeedback> {
        return await feedback.save();
    }
}