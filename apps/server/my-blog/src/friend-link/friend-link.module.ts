import { Module } from '@nestjs/common';
import { FriendLinkService } from './friend-link.service';
import { FriendLinkController, PublicFriendLinkController } from './friend-link.controller';

@Module({ controllers: [FriendLinkController, PublicFriendLinkController], providers: [FriendLinkService] })
export class FriendLinkModule {}
