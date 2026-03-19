import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth";
import { deleteAppointmentById } from "@/lib/db";

export async function POST(request: Request) {
  await requireRoles(["OWNER"]);
  const wantsJson =
    request.headers.get("content-type")?.includes("application/json") ||
    request.headers.get("accept")?.includes("application/json");

  let appointmentId = "";

  if (request.headers.get("content-type")?.includes("application/json")) {
    const body = (await request.json()) as { appointmentId?: string };
    appointmentId = String(body.appointmentId || "");
  } else {
    const formData = await request.formData();
    appointmentId = String(formData.get("appointmentId") || "");
  }

  if (!appointmentId) {
    if (wantsJson) {
      return NextResponse.json({ error: "Agendamento nao informado." }, { status: 400 });
    }

    redirect("/owner");
  }

  deleteAppointmentById(appointmentId);

  if (wantsJson) {
    return NextResponse.json({ ok: true, appointmentId });
  }

  redirect("/owner");
}
