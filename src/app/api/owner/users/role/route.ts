import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth";
import { updateUserRoleAndStatus } from "@/lib/db";

export async function POST(request: Request) {
  await requireRoles(["OWNER"]);
  const formData = await request.formData();
  const userId = String(formData.get("userId") || "");
  const role = String(formData.get("role") || "CUSTOMER");
  const isActive = String(formData.get("isActive") || "true") === "true";

  if (!userId) {
    redirect("/owner");
  }

  updateUserRoleAndStatus({ userId, role, isActive });
  redirect("/owner");
}
