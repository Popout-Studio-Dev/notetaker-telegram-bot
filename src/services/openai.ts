import fs from 'fs';
import OpenAI from 'openai';
import { config } from '../config/config';
import { ListType } from '../models/list';
import { getCurrentTimezone } from '../utils/dateTime';

const openai = new OpenAI({
    apiKey: config.OPENAI_API_KEY,
});

export async function transcribeAudio(filePath: string): Promise<string> {
    try {
        const response = await openai.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: 'whisper-1',
        });

        return response.text;
    } catch (error) {
        console.error('❌ Error transcribing audio:', error);
        throw new Error('Failed to transcribe audio');
    }
}

interface ExtractedList {
    type: ListType;
    title: string;
    items: {
        name: string;
        quantity?: string;
        category?: string;
        dueDate?: string;
    }[];
}

export async function extractListFromText(
    content: string,
): Promise<ExtractedList> {
    try {
        const now = new Date();
        const timezone = getCurrentTimezone();
        const days = [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
        ];
        const currentDay = days[now.getDay()];

        const systemPrompt = `You are a helpful assistant that extracts structured list information from user messages. 
The list could be a grocery list, todo list, reminder list, or general list. 
Extract the most appropriate list type based on the content.

Current context:
- Today is ${currentDay}, ${now.toISOString()}
- User's timezone: ${timezone}

For any dates mentioned in the text:
1. For relative dates like "next month 1st", calculate the actual date
2. For days of the week like "Tuesday", find the next occurrence from today
3. Always return dates in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)
4. All times should be converted to UTC before returning
5. When a specific time is not provided, use 00:00:00.000Z (UTC midnight)

Example transformations (assuming today is ${currentDay}, ${now.toISOString()}):
- "next month 1st" → "${new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            1,
        ).toISOString()}"
- "next Tuesday at 2pm" → Calculate next Tuesday and convert local 2pm to UTC
- "tomorrow" → "${new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()}"

Remember:
- Always convert user's local time to UTC before returning
- The user is in timezone: ${timezone}
- Include the full ISO string with milliseconds and Z suffix`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: systemPrompt,
                },
                {
                    role: 'user',
                    content,
                },
            ],
            functions: [
                {
                    name: 'extractList',
                    description: 'Extract list information from user message',
                    parameters: {
                        type: 'object',
                        properties: {
                            type: {
                                type: 'string',
                                enum: [
                                    'grocery',
                                    'todo',
                                    'reminder',
                                    'general',
                                ],
                                description:
                                    'The type of list based on the content',
                            },
                            title: {
                                type: 'string',
                                description: 'A concise title for the list',
                            },
                            items: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: {
                                            type: 'string',
                                            description:
                                                'The name or description of the item',
                                        },
                                        quantity: {
                                            type: 'string',
                                            description:
                                                'The quantity of the item (if applicable)',
                                        },
                                        category: {
                                            type: 'string',
                                            description:
                                                'The category of the item (if applicable)',
                                        },
                                        dueDate: {
                                            type: 'string',
                                            description:
                                                'The due date for the item in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ). Must be in UTC.',
                                        },
                                    },
                                    required: ['name'],
                                },
                            },
                        },
                        required: ['type', 'title', 'items'],
                    },
                },
            ],
            function_call: { name: 'extractList' },
        });

        const functionCall = response.choices[0].message.function_call;
        if (!functionCall || !functionCall.arguments) {
            throw new Error('No function call in response');
        }

        return JSON.parse(functionCall.arguments) as ExtractedList;
    } catch (error) {
        console.error('❌ Error extracting list from text:', error);
        throw new Error('Failed to extract list from text');
    }
}
