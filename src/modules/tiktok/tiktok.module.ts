import { Module } from "@nestjs/common";
import { TiktokService } from "./tiktok.service";
import { HttpModule } from "@nestjs/axios";

@Module({
  imports: [HttpModule],
  controllers: [],
  providers: [TiktokService],
  exports: [TiktokService]
})
export class TiktokModule { }