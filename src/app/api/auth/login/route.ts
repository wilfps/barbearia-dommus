import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";
import { getSiteSetting, getUserByEmail } from "@/lib/db";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "").toLowerCase();
  const password = String(formData.get("password") || "");

  const site = getSiteSetting();
  const user = getUserByEmail(email);

  if (!user || !user.is_active || (!site.is_open && user.role !== "OWNER")) {
    redirect("/");
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    redirect("/");
  }

  await createSession({ sub: user.id, role: user.role, email: user.email, name: user.name });
  redirect("/dashboard");
}
