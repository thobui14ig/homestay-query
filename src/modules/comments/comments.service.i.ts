import dayjs from "dayjs"
import { CrawType } from "../links/entities/links.entity"

export interface IGetCommentParams {
    startDate: dayjs.Dayjs
    endDate: dayjs.Dayjs
    limit: number
    offset: number
    keyword?: string
    crawType: CrawType
}