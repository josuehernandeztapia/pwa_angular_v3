
export interface ClientContextSnapshot {
  clientId: string | null;
  contractId: string | null;
  market?: string | null;
  lastUpdated: number;
}
