import fs from 'fs';
import OpenAI from 'openai';
import { config } from '../config/config';

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
