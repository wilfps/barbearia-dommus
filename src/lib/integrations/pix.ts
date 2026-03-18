export type PixCheckoutPayload = {
  amountInCents: number;
  protocolCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description: string;
};

export type PixIntegrationConfig = {
  provider: string;
  apiBaseUrl: string;
  tokenConfigured: boolean;
  pixKeyConfigured: boolean;
};

export function getPixIntegrationConfig(): PixIntegrationConfig {
  return {
    provider: process.env.PIX_PROVIDER || "mercado-pago",
    apiBaseUrl: process.env.PIX_API_BASE_URL || "",
    tokenConfigured: Boolean(process.env.PIX_API_TOKEN),
    pixKeyConfigured: Boolean(process.env.PIX_KEY),
  };
}

export function buildPixCheckoutPayload(input: PixCheckoutPayload) {
  return {
    amount: input.amountInCents / 100,
    protocolCode: input.protocolCode,
    customer: {
      name: input.customerName,
      email: input.customerEmail,
      phone: input.customerPhone,
    },
    description: input.description,
    paymentMethod: "pix",
  };
}
