import { getWebsiteContext, subscribeWebsiteContext } from './website-context'
import { executeRoomAction, getRoomActions, getWebsiteRoomState } from './website-room'
import { getDraftCapabilities, prepareWebsiteDraft } from './website-drafts'
import type { WebsiteAssistant } from './runtime/website-cat.js'

/** Host-only permissions: the portable cat does not inspect arbitrary site DOM. */
export const websiteAssistant: WebsiteAssistant = {
  getCapabilities: () => ({ site: getRoomActions(), drafts: getDraftCapabilities() }),
  getContext: () => {
    const room = getWebsiteRoomState()
    return { ...getWebsiteContext(), ...(room ? { room } : {}) }
  },
  subscribeContext: subscribeWebsiteContext,
  execute: executeRoomAction,
  prepareDraft: prepareWebsiteDraft,
}
