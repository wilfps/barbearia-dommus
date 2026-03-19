import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth";
import { deleteLeadById } from "@/lib/db";

export async function POST(request: Request) {
  await requireRoles(["OWNER"]);
  const wantsJson =
    request.headers.get("content-type")?.includes("application/json") ||
    request.headers.get("accept")?.includes("application/json");

  let leadId = "";

  if (request.headers.get("content-type")?.includes("application/json")) {
    const body = (await request.json()) as { leadId?: string };
    leadId = String(body.leadId || "");
  } else {
    const formData = await request.formData();
    leadId = String(formData.get("leadId") || "");
  }

  if (!leadId) {
    if (wantsJson) {
      return NextResponse.json({ error: "Lead nao informado." }, { status: 400 });
    }

    redirect("/owner");
  }

  deleteLeadById(leadId);

  if (wantsJson) {
    return NextResponse.json({ ok: true, leadId });
  }

  redirect("/owner");
}
