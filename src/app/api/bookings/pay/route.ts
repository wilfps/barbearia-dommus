import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAppointmentById, getSiteSetting } from "@/lib/db";
import { getInfinitePayCheckoutConfig, createInfinitePayCheckoutLink } from "@/lib/integrations/infinitepay";

function appendPaymentStatus(url: string, status: string) {
  const target = new URL(url, "https://barbeariadommus.com.br");
  target.searchParams.set("payment", status);
  return `${target.pathname}${target.search}${target.hash}`;
}

export async function POST(request: Request) {
  const user = await requireUser();
  const formData = await request.formData();
  const appointmentId = String(formData.get("appointmentId") || "");
  const returnTo = String(formData.get("returnTo") || "/cliente/minha-area#protocolos");
  const appointment = getAppointmentById(appointmentId);

  if (!appointment || appointment.customer_id !== user.id) {
    redirect("/cliente/minha-area");
  }

  if (appointment.deposit_status === "PAID") {
    redirect(appendPaymentStatus(returnTo, "success"));
  }

  const site = getSiteSetting();
  const checkoutConfig = getInfinitePayCheckoutConfig(site);

  if (!checkoutConfig.handleConfigured) {
    redirect(appendPaymentStatus(returnTo, "checkout-unavailable"));
  }

  const origin = new URL(request.url).origin;
  const redirectUrl = checkoutConfig.redirectUrl || `${origin}/cliente/minha-area`;
  const webhookUrl = checkoutConfig.webhookUrl || `${origin}/api/payments/infinitepay/webhook`;

  try {
    const checkout = await createInfinitePayCheckoutLink({
      handle: checkoutConfig.handle,
      items: [
        {
          quantity: 1,
          price: appointment.deposit_in_cents,
          description: `Sinal da reserva - ${appointment.service_summary || "Reserva Dommus"}`,
        },
      ],
      orderNsu: appointment.protocol_code,
      redirectUrl,
      webhookUrl,
      customer: {
        name: user.name,
        email: user.email,
        phoneNumber: user.phone,
      },
    });

    redirect(checkout.checkoutUrl);
  } catch {
    redirect(appendPaymentStatus(returnTo, "checkout-error"));
  }
}
