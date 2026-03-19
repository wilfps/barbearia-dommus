import { NextResponse } from "next/server";
import { convertLeadsForUser, getAppointmentByProtocolCode, markAppointmentPaid } from "@/lib/db";

type InfinitePayWebhookPayload = {
  order_nsu?: string;
  transaction_nsu?: string;
  capture_method?: string;
  paid_amount?: number;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as InfinitePayWebhookPayload | null;
  const protocolCode = payload?.order_nsu?.trim();

  if (!protocolCode) {
    return NextResponse.json({ success: false, message: "order_nsu não informado." }, { status: 400 });
  }

  const appointment = getAppointmentByProtocolCode(protocolCode);
  if (!appointment) {
    return NextResponse.json({ success: false, message: "Agendamento não encontrado." }, { status: 404 });
  }

  const updated = markAppointmentPaid(appointment.id);
  if (updated && appointment.customer_id) {
    convertLeadsForUser(appointment.customer_id);
  }

  return NextResponse.json({
    success: true,
    updated,
    protocolCode,
    transactionNsu: payload?.transaction_nsu || null,
    captureMethod: payload?.capture_method || null,
    paidAmount: payload?.paid_amount || null,
  });
}
