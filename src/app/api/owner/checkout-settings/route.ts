import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth";
import { updateCheckoutSettings } from "@/lib/db";

export async function POST(request: Request) {
  await requireRoles(["OWNER"]);
  const formData = await request.formData();

  updateCheckoutSettings({
    provider: String(formData.get("provider") || "infinitepay"),
    handle: String(formData.get("handle") || "").trim(),
    redirectUrl: String(formData.get("redirectUrl") || "").trim(),
    webhookUrl: String(formData.get("webhookUrl") || "").trim(),
  });

  redirect("/owner");
}
