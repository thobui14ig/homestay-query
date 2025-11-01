import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import puppeteer from "puppeteer";

@Injectable()
export class TiktokService {
  constructor(private readonly httpService: HttpService){}

  async autoGetLinkTiktok() {
    const keyEncode = encodeURIComponent("Homestay ở Huế giá rẻ")
    console.log(keyEncode)
    let isDone = false;
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    let list = []

    // Lắng nghe tất cả response
    page.on('response', async res=> {
      const url = res.url();
      if(url.includes("search/general/full")) {
          const response = await res.json()
          response?.data?.forEach(element => {
            const { item } = element || {}
            const { author, stats, desc, id } = item || {}
            const { uniqueId, nickname } = author || {}
            const { commentCount, diggCount: likeCount } = stats || {}
            const detail = {
              id,
              url: `https://www.tiktok.com/@${uniqueId}/video/${id}`,
              desc,
              commentCount,
              likeCount,
              nickname
            }
            list.push(detail)
          });
          
          if(response.data.length < 12) {
            isDone = true;
            await browser.close(); // tuỳ chọn: dừng luôn trình duyệt
          }
          console.log('📦 RESPONSE:', response.data.length);
      }

    });
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    await page.goto(`https://www.tiktok.com/search?q=${keyEncode}&t=1761369473985`);
    await sleep(5000); // chờ 2 giây
    for (let i = 0; i < 100; i++) { // cuộn 50 lần (bạn có thể chỉnh)
      if (isDone) break; // dừng nếu trang đã bị đóng
      await page.mouse.wheel({ deltaY: 2000 });
      await sleep(2000); // chờ 2 giây
    }

    return list
  }
}