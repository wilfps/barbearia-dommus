import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth";
import { updateServicePrice } from "@/lib/db";

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
  const formData = await request.formData();
  const serviceId = String(formData.get("serviceId") || "");
  const price = String(formData.get("price") || "");

  if (!serviceId) {
    redirect("/owner");
  }

  const priceInCents = parsePriceToCents(price);
  if (priceInCents === null) {
    redirect("/owner");
  }

  updateServicePrice({ serviceId, priceInCents });
  redirect("/owner");
}
