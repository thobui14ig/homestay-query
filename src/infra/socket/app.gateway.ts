import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export interface IPayloadMessage {
  actorId: string;      
  actorName: string;
  postId: string;
  content: string;
  createdAt: string;   
  groupId?: string;
}

@WebSocketGateway({
    cors: true,
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    posts: IPayloadMessage[] = []

    constructor() { }
    @WebSocketServer() server: Server;

    afterInit(server: Server) {
        console.log('Socket.IO server initialized');
    }

    async handleConnection(client: Socket) {
        console.log('Connection!')
    }

    handleDisconnect(client: Socket) {
        console.log('Ngat ket noi!.', client.id);
    }

    @SubscribeMessage('join-room-comment-group')
    handleJoin(@ConnectedSocket() client: Socket) {
        console.log(`join room-comment-group`)
        client.join(`room-comment-group`);
    }

    @SubscribeMessage('leave-room-comment-group')
    handleLeave(@ConnectedSocket() client: Socket) {
        console.log(`leave room-comment-group`)
        client.leave(`room-comment-group`);
    }

    @SubscribeMessage('comment-group')
    handleReloadListMessage(
        client: Socket,
        payload: IPayloadMessage,
    ) {
        const isExist = this.posts.find(item => item.postId == payload.postId && item.createdAt == payload.createdAt)
        if(isExist) {
            return 
        }
        this.server.to(`room-comment-group`).emit('comment-group', payload);
        if(this.posts.length == 30) {
            this.posts.pop()
        }
        this.posts.unshift(payload)

        console.log(payload)
    }
}