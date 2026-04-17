export interface StudioApiErrorLike {
  error?: string;
  limitReached?: boolean;
}

/**
 * For generation limit/paywall failures, show a popup and redirect to pricing.
 * Returns the final message that should be displayed in node error state.
 */
export function handleStudioUpgradeRedirect(
  err: StudioApiErrorLike | null | undefined,
  fallbackMessage: string,
): string {
  const message = err?.error || fallbackMessage;
  const shouldUpgrade =
    !!err?.limitReached ||
    /not enough credits|upgrade|required|requires basic|requires pro/i.test(message);

  if (shouldUpgrade && typeof window !== 'undefined') {
    alert(`${message}\n\nPlease upgrade to continue generating in Studio.`);
    window.location.href = '/pricing#pricing';
  }

  return message;
}
