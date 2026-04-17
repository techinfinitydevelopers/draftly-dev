export type IntegrationId =
  | 'firebase'
  | 'supabase'
  | 'stripe'
  | 'google_analytics'
  | 'meta_pixel'
  | 'resend'
  | 'sendgrid'
  | 'github'
  | 'vercel'
  | 'custom_domain';

export type IntegrationFieldType = 'text' | 'password' | 'url';

export interface IntegrationFieldSchema {
  key: string;
  label: string;
  type: IntegrationFieldType;
  required: boolean;
  placeholder?: string;
  help?: string;
  /** Shown for optional sensitive fields */
  warn?: string;
}

export interface IntegrationDefinition {
  id: IntegrationId;
  name: string;
  description: string;
  category: 'backend' | 'payments' | 'analytics' | 'email' | 'ads' | 'hosting' | 'devops';
  icon: string;
  dashboardUrl: string;
  docsUrl?: string;
  fields: IntegrationFieldSchema[];
  /** Feature flags toggled in UI when connected */
  activatesFeatures: string[];
}

export interface IntegrationPublicState {
  id: IntegrationId;
  name: string;
  category: IntegrationDefinition['category'];
  status: 'not_connected' | 'connected' | 'error';
  lastVerifiedAt: string | null;
  lastError: string | null;
  /** Masked previews only, e.g. { publishableKey: "pk_live••••abcd" } */
  maskedFields: Record<string, string>;
  featuresEnabled: string[];
  updatedAt: string | null;
}
