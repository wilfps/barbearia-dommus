import { requireRoles } from "@/lib/auth";
import { deleteAppointmentById } from "@/lib/db";

export async function POST(request: Request) {
  await requireRoles(["ADMIN", "BARBER", "OWNER"]);

  let appointmentId = "";

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { appointmentId?: string };
    appointmentId = String(body.appointmentId || "");
  } else {
    const formData = await request.formData();
    appointmentId = String(formData.get("appointmentId") || "");
  }

  if (!appointmentId) {
    return Response.json({ success: false, message: "Agendamento inválido." }, { status: 400 });
  }

  deleteAppointmentById(appointmentId);
  return Response.json({ success: true });
}

