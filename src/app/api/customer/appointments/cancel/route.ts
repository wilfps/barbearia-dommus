import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth";
import { cancelAppointmentById, getAppointmentById } from "@/lib/db";

export async function POST(request: Request) {
  const user = await requireRoles(["CUSTOMER", "OWNER"]);
  const formData = await request.formData();
  const appointmentId = String(formData.get("appointmentId") || "");
  const returnTo = String(formData.get("returnTo") || "/cliente/minha-area#checkout");
  const appointment = getAppointmentById(appointmentId);

  if (!appointment || appointment.customer_id !== user.id) {
    redirect("/cliente/minha-area");
  }

  cancelAppointmentById(appointmentId);
  redirect(returnTo);
}
