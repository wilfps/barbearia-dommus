import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { convertLeadsForUser, getAppointmentById, markAppointmentPaid } from "@/lib/db";

export async function POST(request: Request) {
  const user = await requireUser();
  const formData = await request.formData();
  const appointmentId = String(formData.get("appointmentId") || "");
  const returnTo = String(formData.get("returnTo") || "/cliente/minha-area#protocolos");
  const appointment = getAppointmentById(appointmentId);

  if (!appointment || appointment.customer_id !== user.id) {
    redirect("/cliente/minha-area");
  }

  markAppointmentPaid(appointmentId);
  convertLeadsForUser(user.id);
  redirect(returnTo);
}
