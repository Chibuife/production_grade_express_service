import 'dotenv/config';

import express from 'express';
import userRoutes from './routes/User.js';
import authRoutes from './routes/Auth.js';
import healthRoutes from './routes/health.js';
import morgan from 'morgan';
import { logger } from './utils/logger.js';
import { createServer } from 'node:http';
import { connectToDatabase, disconnectFromDatabase } from './config/db/index.js';
import requestId from './middleware/requestId.js';

const app = express();
const server = createServer(app);

app.set('trust proxy', 1);

const stream = {
    write: (message: string) => logger.http(message.trim()),
};

app.use(express.json());
app.use(requestId);

// app.use(morgan(':method :url :status :res[content-length] - :response-time ms',
//     { "stream": stream }
// ));

app.use("/health", healthRoutes);
app.use('/users', userRoutes);
app.use('/auth', authRoutes);
app.get("/", (req, res) => {
    res.send('Hello World!');
});

app.get("/error", (req, res) => {
    logger.error("This is an error message");
    res.json({ message: 'Hello World!', error: 'This is an error message' });
});


const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectToDatabase();
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            logger.info(`Server running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();



// --- GRACEFUL SHUTDOWN IMPLEMENTATION ---

async function gracefulShutdown(signal: string) {
    console.log(`Received ${signal}. Starting graceful shutdown...`);

    server.close(async () => {
        console.log('HTTP server closed. All in-flight requests successfully drained.');

        try {
            await disconnectFromDatabase();
        } catch (error) {
            console.error('Error closing database connection:', error);
        }

        process.exit(0);
    });

    // 4. Force a hard timeout kill if requests take way too long to process (e.g., hung connections)
    setTimeout(() => {
        console.error('Forcing hard shutdown: In-flight requests took too long to drain.');
        process.exit(1);
    }, 30000); // Wait maximum 30 seconds
}

// Listen for standard cloud termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // Sent by AWS, Heroku, Render, Kubernetes
process.on('SIGINT', () => gracefulShutdown('SIGINT'));   // Sent when you press Ctrl+C 