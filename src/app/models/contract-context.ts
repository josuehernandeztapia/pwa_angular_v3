import { BusinessFlow } from './types';

export interface ContractContextSnapshot {
  clientId?: string;
  contractId?: string | null;
  market?: string | null;
  businessFlow?: BusinessFlow;
  source?: string | null;
  documentsComplete: boolean;
  aviStatus?: string | null;
  aviDecision?: string | null;
  voiceVerified: boolean;
  requiresVoiceVerification?: boolean;
  protectionRequired: boolean;
  protectionApplied: boolean;
  pendingOfflineRequests: number;
  updatedAt: number;
}
