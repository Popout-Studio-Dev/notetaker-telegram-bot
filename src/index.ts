import TelegramBot from 'node-telegram-bot-api';
import { config } from './config/config';
import { connectToDatabase } from './services/database';

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

        console.log('✅ Telegram bot started successfully');
    } catch (error) {
        console.error('❌ Error starting the bot:', error);
        process.exit(1);
    }
}

startBot();
