import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAppointmentById, getSiteSetting, updateAppointmentCheckoutScope } from "@/lib/db";
import { getInfinitePayCheckoutConfig, createInfinitePayCheckoutLink } from "@/lib/integrations/infinitepay";

function appendPaymentStatus(url: string, status: string) {
  const target = new URL(url, "https://barbeariadommus.com.br");
  target.searchParams.set("payment", status);
  return `${target.pathname}${target.search}${target.hash}`;
}

function wantsJson(request: Request) {
  const accept = request.headers.get("accept") || "";
  const contentType = request.headers.get("content-type") || "";
  return accept.includes("application/json") || contentType.includes("application/json");
}

type PayPayload = {
  appointmentId: string;
  returnTo: string;
  paymentScope: "DEPOSIT" | "FULL";
};

async function parsePayload(request: Request): Promise<PayPayload> {
  if (request.headers.get("content-type")?.includes("application/json")) {
    const body = (await request.json()) as Partial<PayPayload>;
    return {
      appointmentId: String(body.appointmentId || ""),
      returnTo: String(body.returnTo || "/cliente/minha-area#protocolos"),
      paymentScope: body.paymentScope === "FULL" ? "FULL" : "DEPOSIT",
    };
  }

  const formData = await request.formData();
  return {
    appointmentId: String(formData.get("appointmentId") || ""),
    returnTo: String(formData.get("returnTo") || "/cliente/minha-area#protocolos"),
    paymentScope: String(formData.get("paymentScope") || "DEPOSIT") === "FULL" ? "FULL" : "DEPOSIT",
  };
}

function jsonError(message: string, status = 400) {
  return Response.json({ success: false, message }, { status });
}

export async function POST(request: Request) {
  const user = await requireUser();
  const useJson = wantsJson(request);
  const { appointmentId, returnTo, paymentScope } = await parsePayload(request);
  const appointment = getAppointmentById(appointmentId);

  if (!appointment || appointment.customer_id !== user.id) {
    if (useJson) {
      return jsonError("Reserva não encontrada.", 404);
    }

    redirect("/cliente/minha-area");
  }

  if (appointment.deposit_status === "PAID") {
    const successRedirect = appendPaymentStatus(returnTo, "success");

    if (useJson) {
      return Response.json({ success: true, redirectTo: successRedirect });
    }

    redirect(successRedirect);
  }

  const updatedAppointment = updateAppointmentCheckoutScope({
    appointmentId,
    customerId: user.id,
    paymentScope,
  });

  if (!updatedAppointment) {
    if (useJson) {
      return jsonError("Não conseguimos preparar esse pagamento agora.", 400);
    }

    redirect("/cliente/minha-area");
  }

  const site = getSiteSetting();
  const checkoutConfig = getInfinitePayCheckoutConfig(site);

  if (!checkoutConfig.handleConfigured) {
    const checkoutUnavailableRedirect = appendPaymentStatus(returnTo, "checkout-unavailable");

    if (useJson) {
      return jsonError("Checkout indisponível no momento.", 400);
    }

    redirect(checkoutUnavailableRedirect);
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
          price: updatedAppointment.checkout_amount_in_cents || updatedAppointment.deposit_in_cents,
          description:
            paymentScope === "FULL"
              ? `Pagamento da reserva - ${updatedAppointment.service_summary || "Reserva Dommus"}`
              : `Sinal da reserva - ${updatedAppointment.service_summary || "Reserva Dommus"}`,
        },
      ],
      orderNsu: updatedAppointment.protocol_code,
      redirectUrl,
      webhookUrl,
      customer: {
        name: user.name,
        email: user.email,
        phoneNumber: user.phone,
      },
    });

    if (useJson) {
      return Response.json({ success: true, checkoutUrl: checkout.checkoutUrl });
    }

    redirect(checkout.checkoutUrl);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("InfinitePay checkout error:", error);

    if (useJson) {
      return jsonError("Não conseguimos abrir o pagamento agora.", 500);
    }

    redirect(appendPaymentStatus(returnTo, "checkout-error"));
  }
}
