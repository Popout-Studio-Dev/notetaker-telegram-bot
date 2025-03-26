import TelegramBot from 'node-telegram-bot-api';
import { config } from './config/config';
import { connectToDatabase } from './services/database';
import { MessageHandler } from './services/messageHandler';

async function startBot() {
    try {
        // Connect to MongoDB
        await connectToDatabase();

        // Initialize the bot
        const bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, {
            polling: config.NODE_ENV === 'development',
            webHook:
                config.NODE_ENV === 'production' && config.WEBHOOK_URL
                    ? {
                          port: 443,
                      }
                    : undefined,
        });

        // Set webhook if in production
        if (config.NODE_ENV === 'production' && config.WEBHOOK_URL) {
            await bot.setWebHook(config.WEBHOOK_URL);
        }

        // Initialize message handler
        const messageHandler = new MessageHandler(bot);

        // Basic error handling
        bot.on('polling_error', (error) => {
            console.error('❌ Polling error:', error);
        });

        bot.on('webhook_error', (error) => {
            console.error('❌ Webhook error:', error);
        });

        // Basic start command
        bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            await bot.sendMessage(
                chatId,
                "Welcome to your Note-Taking Assistant! 📝\n\nI can help you manage your notes, create todo lists, set reminders, and maintain grocery lists. Just send me a message or voice note, and I'll help you organize it.",
            );
        });

        // Handle text and audio messages
        bot.on('message', async (msg) => {
            try {
                // Ignore commands
                if (msg.text?.startsWith('/')) return;

                const chatId = msg.chat.id;
                await bot.sendMessage(chatId, '🔄 Processing your message...');

                const processedMessage = await messageHandler.processMessage(
                    msg,
                );

                // For now, just echo back the processed content
                await bot.sendMessage(
                    chatId,
                    `✅ Received your ${processedMessage.type} message:\n\n${processedMessage.content}`,
                );
            } catch (error) {
                console.error('❌ Error handling message:', error);
                await bot.sendMessage(
                    msg.chat.id,
                    '❌ Sorry, I encountered an error while processing your message. Please try again.',
                );
            }
        });

        console.log('✅ Telegram bot started successfully');
    } catch (error) {
        console.error('❌ Error starting the bot:', error);
        process.exit(1);
    }
}

startBot();
