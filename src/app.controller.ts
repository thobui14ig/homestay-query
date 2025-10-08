import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('comments-group')
  getCommentGroup() {
    return this.appService.getCommentGroup();
  }

}
