import mongoose, { Document } from 'mongoose';
import TelegramBot from 'node-telegram-bot-api';
import { CommandHandler } from './commands/commandHandler';
import { config } from './config/config';
import { IList } from './models/list';
import { connectToDatabase } from './services/database';
import { ListService } from './services/listService';
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

        // Initialize handlers
        const messageHandler = new MessageHandler(bot);
        const commandHandler = new CommandHandler(bot);
        const listService = new ListService();

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

        // Handle commands
        bot.on('message', async (msg) => {
            try {
                // Handle commands
                if (msg.text?.startsWith('/')) {
                    await commandHandler.handleCommand(msg);
                    return;
                }

                // Handle "done" replies for completing items
                if (msg.reply_to_message) {
                    const replyText = msg.text?.toLowerCase();
                    if (replyText === 'done' || replyText === 'complete') {
                        const originalMessage = msg.reply_to_message.text;
                        if (!originalMessage) return;

                        // Extract list title from the original message
                        const titleMatch = originalMessage.match(
                            /new \w+ list: "([^"]+)"/,
                        );
                        if (!titleMatch) return;

                        const lists = await listService.getListsByUser(
                            msg.from?.id || 0,
                        );
                        const list = lists.find(
                            (l) => l.title === titleMatch[1],
                        ) as (IList & Document) | undefined;

                        if (
                            !list ||
                            !mongoose.Types.ObjectId.isValid(list._id)
                        ) {
                            await bot.sendMessage(
                                msg.chat.id,
                                "❌ Could not find the list you're trying to update.",
                            );
                            return;
                        }

                        // Mark all items as completed
                        for (let i = 0; i < list.items.length; i++) {
                            await listService.updateListItem(
                                msg.from?.id || 0,
                                list._id.toString(),
                                i,
                                { completed: true },
                            );
                        }

                        await bot.sendMessage(
                            msg.chat.id,
                            '✅ Marked all items as completed!',
                        );
                        return;
                    }
                }

                // Process regular messages
                const processedMessage = await messageHandler.processMessage(
                    msg,
                );
                await bot.sendMessage(msg.chat.id, processedMessage.content);
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
