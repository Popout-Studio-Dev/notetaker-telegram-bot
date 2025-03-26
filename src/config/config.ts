import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Define environment variables schema
const envSchema = z.object({
    TELEGRAM_BOT_TOKEN: z.string().min(1),
    OPENAI_API_KEY: z.string().min(1),
    MONGODB_URI: z.string().min(1),
    NODE_ENV: z.enum(['development', 'production']).default('development'),
    WEBHOOK_URL: z.string().optional(),
});

// Parse and validate environment variables
const env = envSchema.safeParse(process.env);

if (!env.success) {
    console.error('❌ Invalid environment variables:', env.error.format());
    throw new Error('Invalid environment variables');
}

// Export validated config
export const config = env.data;
