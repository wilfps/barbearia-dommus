import type { SiteSetting } from "@/lib/db";

export type InfinitePayCheckoutConfig = {
  provider: string;
  handle: string;
  redirectUrl: string;
  webhookUrl: string;
  handleConfigured: boolean;
  apiTokenConfigured: boolean;
  readyForActivation: boolean;
};

export function getInfinitePayCheckoutConfig(site?: SiteSetting | null): InfinitePayCheckoutConfig {
  const provider = site?.checkout_provider?.trim() || "infinitepay";
  const handle = site?.checkout_handle?.trim() || "";
  const redirectUrl = site?.checkout_redirect_url?.trim() || "";
  const webhookUrl = site?.checkout_webhook_url?.trim() || "";
  const apiTokenConfigured = Boolean(process.env.INFINITEPAY_API_TOKEN?.trim());

  return {
    provider,
    handle,
    redirectUrl,
    webhookUrl,
    handleConfigured: Boolean(handle),
    apiTokenConfigured,
    readyForActivation: Boolean(handle) && apiTokenConfigured,
  };
}
