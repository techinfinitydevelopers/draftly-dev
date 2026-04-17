/** sessionStorage key: hand off website intent from 3D Builder → Full App Builder */
export const FULL_APP_HANDOFF_STORAGE_KEY = 'draftly_full_app_prompt_handoff';

export type FullAppHandoffPayload = {
  v: number;
  sitePrompt?: string;
  bgPrompt?: string;
  chatDraft?: string;
};
