import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth";
import { getUserById, updateUserRoleAndStatus } from "@/lib/db";

export async function POST(request: Request) {
  await requireRoles(["OWNER"]);
  const wantsJson =
    request.headers.get("content-type")?.includes("application/json") ||
    request.headers.get("accept")?.includes("application/json");

  let userId = "";
  let role = "CUSTOMER";
  let isActive = true;

  if (request.headers.get("content-type")?.includes("application/json")) {
    const body = (await request.json()) as { userId?: string; role?: string; isActive?: boolean };
    userId = String(body.userId || "");
    role = String(body.role || "CUSTOMER");
    isActive = Boolean(body.isActive);
  } else {
    const formData = await request.formData();
    userId = String(formData.get("userId") || "");
    role = String(formData.get("role") || "CUSTOMER");
    isActive = String(formData.get("isActive") || "true") === "true";
  }

  if (!userId) {
    if (wantsJson) {
      return NextResponse.json({ error: "Usuario nao informado." }, { status: 400 });
    }
    redirect("/owner");
  }

  updateUserRoleAndStatus({ userId, role, isActive });
  const user = getUserById(userId);

  if (wantsJson) {
    return NextResponse.json({ ok: true, user });
  }

  redirect("/owner");
}
