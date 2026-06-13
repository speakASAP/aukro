export type AiProposalStatus = 'pending_review' | 'approved' | 'rejected' | 'blocked';
export type AiProposalTarget = 'listing' | 'policy-risk';
export type HumanReviewDecision = 'approve' | 'reject';

export interface CreateAiProposalRequest {
  target?: AiProposalTarget;
  requestedBy: string;
  correlationId?: string;
  minConfidence?: number;
}

export interface AiProposalFields {
  title?: string;
  description?: string;
  categoryId?: string;
  parameters?: Record<string, any>;
  price?: number;
}

export interface AiProposalRecord {
  id: string;
  requestId: string;
  target: AiProposalTarget;
  status: AiProposalStatus;
  requestedBy: string;
  createdAt: string;
  model?: string;
  modelVersion?: string;
  confidence?: number;
  riskLevel?: string;
  proposedFields: AiProposalFields;
  reviewRequired: true;
  blockers: string[];
  aiService: {
    success: boolean;
    unavailable?: boolean;
    contractVersion?: string;
    errorCode?: string;
  };
}

export interface ReviewAiProposalRequest {
  actorId: string;
  decision: HumanReviewDecision;
  reason?: string;
  editedFields?: AiProposalFields;
}

export interface HumanReviewRecord {
  proposalId: string;
  actorId: string;
  decision: HumanReviewDecision;
  reviewedAt: string;
  reason?: string;
  editedFields?: AiProposalFields;
  diff: Record<string, { before: any; after: any }>;
}

export interface AiProposalResponse {
  success: boolean;
  offerId: string;
  proposal: AiProposalRecord;
  notification?: {
    success: boolean;
    unavailable?: boolean;
    errorCode?: string;
  };
}
