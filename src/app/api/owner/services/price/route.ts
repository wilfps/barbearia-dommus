import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth";
import { getServiceById, updateServicePrice } from "@/lib/db";

function parsePriceToCents(input: string) {
  const normalized = input.replace(",", ".").trim();
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.round(value * 100);
}

export async function POST(request: Request) {
  await requireRoles(["OWNER"]);
  const wantsJson =
    request.headers.get("content-type")?.includes("application/json") ||
    request.headers.get("accept")?.includes("application/json");

  let serviceId = "";
  let price = "";

  if (request.headers.get("content-type")?.includes("application/json")) {
    const body = (await request.json()) as { serviceId?: string; price?: string };
    serviceId = String(body.serviceId || "");
    price = String(body.price || "");
  } else {
    const formData = await request.formData();
    serviceId = String(formData.get("serviceId") || "");
    price = String(formData.get("price") || "");
  }

  if (!serviceId) {
    if (wantsJson) {
      return NextResponse.json({ error: "Servico nao informado." }, { status: 400 });
    }
    redirect("/owner");
  }

  const priceInCents = parsePriceToCents(price);
  if (priceInCents === null) {
    if (wantsJson) {
      return NextResponse.json({ error: "Valor invalido." }, { status: 400 });
    }
    redirect("/owner");
  }

  updateServicePrice({ serviceId, priceInCents });
  const service = getServiceById(serviceId);

  if (wantsJson) {
    return NextResponse.json({ ok: true, service });
  }

  redirect("/owner");
}
