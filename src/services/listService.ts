import { IList, List, ListType } from '../models/list';

export class ListService {
    async createList(
        userId: number,
        type: ListType,
        title: string,
        items: any[],
        source: 'text' | 'voice',
        rawContent: string,
    ): Promise<IList> {
        const list = new List({
            userId,
            type,
            title,
            items,
            source,
            rawContent,
        });

        return await list.save();
    }

    async getListsByUser(userId: number): Promise<IList[]> {
        return await List.find({ userId }).sort({ createdAt: -1 });
    }

    async getListsByType(userId: number, type: ListType): Promise<IList[]> {
        return await List.find({ userId, type }).sort({ createdAt: -1 });
    }

    async getList(userId: number, listId: string): Promise<IList | null> {
        return await List.findOne({ _id: listId, userId });
    }

    async updateListItem(
        userId: number,
        listId: string,
        itemIndex: number,
        updates: { completed?: boolean },
    ): Promise<IList | null> {
        const list = await List.findOne({ _id: listId, userId });
        if (!list || !list.items[itemIndex]) return null;

        Object.assign(list.items[itemIndex], updates);
        return await list.save();
    }

    async deleteList(userId: number, listId: string): Promise<boolean> {
        const result = await List.deleteOne({ _id: listId, userId });
        return result.deletedCount === 1;
    }
}
