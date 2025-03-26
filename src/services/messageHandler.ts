import TelegramBot, { Message } from 'node-telegram-bot-api';
import { MessageType, ProcessedMessage } from '../types/message';
import { deleteTempFile, saveTempFile } from '../utils/file';
import { ListService } from './listService';
import { extractListFromText, transcribeAudio } from './openai';

export class MessageHandler {
    private bot: TelegramBot;
    private listService: ListService;

    constructor(bot: TelegramBot) {
        this.bot = bot;
        this.listService = new ListService();
    }

    async processMessage(message: Message): Promise<ProcessedMessage> {
        try {
            let processedMessage: ProcessedMessage;

            if (message.text) {
                processedMessage = this.processTextMessage(message);
            } else if (message.voice || message.audio) {
                processedMessage = await this.processAudioMessage(message);
            } else {
                throw new Error('Unsupported message type');
            }

            // Extract and store list if present
            try {
                const extractedList = await extractListFromText(
                    processedMessage.content,
                );
                const list = await this.listService.createList(
                    processedMessage.userId,
                    extractedList.type,
                    extractedList.title,
                    extractedList.items,
                    processedMessage.type === 'text' ? 'text' : 'voice',
                    processedMessage.content,
                );

                // Add list information to the processed message
                processedMessage.content = `✅ I've created a new ${
                    list.type
                } list: "${list.title}"\n\nItems:\n${list.items
                    .map((item, index) => {
                        let itemText = `${index + 1}. ${item.name}`;
                        if (item.quantity) itemText += ` (${item.quantity})`;
                        if (item.category) itemText += ` [${item.category}]`;
                        if (item.dueDate)
                            itemText += ` - Due: ${new Date(
                                item.dueDate,
                            ).toLocaleDateString()}`;
                        return itemText;
                    })
                    .join('\n')}`;
            } catch (error) {
                console.error('Failed to extract list from message:', error);
                // If list extraction fails, return the original processed message
            }

            return processedMessage;
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
