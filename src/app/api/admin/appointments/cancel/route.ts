import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth";
import { cancelAppointmentById } from "@/lib/db";

export async function POST(request: Request) {
  await requireRoles(["ADMIN", "BARBER", "OWNER"]);
  const formData = await request.formData();
  const appointmentId = String(formData.get("appointmentId") || "");

  if (!appointmentId) {
    redirect("/admin");
  }

  cancelAppointmentById(appointmentId);
  redirect("/admin");
}
