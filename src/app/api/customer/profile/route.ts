import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import convert from "heic-convert";
import { redirect } from "next/navigation";
import { requireRoles } from "@/lib/auth";
import { updateUserProfile } from "@/lib/db";
import { parseBrazilianDate } from "@/lib/format";

function getExtension(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  return ext || ".jpg";
}

function isHeicFile(file: File) {
  const extension = getExtension(file.name);
  return file.type === "image/heic" || file.type === "image/heif" || extension === ".heic" || extension === ".heif";
}

export async function POST(request: Request) {
  const user = await requireRoles(["CUSTOMER", "OWNER"]);
  const formData = await request.formData();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const rawBirthDate = String(formData.get("birthDate") || "").trim();
  const birthDate = rawBirthDate ? parseBrazilianDate(rawBirthDate) : null;
  const photo = formData.get("photo");

  let avatarPath: string | null | undefined = undefined;

  if (photo instanceof File && photo.size > 0) {
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "profiles");
    await fs.mkdir(uploadsDir, { recursive: true });

    const originalBuffer = Buffer.from(await photo.arrayBuffer());
    const shouldConvertHeic = isHeicFile(photo);
    const extension = shouldConvertHeic ? ".jpg" : getExtension(photo.name);
    const fileName = `profile-${user.id}-${crypto.randomUUID().slice(0, 8)}${extension}`;
    const filePath = path.join(uploadsDir, fileName);
    const buffer = shouldConvertHeic
      ? Buffer.from(
          new Uint8Array(
            await convert({
              buffer: originalBuffer,
              format: "JPEG",
              quality: 0.9,
            }),
          ),
        )
      : originalBuffer;

    await fs.writeFile(filePath, buffer);
    avatarPath = `/uploads/profiles/${fileName}`;
  }

  if (!email || !phone || (rawBirthDate && !birthDate)) {
    redirect("/cliente/minha-area");
  }

  updateUserProfile({
    userId: user.id,
    email,
    phone,
    birthDate,
    avatarPath,
  });

  redirect("/cliente/minha-area");
}
