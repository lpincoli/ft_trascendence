import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    transports: ['websocket', 'polling'],
    credentials: false,
  },
  allowEIO3: true,
})
export class SocketGateway {
  // @WebSocketServer()
  // server: Server;
  // @SubscribeMessage('join_room')
  // async handleSetClientDataEvent(
  //   @MessageBody()
  //   payload: any,
  // ) {
  //   console.log(payload);
  //   const roomName = payload.roomName;
  //   this.server.socketsJoin(roomName);
  // }
  // async emitter(title: string, data: any, roomName?: string) {
  //   console.log('Emitting room...' + roomName);
  //   console.log('Emitting topic...' + title);
  //   console.log('Emitting data...' + data);
  //   if (roomName !== undefined || roomName !== null) {
  //     this.server.to(roomName).emit(title, data);
  //   } else {
  //     this.server.to('vehicle.list').emit(title, data);
  //   }
  // }
  @WebSocketServer()
  server: Server;
  users = 0;

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);

    // Extract the username from the handshake data
    const username = client.handshake.auth.username;

    if (!username) {
      // Close the connection if no username is provided
      client.disconnect();
      return;
    }

    // Attach the username to the socket for future use
    client['username'] = username;

    console.log('User connected:', username);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);

    // You can access the attached username if needed
    const username = client['username'];
    if (username) {
      console.log('User disconnected:', username);
    }
  }
  // @SubscribeMessage('sendMessage')
  // handleMessage(client: Socket, payload: string): void {
  //   console.log('Received message:', payload);
  //   this.server.emit('receiveMessage', payload);
  // }
  @SubscribeMessage('sendMessage')
  handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: string,
  ): void {
    console.log('Received message:', payload);
    // Emit the payload to all connected clients
    this.server.emit('receiveMessage', payload);
  }
}
