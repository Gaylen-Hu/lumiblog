import type { RoomStage } from '../room-stage';
import type { createAgentTransport } from './agent/transport.js';

export interface WebsiteCatState {
  readonly mode: 'reading' | 'room';
  readonly visible: boolean;
  readonly paused: boolean;
  readonly motion: string;
  readonly posture: string;
  readonly stage: string;
  readonly position: readonly number[];
  readonly currentCommand: string | null;
}

export interface WebsiteCat {
  openChat(): void;
  setReading(reading: boolean): void;
  /** User preference: true leaves a small restore control. */
  setHidden(hidden: boolean): void;
  /** Temporary host state: hide and pause without changing the saved preference. */
  setSuspended(suspended: boolean): void;
  setReducedMotion(reduced: boolean): void;
  /** Reuse the same cat in the host scene; null restores the reading overlay. */
  setRoomStage(stage: RoomStage | null): void;
  destroy(): void;
  readonly state: WebsiteCatState;
}

export interface WebsiteCatOptions {
  /** Optional host adapter; an absent adapter grants no website controls. */
  website?: WebsiteAssistant;
  container?: HTMLElement;
  apiBase?: string;
  transport?: ReturnType<typeof createAgentTransport>;
  position?: 'left' | 'right';
  quality?: 'low' | 'medium' | 'high';
  headUrl?: string;
  bottomOffset?: number;
  /** Seconds between unprompted room walks, default [40, 70]. */
  wanderInterval?: readonly [number, number];
  initialHidden?: boolean;
  mobile?: boolean;
  signal?: AbortSignal;
  locale?: string;
  onVisibilityChange?: (visible: boolean) => void;
  onChatOpenChange?: (open: boolean) => void;
}

export interface WebsiteAssistant {
  getCapabilities(): { site: string[]; drafts: ('letter' | 'comment')[] };
  getContext(): {
    article?: { slug: string; locale: 'zh' | 'en'; title: string; selection?: string; selectionHeading?: string };
    room?: { ceilingOn: boolean; lampOn: boolean; curtainsClosed: boolean };
  };
  subscribeContext(listener: () => void): () => void;
  execute(value: string): Promise<{ status: 'succeeded' | 'blocked' | 'cancelled' | 'unknown'; reason?: string }>;
  prepareDraft(kind: 'letter' | 'comment', text: string): { status: 'succeeded' | 'blocked'; reason?: string };
}

export function mountWebsiteCat(options?: WebsiteCatOptions): Promise<WebsiteCat>;

