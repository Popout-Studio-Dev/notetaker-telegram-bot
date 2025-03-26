import TelegramBot, { Message } from 'node-telegram-bot-api';
import { MessageType, ProcessedMessage } from '../types/message';
import { deleteTempFile, saveTempFile } from '../utils/file';
import { transcribeAudio } from './openai';

export class MessageHandler {
    private bot: TelegramBot;

    constructor(bot: TelegramBot) {
        this.bot = bot;
    }

    async processMessage(message: Message): Promise<ProcessedMessage> {
        try {
            if (message.text) {
                return this.processTextMessage(message);
            } else if (message.voice || message.audio) {
                return this.processAudioMessage(message);
            } else {
                throw new Error('Unsupported message type');
            }
        } catch (error) {
            console.error('❌ Error processing message:', error);
            throw error;
        }
    }

    private processTextMessage(message: Message): ProcessedMessage {
        return {
            userId: message.from?.id || 0,
            chatId: message.chat.id,
            messageId: message.message_id,
            type: 'text' as MessageType,
            content: message.text || '',
            rawMessage: message,
        };
    }

    private async processAudioMessage(
        message: Message,
    ): Promise<ProcessedMessage> {
        const file = message.voice || message.audio;
        if (!file) throw new Error('No audio file found');

        const type: MessageType = message.voice ? 'voice' : 'audio';

        try {
            // Download the file
            const fileInfo = await this.bot.getFile(file.file_id);
            if (!fileInfo.file_path) throw new Error('File path not found');

            // Get file data
            const fileData = await this.bot.getFileStream(file.file_id);
            const chunks: Buffer[] = [];

            for await (const chunk of fileData) {
                chunks.push(chunk);
            }

            const buffer = Buffer.concat(chunks);

            // Save to temp file
            const filePath = await saveTempFile(buffer, 'ogg');

            // Transcribe the audio
            const transcription = await transcribeAudio(filePath);

            // Clean up
            await deleteTempFile(filePath);

            return {
                userId: message.from?.id || 0,
                chatId: message.chat.id,
                messageId: message.message_id,
                type,
                content: transcription,
                rawMessage: message,
            };
        } catch (error) {
            console.error('❌ Error processing audio message:', error);
            throw error;
        }
    }
}
