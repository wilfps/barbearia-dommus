import { formatMoney } from "@/lib/format";

export type WhatsAppIntegrationConfig = {
  provider: string;
  phoneNumber: string;
  tokenConfigured: boolean;
  phoneIdConfigured: boolean;
};

export function getWhatsAppIntegrationConfig(): WhatsAppIntegrationConfig {
  return {
    provider: process.env.WHATSAPP_PROVIDER || "meta-cloud-api",
    phoneNumber: process.env.WHATSAPP_BUSINESS_NUMBER || "",
    tokenConfigured: Boolean(process.env.WHATSAPP_TOKEN),
    phoneIdConfigured: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID),
  };
}

export function buildBirthdayMessage(customerName: string) {
  return `Olá, ${customerName}! Aqui é a equipe da Dommus Barbearia.\n\nPassando para te desejar um feliz aniversário, muita saúde, paz e um novo ciclo cheio de conquistas.\n\nQuando quiser, sua cadeira aqui já está te esperando.`;
}

export function buildPixMessage(input: {
  customerName: string;
  protocolCode: string;
  serviceName: string;
  depositInCents: number;
  pixCode?: string;
}) {
  return `Dommus Barbearia\n\nOlá, ${input.customerName}.\nSeu pagamento do sinal para ${input.serviceName} está pronto.\nProtocolo: ${input.protocolCode}\nValor do sinal: ${formatMoney(input.depositInCents)}\n\n${input.pixCode ? `PIX copia e cola:\n${input.pixCode}` : "PIX copia e cola será enviado aqui quando a API de checkout estiver conectada."}`;
}
