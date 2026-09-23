import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { socketService } from './services/socket.service';

let io: Server | null = null;

export const initSocketServer = (
    httpServer: HttpServer,
    allowedOrigins: string[] = ['*']
): Server => {
    io = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST', 'PATCH'],
            credentials: true,
        },
        transports: ['websocket', 'polling'],
    });

    // Provide the io instance directly to the singleton service
    socketService.setIO(io);

    io.on('connection', (socket: Socket) => {
        socketService.handleConnection(socket);
    });

    return io;
};

// Singleton instance export
export { socketService };
