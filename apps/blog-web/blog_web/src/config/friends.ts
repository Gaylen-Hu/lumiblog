export interface FriendLink {
  name: string
  url: string
  description: string
  initials: string
  tags: string[]
}

// Add only verified reciprocal partners here. The page and sitemap become indexable
// automatically as soon as the first link is published.
export const FRIEND_LINKS: FriendLink[] = []