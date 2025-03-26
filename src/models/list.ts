import mongoose, { Document } from 'mongoose';

export type ListType = 'grocery' | 'todo' | 'reminder' | 'general';

export interface ListItem {
    name: string;
    quantity?: string;
    category?: string;
    completed?: boolean;
    dueDate?: Date;
}

export interface IList extends Document {
    userId: number;
    type: ListType;
    title: string;
    items: ListItem[];
    createdAt: Date;
    updatedAt: Date;
    source: 'text' | 'voice';
    rawContent: string;
}

const listItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    quantity: { type: String },
    category: { type: String },
    completed: { type: Boolean, default: false },
    dueDate: { type: Date },
});

const listSchema = new mongoose.Schema(
    {
        userId: { type: Number, required: true },
        type: {
            type: String,
            required: true,
            enum: ['grocery', 'todo', 'reminder', 'general'],
        },
        title: { type: String, required: true },
        items: [listItemSchema],
        source: {
            type: String,
            required: true,
            enum: ['text', 'voice'],
        },
        rawContent: { type: String, required: true },
    },
    {
        timestamps: true,
    },
);

// Create indexes
listSchema.index({ userId: 1, type: 1 });
listSchema.index({ userId: 1, createdAt: -1 });

export const List = mongoose.model<IList>('List', listSchema);
