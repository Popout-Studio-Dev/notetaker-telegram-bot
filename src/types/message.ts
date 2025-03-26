import { Message } from 'node-telegram-bot-api';

export type MessageType = 'text' | 'voice' | 'audio';

export interface ProcessedMessage {
    userId: number;
    chatId: number;
    messageId: number;
    type: MessageType;
    content: string;
    rawMessage: Message;
}
