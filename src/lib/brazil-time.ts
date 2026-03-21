const SAO_PAULO_OFFSET = "-03:00";
const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

function normalizeTime(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

export function toBrazilDateTimeIso(dateIso: string, time: string) {
  return new Date(`${dateIso}T${normalizeTime(time)}${SAO_PAULO_OFFSET}`).toISOString();
}

export function toBrazilDateObject(dateIso: string, time = "00:00:00") {
  return new Date(`${dateIso}T${normalizeTime(time)}${SAO_PAULO_OFFSET}`);
}

export function getBrazilDayRange(dateIso: string) {
  return {
    startIso: toBrazilDateTimeIso(dateIso, "00:00:00"),
    endIso: toBrazilDateTimeIso(dateIso, "23:59:59"),
  };
}

export function formatBrazilTime(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: SAO_PAULO_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(date));
}

export function formatBrazilDate(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: SAO_PAULO_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatBrazilWeekday(date: Date | string, uppercase = false) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    timeZone: SAO_PAULO_TIME_ZONE,
    weekday: "long",
  }).format(new Date(date));

  return uppercase ? label.toUpperCase() : label;
}

export function formatBrazilDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: SAO_PAULO_TIME_ZONE,
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}

export function formatBrazilDateInput(date: Date | string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}
