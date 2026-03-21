import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth";
import { cancelAppointmentById, getAppointmentById } from "@/lib/db";

function wantsJson(request: Request) {
  const accept = request.headers.get("accept") || "";
  const contentType = request.headers.get("content-type") || "";
  return accept.includes("application/json") || contentType.includes("application/json");
}

export async function POST(request: Request) {
  const user = await requireRoles(["CUSTOMER", "OWNER"]);
  const useJson = wantsJson(request);
  let appointmentId = "";
  let returnTo = "/cliente/minha-area#checkout";

  if (request.headers.get("content-type")?.includes("application/json")) {
    const body = (await request.json()) as { appointmentId?: string; returnTo?: string };
    appointmentId = String(body.appointmentId || "");
    returnTo = String(body.returnTo || "/cliente/minha-area#checkout");
  } else {
    const formData = await request.formData();
    appointmentId = String(formData.get("appointmentId") || "");
    returnTo = String(formData.get("returnTo") || "/cliente/minha-area#checkout");
  }

  const appointment = getAppointmentById(appointmentId);

  if (!appointment || appointment.customer_id !== user.id) {
    if (useJson) {
      return Response.json({ success: false, message: "Reserva não encontrada." }, { status: 404 });
    }

    redirect("/cliente/minha-area");
  }

  cancelAppointmentById(appointmentId);

  if (useJson) {
    return Response.json({ success: true });
  }

  redirect(returnTo);
}
