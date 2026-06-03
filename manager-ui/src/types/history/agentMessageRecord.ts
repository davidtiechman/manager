// One messages-table row.

export interface AgentMessageRecord {
  id: string;
  agentId: string;
  receivedAt: string | null;
  sentAt: string | null;
  content: string | null;
  priority: number | null;
  contentJson: unknown | null;
  contentExcel: string | null;
  contentType: 'Json' | 'Excel' | null;
  processed: boolean | null;
}
