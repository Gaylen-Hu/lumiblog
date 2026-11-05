import type { PostDetail, Project, PaginatedResponse, Post } from '@/types'
import type { PublicColumnListItemDto, PublicColumnDetailDto } from '@/types/column'
import type { TimelineEntry, FriendLink } from '@/lib/api'

export type ReadingData =
  | { kind: 'article'; post: PostDetail }
  | { kind: 'posts'; posts: PaginatedResponse<Post> }
  | { kind: 'columns'; columns: PublicColumnListItemDto[] }
  | { kind: 'column'; column: PublicColumnDetailDto }
  | { kind: 'timeline'; entries: TimelineEntry[] }
  | { kind: 'projects'; projects: Project[] }
  | { kind: 'project'; project: Project }
  | { kind: 'about'; owner: { name: string; bio: string; avatar: string | null; techStack: string[] } }
  | { kind: 'links'; links: FriendLink[] }
  | { kind: 'rss' }
