export function formatMoney(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);
}

export function formatPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}

export function parseBrazilianDate(value: string) {
  const normalized = value.trim();
  const match = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  const isoDate = `${year}-${month}-${day}`;
  const parsed = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  return isoDate;
}

export function formatBirthDate(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(parsed);
}

export function buildWhatsAppLink(phone: string, message: string) {
  const rawDigits = formatPhone(phone);
  if (!rawDigits) return "#";
  const digits = rawDigits.startsWith("55") ? rawDigits : `55${rawDigits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
