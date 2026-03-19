"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function CheckoutScrollFocus() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkoutId = searchParams.get("checkout");
    const payment = searchParams.get("payment");

    if (!checkoutId && !payment) {
      return;
    }

    const timer = window.setTimeout(() => {
      const appointmentCard = checkoutId
        ? document.querySelector<HTMLElement>(`[data-appointment-id="${checkoutId}"]`)
        : null;

      if (appointmentCard) {
        appointmentCard.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      const checkoutSection = document.getElementById("checkout");
      checkoutSection?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [searchParams]);

  return null;
}
