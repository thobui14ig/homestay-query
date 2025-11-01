import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
import { getUser } from 'src/common/utils/user';
import { CreateLinkDTO } from './dto/create-link.dto';
import { UpdateLinkDTO } from './dto/update-link.dto';
import { CrawType, HideBy, LinkStatus, LinkType } from './entities/links.entity';
import { LinkService } from './links.service';
import { BodyLinkQuery, IGetLinkDeleted, ISettingLinkDto } from './links.service.i';
import { CheckLimitLinkUserWhenAddLinkInterceptor } from './interceptors/handle-check-limit-link-user-when-add-link.interceptor';
import { CheckLimitLinkUserWhenUpdateMultipleLinkInterceptor } from './interceptors/handle-check-limit-link-user-when-update-multiple-link.interceptor';
import { Public } from 'src/common/guard/guard';

@Controller('links')
export class LinkController {
  constructor(private readonly linkService: LinkService) { }

  @Post('/get-link-deleted')
  getLinkDelete(@Body() body: IGetLinkDeleted) {
    return this.linkService.getLinksDeleted(body);
  }

  @Post()
  @UseInterceptors(CheckLimitLinkUserWhenAddLinkInterceptor)
  create(@Req() req: Request, @Body() createLinkDto: CreateLinkDTO) {
    const user = getUser(req);

    return this.linkService.create({
      ...createLinkDto,
      userId: user.id,
    });
  }

  @Get('/:id')
  getUser(@Param('id') id: number) {
    return this.linkService.getOne(id);
  }

  @Post('/query')
  getLinks(@Req() req: Request, @Body() body: {
    limit: number
    offset: number,
    crawType: CrawType
  }) {
    const user = getUser(req);

    return this.linkService.getAll(user.level, user.id, body);
  }

  @Put()
  updateLink(@Req() req: Request, @Body() updateLinkDto: UpdateLinkDTO) {
    const user = getUser(req);
    return this.linkService.update(updateLinkDto, user.level);
  }

  @Delete('/:id')
  deleteLink(@Param('id') id: number) {
    return this.linkService.delete(id);
  }

  @Post('/hide-cmt/:linkId')
  hideCmt(@Req() req: Request, @Param('linkId') linkId: number, @Query('type') type: HideBy) {
    const user = getUser(req);

    return this.linkService.hideCmt(linkId, type, user.id)
  }

  @Post('/setting-link')
  @UseInterceptors(CheckLimitLinkUserWhenUpdateMultipleLinkInterceptor)
  settingLink(@Body() body: ISettingLinkDto) {
    return this.linkService.settingLink(body)
  }

  @Post('/priority')
  priority(@Body() body: { priority: boolean, linkId: number }) {
    return this.linkService.priority(body)
  }

  @Get('get-keywords/:id')
  getkeywordsByLink(@Param('id') id: number) {
    return this.linkService.getkeywordsByLink(id);
  }

  @Post('/update-link-delete')
  updateLinkDelete(@Body() body: { status: LinkStatus, linkIds: number[] }) {
    return this.linkService.updateLinkDelete(body)
  }

  @Get('tiktok/auto')
  @Public()
  autoGetLinkTiktok() {
    return this.linkService.autoGetLinkTiktok();
  }
}
