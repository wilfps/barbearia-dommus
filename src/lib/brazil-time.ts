const SAO_PAULO_OFFSET = "-03:00";

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
