import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from 'src/config';
import { socketService } from './services/socket.service';

let io: Server | null = null;

export const initSocketServer = (httpServer: HttpServer): Server => {
    io = new Server(httpServer, {
        cors: {
            origin: config.allowedOrigins,
            methods: ['GET', 'POST', 'PATCH'],
            credentials: true,
        },
        transports: ['websocket', 'polling'],
    });

    socketService.setIO(io);

    io.on('connection', (socket: Socket) => {
        // Handle incoming custom events
        socketService.handleConnection(socket);

        // Handle client disconnection
        socket.on('disconnect', () => {
            socketService.handleDisconnect(socket);
        });
    });

    return io;
};

export { socketService };

