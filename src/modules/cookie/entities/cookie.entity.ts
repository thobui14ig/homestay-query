import { PageEntity } from 'src/modules/page/entities/pages.entity';
import { UserEntity } from 'src/modules/user/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';

export enum CookieStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    LIMIT = 'limit',
    DIE = 'die',
}

@Entity('cookie')
export class CookieEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'text' })
    cookie: string;

    @Column({ name: 'created_by' })
    createdBy: number;

    @Column({ name: 'token', type: 'varchar', length: 255 })
    token: string;

    @Column({ type: 'enum', enum: CookieStatus, default: CookieStatus.ACTIVE })
    status: CookieStatus;

    @Column({ name: 'fb_id', })
    fbId: string;

    @Column({ name: 'fb_dtsg', })
    fbDtsg: string;

    @Column({ name: 'jazoest', })
    jazoest: string;

    @Column({ name: 'page_id' })
    pageId: number;

    @ManyToOne(() => UserEntity, (user) => user.links)
    @JoinColumn({ name: 'created_by' })
    user: UserEntity;

    @ManyToOne(() => PageEntity, (page) => page.cookies)
    @JoinColumn({ name: 'page_id' })
    page: PageEntity;
}