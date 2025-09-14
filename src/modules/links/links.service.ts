import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as dayjs from 'dayjs';
import * as timezone from 'dayjs/plugin/timezone';
import * as utc from 'dayjs/plugin/utc';
import { isNullOrUndefined } from 'src/common/utils/check-utils';
import { DataSource, ILike, In, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { DelayEntity } from '../setting/entities/delay.entity';
import { LEVEL } from '../user/entities/user.entity';
import { UpdateLinkDTO } from './dto/update-link.dto';
import { HideBy, LinkEntity, LinkStatus, LinkType } from './entities/links.entity';
import { BodyLinkQuery, CreateLinkParams, IGetLinkDeleted, ISettingLinkDto } from './links.service.i';

dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class LinkService {
  vnTimezone = 'Asia/Bangkok';

  constructor(
    @InjectRepository(LinkEntity)
    private repo: Repository<LinkEntity>,
    @InjectRepository(DelayEntity)
    private delayRepository: Repository<DelayEntity>,
    private connection: DataSource,
  ) { }

  async create(params: CreateLinkParams) {
    const config = await this.delayRepository.find();
    const linkEntities: Partial<LinkEntity>[] = []
    const linksInValid = [];

    for (const link of params.links) {
      const isExitLink = await this.repo.findOne({
        where: {
          linkUrl: link.url,
          userId: params.userId
        }
      })

      if (!isExitLink) {
        const entity: Partial<LinkEntity> = {
          userId: params.userId,
          linkUrl: link.url,
          delayTime: params.status === LinkStatus.Started ? config[0].delayOnPublic ?? 10 : config[0].delayOff ?? 10,
          status: params.status,
          linkName: link.name,
          hideCmt: params.hideCmt,
          thread: params.thread,
        }
        if (params.hideCmt) {
          entity.tablePageId = params.tablePageId
        }
        linkEntities.push(entity)
        continue
      }

      linksInValid.push(link.url)
    }

    const seenUrls = new Set<string>();
    const uniqueLinks: Partial<LinkEntity>[] = [];

    for (const link of linkEntities) {
      if (link.linkUrl && !seenUrls.has(link.linkUrl)) {
        seenUrls.add(link.linkUrl);
        uniqueLinks.push(link);
      }
    }

    await this.repo.save(uniqueLinks);
    if (linksInValid.length > 0) {
      throw new HttpException(
        `Thêm thành công ${linkEntities.length}, Link bị trùng: [${linksInValid.join(',')}]`,
        HttpStatus.BAD_REQUEST,
      );
    }
    throw new HttpException(
      `Thêm thành công ${linkEntities.length} link`,
      HttpStatus.OK,
    );
  }

  getOne(id: number) {
    return this.repo.findOne({
      where: {
        id,
      },
    });
  }

  async getAll(level: LEVEL, userIdByUerLogin: number, body: {
    limit: number
    offset: number
  }) {
    let queryEntends = ''
    if (level === LEVEL.USER) {
      queryEntends += ` WHERE l.user_id = ${userIdByUerLogin}`
    }
    const { limit, offset } = body
    const query = `
      WITH filtered_links AS (
          SELECT
              l.id,
              l.link_name AS linkName,
              l.link_url AS linkUrl,
              l.content,
              l.status,
              l.type,
               DATE_FORMAT(CONVERT_TZ(l.created_at, '+00:00', '+07:00'), '%Y-%m-%d %H:%i:%s') AS createdAt
          FROM links l
           ${queryEntends}
      )
      SELECT *, (SELECT COUNT(*) FROM filtered_links) AS totalCount
      FROM filtered_links
      ORDER BY createdAt DESC
      LIMIT ${limit} OFFSET ${offset};  
    `
    const response = await this.connection.query(query)

    return {
      data: response,
      totalCount: response.length > 0 ? response[0].totalCount : 0,
    }
  }

  update(params: UpdateLinkDTO, level: LEVEL) {

    return this.connection.transaction(async (manager) => {
      const record = await manager
        .getRepository(LinkEntity)
        .createQueryBuilder("e")
        .setLock("pessimistic_write")
        .where("e.id = :id", { id: params.id })
        .getOneOrFail();

      Object.assign(record, params);

      await manager.save(record);
    });
  }

  delete(id: number) {
    //chưa xử lý stop_monitoring
    return this.repo.update(id, { isDelete: true });
  }

  async hideCmt(linkId: number, type: HideBy, userId: number) {
    const link = await this.repo.findOne({
      where: {
        id: linkId
      }
    })
    if (link) {
      link.hideBy = type
      return this.repo.save(link)
    }

    return null
  }

  getkeywordsByLink(linkId: number) {
    return this.repo.findOne({
      where: {
        id: linkId
      },
      relations: {
        keywords: true
      }
    })
  }

  async settingLink(setting: ISettingLinkDto) {
    if (setting.isDelete) {
      // return this.repo.delete(setting.linkIds)
      await this.repo.update(setting.linkIds, { isDelete: true })
    }

    const links = await this.repo.find({
      where: {
        id: In(setting.linkIds)
      }
    })

    const newLinks = links.map((item) => {
      if (setting.onOff && setting.type === LinkStatus.Pending) {
        item.status = LinkStatus.Started
        item.createdAt = dayjs.utc().format('YYYY-MM-DD HH:mm:ss') as any
      }
      if (!setting.onOff && setting.type === LinkStatus.Started) {
        item.status = LinkStatus.Pending
        item.createdAt = dayjs.utc().format('YYYY-MM-DD HH:mm:ss') as any
      }

      if (setting.delay) {
        item.delayTime = setting.delay
      }

      return item
    })

    return this.repo.save(newLinks)
  }

  async getTotalLinkUserByStatus(userId: number, status: LinkStatus, hideCmt: boolean) {
    const count = await this.connection
      .getRepository(LinkEntity)
      .countBy({
        userId,
        status,
        hideCmt
      })

    return count
  }

  async getTotalLinkUserWhenUpdateMultipleLink(userId: number, status: LinkStatus, hideCmt: boolean, linkIds: number[]) {
    const a = await this.getTotalLinkUserByStatus(userId, status, hideCmt)
    const b = await this.connection
      .getRepository(LinkEntity)
      .countBy({
        userId,
        status: status === LinkStatus.Pending ? LinkStatus.Started : LinkStatus.Pending,
        hideCmt,
        id: In(linkIds)
      })

    return a + b
  }

  async getTotalLinkUser(userId: number) {
    const response = await this.connection.query(`
        SELECT
          (SELECT COUNT(*) FROM links l WHERE l.user_id = u.id AND l.status = 'started' AND l.is_deleted = FALSE) AS totalLinkOn,
          (SELECT COUNT(*) FROM links l WHERE l.user_id = u.id AND l.status = 'pending' AND l.is_deleted = FALSE) AS totalLinkOff
          FROM users u
          WHERE u.id = ${userId};
      `)
    return response[0]
  }

  getPostStarted(): Promise<LinkEntity[]> {
    return this.repo.find({
      where: {
        status: In([LinkStatus.Started, LinkStatus.Pending]),
        type: Not(LinkType.DIE),
        delayTime: MoreThanOrEqual(0),
        hideCmt: false,
        priority: false,
        isDelete: false
      },
      relations: {
        user: true
      }
    })
  }

  priority(body: { priority: boolean, linkId: number }) {
    return this.repo.save({ id: body.linkId, priority: body.priority })
  }

  async getLinksDeleted(query: IGetLinkDeleted) {
    const { keyword, limit, offset, userId } = query
    let condition = ``
    if (userId) {
      condition += ` AND u.id = ${userId} `
    }
    if (keyword) {
      condition += ` AND(u.username REGEXP '${keyword}'
                    OR l.link_name REGEXP '${keyword}'
                    OR l.link_url REGEXP '${keyword}')
      `
    }
    const response = await this.connection.query(`
      select 
          l.id,
          l.link_name AS linkName,
          l.link_url AS linkUrl,
          u.username,
          COUNT(*) OVER() AS totalCount
      from links l 
      JOIN users u ON u.id = l.user_id
      where l.is_deleted = true ${condition}
      LIMIT ${limit} OFFSET ${offset};
    `)
    return {
      data: response,
      totalCount: response.length > 0 ? response[0].totalCount : 0
    }
  }

  updateLinkDelete(body: { status: LinkStatus, linkIds: number[] }) {
    const { linkIds, status } = body

    return this.repo.update(linkIds, { status, isDelete: false })
  }
}
