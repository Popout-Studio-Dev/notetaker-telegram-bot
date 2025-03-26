import mongoose from 'mongoose';
import { config } from '../config/config';

export async function connectToDatabase() {
    try {
        await mongoose.connect(config.MONGODB_URI);
        console.log('✅ Successfully connected to MongoDB.');
    } catch (error) {
        console.error('❌ Error connecting to MongoDB:', error);
        throw error;
    }

    mongoose.connection.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected');
    });

    // Handle process termination
    process.on('SIGINT', async () => {
        await mongoose.connection.close();
        process.exit(0);
    });
}
