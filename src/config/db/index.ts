import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config(); 

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/production-grade-expree-service';

export const connectToDatabase = async () => {
    if (mongoose.connection.readyState === 1) {
        return mongoose;
    }

    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });

        console.log('MongoDB connected successfully');
        return mongoose;
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        throw error;
    }
};

export const disconnectFromDatabase = async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
        console.log('MongoDB disconnected');
    }
};
