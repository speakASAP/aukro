export type EcosystemClientMethod = 'GET' | 'POST' | 'PUT' | 'PATCH';

export interface EcosystemClientResult<T = any> {
  success: boolean;
  service: string;
  contractVersion: string;
  data?: T;
  unavailable?: boolean;
  status?: number;
  errorCode?: string;
}

export interface EcosystemHealthResult {
  status?: string;
  checkedAt?: string;
}

export interface AukroClientContext {
  correlationId?: string;
  actorId?: string;
  accountId?: string;
  offerId?: string;
  productId?: string;
}
