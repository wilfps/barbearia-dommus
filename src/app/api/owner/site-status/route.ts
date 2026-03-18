import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth";
import { updateSiteSetting } from "@/lib/db";

export async function POST(request: Request) {
  await requireRoles(["OWNER"]);
  const formData = await request.formData();
  const isOpen = String(formData.get("isOpen") || "") === "true";
  const maintenanceMessage = String(formData.get("maintenanceMessage") || "");

  updateSiteSetting(isOpen, maintenanceMessage);
  redirect("/owner");
}
