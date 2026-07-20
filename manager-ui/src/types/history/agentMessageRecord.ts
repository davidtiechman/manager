// One messages-table row.

import type { PlatformData } from './agentHistoryRecord';

export interface AgentMessageRecord {
  id: string;
  agent?: { id: string } | null;
  receivedAt: string | null;
  sentAt: string | null;
  content: string | null;
  priority: number | null;
  contentJson: unknown | null;
  contentExcel: string | null;
  contentType: 'Json' | 'Excel' | null;
  processed: boolean | null;
  // Platform snapshot captured when the message was written (null on legacy rows).
  platform?: PlatformData | null;
}
