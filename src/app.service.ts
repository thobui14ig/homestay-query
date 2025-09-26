import { Injectable } from '@nestjs/common';
import { AppGateway } from './infra/socket/app.gateway';

@Injectable()
export class AppService {
  constructor(private socketService: AppGateway) {}

  getCommentGroup() {
    return this.socketService.posts
  }
}
