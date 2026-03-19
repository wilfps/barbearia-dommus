import type { SiteSetting } from "@/lib/db";

const INFINITEPAY_API_BASE = "https://api.infinitepay.io";

export type InfinitePayCheckoutConfig = {
  provider: string;
  handle: string;
  redirectUrl: string;
  webhookUrl: string;
  handleConfigured: boolean;
  readyForActivation: boolean;
};

export type InfinitePayCheckoutItem = {
  quantity: number;
  price: number;
  description: string;
};

export type InfinitePayCheckoutLinkInput = {
  handle: string;
  items: InfinitePayCheckoutItem[];
  orderNsu: string;
  redirectUrl?: string;
  webhookUrl?: string;
  customer?: {
    name: string;
    email?: string;
    phoneNumber?: string;
  };
};

export type InfinitePayPaymentCheckInput = {
  handle: string;
  orderNsu: string;
  transactionNsu: string;
  slug: string;
};

type InfinitePayApiResponse = Record<string, unknown>;

function buildHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const token = process.env.INFINITEPAY_API_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function toCheckoutPhone(phone?: string) {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return undefined;
  return digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
}

function parseJsonResponse(rawText: string) {
  try {
    return JSON.parse(rawText) as InfinitePayApiResponse;
  } catch {
    return null;
  }
}

function extractCheckoutUrl(payload: InfinitePayApiResponse | null) {
  if (!payload) return null;

  const directKeys = [
    "url",
    "checkout_url",
    "checkoutUrl",
    "invoice_url",
    "invoiceUrl",
    "link",
    "payment_url",
    "paymentUrl",
  ];

  for (const key of directKeys) {
    const value = payload[key];
    if (typeof value === "string" && value.startsWith("http")) {
      return value;
    }
  }

  const nestedCandidates = [payload.data, payload.result, payload.invoice, payload.checkout];
  for (const candidate of nestedCandidates) {
    if (!candidate || typeof candidate !== "object") continue;
    for (const key of directKeys) {
      const value = (candidate as Record<string, unknown>)[key];
      if (typeof value === "string" && value.startsWith("http")) {
        return value;
      }
    }
  }

  return null;
}

function extractApiError(payload: InfinitePayApiResponse | null, fallback: string) {
  if (!payload) return fallback;

  const candidates = [
    payload.message,
    payload.error,
    payload.detail,
    payload.details,
    payload.reason,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return fallback;
}

export function getInfinitePayCheckoutConfig(site?: SiteSetting | null): InfinitePayCheckoutConfig {
  const provider = site?.checkout_provider?.trim() || "infinitepay";
  const handle = site?.checkout_handle?.trim() || "";
  const redirectUrl = site?.checkout_redirect_url?.trim() || "";
  const webhookUrl = site?.checkout_webhook_url?.trim() || "";

  return {
    provider,
    handle,
    redirectUrl,
    webhookUrl,
    handleConfigured: Boolean(handle),
    readyForActivation: Boolean(handle),
  };
}

export async function createInfinitePayCheckoutLink(input: InfinitePayCheckoutLinkInput) {
  const payload: Record<string, unknown> = {
    handle: input.handle,
    items: input.items,
    order_nsu: input.orderNsu,
  };

  if (input.redirectUrl) {
    payload.redirect_url = input.redirectUrl;
  }

  if (input.webhookUrl) {
    payload.webhook_url = input.webhookUrl;
  }

  if (input.customer) {
    payload.customer = {
      name: input.customer.name,
      email: input.customer.email || undefined,
      phone_number: toCheckoutPhone(input.customer.phoneNumber),
    };
  }

  const response = await fetch(`${INFINITEPAY_API_BASE}/invoices/public/checkout/links`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const rawText = await response.text();
  const parsed = parseJsonResponse(rawText);

  if (!response.ok) {
    throw new Error(extractApiError(parsed, "Não foi possível gerar o checkout da InfinitePay."));
  }

  const checkoutUrl = extractCheckoutUrl(parsed);
  if (!checkoutUrl) {
    throw new Error("A InfinitePay respondeu sem o link do checkout.");
  }

  return {
    checkoutUrl,
    raw: parsed,
  };
}

export async function checkInfinitePayPayment(input: InfinitePayPaymentCheckInput) {
  const response = await fetch(`${INFINITEPAY_API_BASE}/invoices/public/checkout/payment_check`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      handle: input.handle,
      order_nsu: input.orderNsu,
      transaction_nsu: input.transactionNsu,
      slug: input.slug,
    }),
    cache: "no-store",
  });

  const rawText = await response.text();
  const parsed = parseJsonResponse(rawText);

  if (!response.ok || !parsed) {
    throw new Error(extractApiError(parsed, "Não foi possível confirmar o pagamento na InfinitePay."));
  }

  return {
    success: Boolean(parsed.success),
    paid: Boolean(parsed.paid),
    amountInCents: Number(parsed.amount || 0),
    paidAmountInCents: Number(parsed.paid_amount || 0),
    captureMethod: typeof parsed.capture_method === "string" ? parsed.capture_method : "",
    raw: parsed,
  };
}
