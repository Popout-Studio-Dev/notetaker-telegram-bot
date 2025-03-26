import fs from 'fs';
import OpenAI from 'openai';
import { config } from '../config/config';
import { ListType } from '../models/list';

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
        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content:
                        'You are a helpful assistant that extracts structured list information from user messages. The list could be a grocery list, todo list, reminder list, or general list. Extract the most appropriate list type based on the content.',
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
                                                'The due date for the item (if applicable), in ISO format',
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
