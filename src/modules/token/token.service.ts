import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreateTokenDto } from './dto/create-token.dto';
import { UpdateTokenDto } from './dto/update-token.dto';
import { TokenEntity, TokenHandle, TokenStatus, TokenType } from './entities/token.entity';
import { DataSource, In, IsNull, Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { FacebookService } from '../facebook/facebook.service';

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(TokenEntity)
    private repo: Repository<TokenEntity>,
    @Inject(forwardRef(() => FacebookService))
    private facebookService: FacebookService,
    private connection: DataSource,
  ) { }

  async create(params: CreateTokenDto) {
    //chưa code trường hợp có cookie
    const tokenValid = [];
    const tokenInValid = [];
    const type = params.type

    for (const item of params.tokens) {
      let token = item;
      let tokenV1 = null;

      if (item.includes('c_user')) {
        const profileEAADo1 = await this.facebookService.getDataProfileFb(token, TokenType.EAADo1);
        const profileEAAAAAY = await this.facebookService.getDataProfileFb(token, TokenType.EAAAAAY);

        if (!profileEAADo1.accessToken || !profileEAAAAAY.accessToken) {
          tokenInValid.push(token);
          continue;
        }
        token = profileEAADo1.accessToken;
        tokenV1 = profileEAAAAAY.accessToken
      }

      const isExit = (await this.repo.findOne({
        where: {
          tokenValue: token,
        },
      }))
        ? true
        : false;

      if (!isExit) {
        tokenValid.push({
          tokenValue: token,
          tokenValueV1: tokenV1,
          type
        });
        continue;
      }

      tokenInValid.push(token);
    }

    await this.repo.save(tokenValid);

    throw new HttpException(
      `Thêm thành công ${tokenValid.length}${tokenInValid.length > 0 ? `, Token không hợp lệ ${tokenInValid.length}: [${tokenInValid.join(',')}]` : ''}`,
      HttpStatus.OK,
    );
  }

  findAll() {
    return this.repo.find({
      order: {
        id: 'desc',
      },
    });
  }

  findOne(id: number) {
    return this.repo.findOne({
      where: {
        id,
      },
    });
  }

  remove(id: number) {
    return this.connection.transaction(async (manager) => {
      const record = await manager
        .getRepository(TokenEntity)
        .createQueryBuilder("e")
        .setLock("pessimistic_write")
        .where("e.id = :id", { id })
        .getOneOrFail();


      await manager.remove(record);
    });
  }

  async getTokenCrawCmtActiveFromDb(): Promise<TokenEntity> {
    const tokens = await this.repo.find({
      where: {
        status: In([TokenStatus.ACTIVE]),
        tokenValueV1: Not(IsNull()),
        type: TokenHandle.CRAWL_CMT
      }
    })

    const randomIndex = Math.floor(Math.random() * tokens.length);
    const randomToken = tokens[randomIndex];

    return randomToken
  }

  async getTokenGetInfoActiveFromDb(): Promise<TokenEntity> {
    const tokens = await this.repo.find({
      where: {
        status: In([TokenStatus.ACTIVE]),
        tokenValueV1: Not(IsNull()),
        type: TokenHandle.GET_INFO
      }
    })

    const randomIndex = Math.floor(Math.random() * tokens.length);
    const randomToken = tokens[randomIndex];

    return randomToken
  }

  updateStatusToken(token: TokenEntity, status: TokenStatus) {
    console.log("🚀 ~ updateTokenDie ~ token:", token)
    return this.repo.save({ ...token, status })
  }

}
