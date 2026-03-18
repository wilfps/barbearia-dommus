import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";
import { createUser, getSiteSetting, getUserByEmail } from "@/lib/db";
import { formatPhone, parseBrazilianDate } from "@/lib/format";

export async function POST(request: Request) {
  const formData = await request.formData();
  const name = String(formData.get("name") || "");
  const email = String(formData.get("email") || "").toLowerCase();
  const phone = formatPhone(String(formData.get("phone") || ""));
  const birthDate = parseBrazilianDate(String(formData.get("birthDate") || ""));
  const password = String(formData.get("password") || "");

  if (!getSiteSetting().is_open || !name || !email || !phone || !birthDate || !password || getUserByEmail(email)) {
    redirect("/");
  }

  const user = createUser({
    name,
    email,
    phone,
    birthDate,
    passwordHash: await bcrypt.hash(password, 10),
    role: "CUSTOMER",
  });

  await createSession({ sub: user.id, role: user.role, email: user.email, name: user.name });
  redirect("/cliente");
}
