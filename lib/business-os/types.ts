export type DeploymentStatus = 'draft' | 'building' | 'live' | 'paused' | 'error';

export interface BusinessProjectStub {
  id: string;
  name: string;
  status: DeploymentStatus;
  primaryDomain: string | null;
  lastDeployedAt: string | null;
}

export interface MockMetrics {
  visitors7d: number;
  sessions7d: number;
  conversionRate: number;
  revenue30dCents: number;
  liveUsers: number;
}

export interface IntegrationStub {
  id: string;
  name: string;
  enabled: boolean;
  category: 'analytics' | 'ads' | 'email' | 'backend' | 'payments';
}
