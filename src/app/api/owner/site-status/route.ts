import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth";
import { updateSiteSetting } from "@/lib/db";

export async function POST(request: Request) {
  await requireRoles(["OWNER"]);
  const wantsJson =
    request.headers.get("content-type")?.includes("application/json") ||
    request.headers.get("accept")?.includes("application/json");

  let isOpen = true;
  let maintenanceMessage = "";

  if (request.headers.get("content-type")?.includes("application/json")) {
    const body = (await request.json()) as { isOpen?: boolean; maintenanceMessage?: string };
    isOpen = Boolean(body.isOpen);
    maintenanceMessage = String(body.maintenanceMessage || "");
  } else {
    const formData = await request.formData();
    isOpen = String(formData.get("isOpen") || "") === "true";
    maintenanceMessage = String(formData.get("maintenanceMessage") || "");
  }

  updateSiteSetting(isOpen, maintenanceMessage);

  if (wantsJson) {
    return NextResponse.json({ ok: true });
  }

  redirect("/owner");
}
