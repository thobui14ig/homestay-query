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

export interface IPayloadMessageGroup {
  actorId: string;      
  actorName: string;
  postId: string;
  content: string;
  createdAt: string;   
  groupId?: string;
}

export interface IPayloadMessageTiktok {
    commentId: string;
    userNameComment: string;
    commentMessage: string;
    phoneNumber: string;
    userIdComment: string;
    commentCreatedAt: string;
    postId: string,
    userId: number
}

@WebSocketGateway({
    cors: true,
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    posts: IPayloadMessageGroup[] = []
    commentsTiktok: IPayloadMessageTiktok[] = []

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

    @SubscribeMessage('join-room-comment-tiktok')
    handleJoinRoomTiktok(@MessageBody() payload: { userId: number }, @ConnectedSocket() client: Socket) {
        console.log(`join room-comment-tiktok`)
        client.join(`room-comment-tiktok-${payload.userId}`);
    }

    @SubscribeMessage('leave-room-comment-tiktok')
    handleLeaveRoomTiktok(@MessageBody() userId: number, @ConnectedSocket() client: Socket) {
        console.log(`leave room-comment-tiktok`)
        client.leave(`room-comment-tiktok-${userId}`);
    }

    @SubscribeMessage('comment-group')
    receiveMessageGroup(
        client: Socket,
        payload: IPayloadMessageGroup,
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

    @SubscribeMessage('comment-tiktok')
    receiveMessageTiktok(
        client: Socket,
        payload: IPayloadMessageTiktok,
    ) {
        console.log(payload)
        const isExist = this.commentsTiktok.find(item => item.postId == payload.postId && item.commentCreatedAt == payload.commentCreatedAt)
        if(isExist) {
            return 
        }
        this.server.to(`room-comment-tiktok-${payload.userId}`).emit('comment-tiktok', payload);

        if(this.commentsTiktok.length == 50) {
            this.commentsTiktok.pop()
        }
        this.commentsTiktok.unshift(payload)
        // console.log(this.commentsTiktok)

        // console.log(payload)
    }
}