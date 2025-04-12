import TelegramBot, { Message } from 'node-telegram-bot-api';
import { IList, ListType } from '../models/list';
import { ListService } from '../services/listService';
import {
    formatDateTimeForDisplay,
    getCurrentTimezone,
} from '../utils/dateTime';

export class CommandHandler {
    private bot: TelegramBot;
    private listService: ListService;

    constructor(bot: TelegramBot) {
        this.bot = bot;
        this.listService = new ListService();
        this.setupCommands();
    }

    private async setupCommands() {
        await this.bot.setMyCommands([
            { command: 'start', description: 'Start the bot' },
            { command: 'help', description: 'Show available commands' },
            { command: 'list', description: 'Show all your lists' },
            { command: 'today', description: "Show today's reminders" },
            { command: 'grocery', description: 'Show grocery lists' },
            { command: 'todo', description: 'Show todo lists' },
            { command: 'reminder', description: 'Show reminder lists' },
            { command: 'delete', description: 'Delete a list' },
        ]);
    }

    async handleCommand(message: Message): Promise<void> {
        const chatId = message.chat.id;
        const userId = message.from?.id || 0;
        const command = message.text?.split(' ')[0];

        try {
            switch (command) {
                case '/start':
                    await this.handleStart(chatId);
                    break;
                case '/help':
                    await this.handleHelp(chatId);
                    break;
                case '/list':
                    await this.handleList(chatId, userId);
                    break;
                case '/today':
                    await this.handleToday(chatId, userId);
                    break;
                case '/grocery':
                    await this.handleListByType(chatId, 'grocery');
                    break;
                case '/todo':
                    await this.handleListByType(chatId, 'todo');
                    break;
                case '/reminder':
                    await this.handleListByType(chatId, 'reminder');
                    break;
                case '/delete':
                    await this.handleDelete(message);
                    break;
                default:
                    await this.bot.sendMessage(
                        chatId,
                        '❌ Unknown command. Use /help to see available commands.',
                    );
            }
        } catch (error) {
            console.error('❌ Error handling command:', error);
            await this.bot.sendMessage(
                chatId,
                '❌ Sorry, something went wrong while processing your command.',
            );
        }
    }

    private async handleStart(chatId: number): Promise<void> {
        const message =
            'Welcome to your Note-Taking Assistant! 📝\n\n' +
            'I can help you manage your:\n' +
            '- 🛒 Grocery lists\n' +
            '- ✅ Todo lists\n' +
            '- ⏰ Reminders\n' +
            '- 📝 General lists\n\n' +
            "Just send me a message or voice note, and I'll help you organize it.\n\n" +
            'Use /help to see all available commands.';

        await this.bot.sendMessage(chatId, message);
    }

    private async handleHelp(chatId: number): Promise<void> {
        const message =
            'Available commands:\n\n' +
            '/start - Start the bot\n' +
            '/help - Show this help message\n' +
            '/list - Show all your lists\n' +
            "/today - Show today's reminders\n" +
            '/grocery - Show your grocery lists\n' +
            '/todo - Show your todo lists\n' +
            '/reminder - Show your reminder lists\n' +
            '/delete - Delete a list\n\n' +
            'You can also:\n' +
            '- Send a text message with items to create a new list\n' +
            '- Send a voice message to create a list from speech\n' +
            '- Reply to a list with "done" to mark items as completed';

        await this.bot.sendMessage(chatId, message);
    }

    private async handleList(chatId: number, userId: number): Promise<void> {
        const lists = await this.listService.getListsByUser(userId);
        if (lists.length === 0) {
            await this.bot.sendMessage(
                chatId,
                "You don't have any lists yet. Send me a message to create one!",
            );
            return;
        }

        const message =
            'Your lists:\n\n' +
            lists
                .map((list, index) => {
                    return (
                        `${index + 1}. ${list.title} (${list.type})\n` +
                        `   Items: ${list.items.length}\n` +
                        `   Created: ${list.createdAt.toLocaleDateString()}\n`
                    );
                })
                .join('\n');

        await this.bot.sendMessage(chatId, message);
    }

    private async handleToday(chatId: number, userId: number): Promise<void> {
        const reminders = await this.listService.getListsByType(
            userId,
            'reminder',
        );
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayReminders = reminders.filter((list) =>
            list.items.some((item) => {
                if (!item.dueDate) return false;
                const dueDate = new Date(item.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                return dueDate.getTime() === today.getTime();
            }),
        );

        if (todayReminders.length === 0) {
            await this.bot.sendMessage(chatId, 'No reminders for today! 🎉');
            return;
        }

        const message =
            "Today's reminders:\n\n" +
            todayReminders
                .map((list) => {
                    const todayItems = list.items.filter((item) => {
                        if (!item.dueDate) return false;
                        const dueDate = new Date(item.dueDate);
                        dueDate.setHours(0, 0, 0, 0);
                        return dueDate.getTime() === today.getTime();
                    });

                    return (
                        `${list.title}:\n` +
                        todayItems
                            .map(
                                (item, index) =>
                                    `${index + 1}. ${item.name} ${
                                        item.completed ? '✅' : '⏳'
                                    }`,
                            )
                            .join('\n')
                    );
                })
                .join('\n\n');

        await this.bot.sendMessage(chatId, message);
    }

    private async handleListByType(
        chatId: number,
        type: string,
    ): Promise<void> {
        try {
            const lists = await this.listService.getListsByType(
                chatId,
                type as ListType,
            );

            if (!lists || lists.length === 0) {
                await this.bot.sendMessage(
                    chatId,
                    `No ${type} lists found. Create one by sending me a message!`,
                );
                return;
            }

            const timezone = getCurrentTimezone();
            const listsText = lists
                .map((list) => {
                    let listText = `📝 "${list.title}"\n`;
                    listText += list.items
                        .map((item) => {
                            let itemText = `- ${item.name}`;
                            if (item.quantity) {
                                itemText += ` (${item.quantity})`;
                            }
                            if (item.category) {
                                itemText += ` [${item.category}]`;
                            }
                            if (item.dueDate && type === 'reminder') {
                                itemText += ` - Due: ${formatDateTimeForDisplay(
                                    new Date(item.dueDate),
                                    timezone,
                                )}`;
                            }
                            return itemText;
                        })
                        .join('\n');
                    return listText;
                })
                .join('\n\n');

            await this.bot.sendMessage(
                chatId,
                `Your ${type} lists:\n\n${listsText}`,
            );
        } catch (error) {
            console.error(`❌ Error handling /${type} command:`, error);
            await this.bot.sendMessage(
                chatId,
                '❌ Sorry, I had trouble retrieving your lists. Please try again.',
            );
        }
    }

    private async handleDelete(message: Message): Promise<void> {
        const chatId = message.chat.id;
        const userId = message.from?.id || 0;
        const args = message.text?.split(' ');

        if (!args || args.length < 2) {
            const lists = await this.listService.getListsByUser(userId);
            const message =
                'Which list would you like to delete? Reply with:\n\n' +
                lists
                    .map(
                        (list, index) =>
                            `${index + 1}. ${list.title} (${list.type})`,
                    )
                    .join('\n') +
                '\n\nUse /delete <number> to delete a list.';

            await this.bot.sendMessage(chatId, message);
            return;
        }

        const lists: IList[] = await this.listService.getListsByUser(userId);
        const index = parseInt(args[1]) - 1;

        if (isNaN(index) || index < 0 || index >= lists.length) {
            await this.bot.sendMessage(
                chatId,
                '❌ Invalid list number. Please try again.',
            );
            return;
        }

        const list = lists[index];
        const deleted = await this.listService.deleteList(
            userId,
            list._id.toString(),
        );

        if (deleted) {
            await this.bot.sendMessage(
                chatId,
                `✅ Deleted list: ${list.title}`,
            );
        } else {
            await this.bot.sendMessage(
                chatId,
                '❌ Failed to delete the list. Please try again.',
            );
        }
    }
}
