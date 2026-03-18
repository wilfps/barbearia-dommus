import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getUserByEmail, updateUserPasswordByEmail } from "@/lib/db";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "").toLowerCase().trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect("/reset-password");
  }

  const user = getUserByEmail(email);
  if (!user) {
    redirect("/reset-password");
  }

  updateUserPasswordByEmail({
    email,
    passwordHash: await bcrypt.hash(password, 10),
  });

  redirect("/?reset=1");
}
