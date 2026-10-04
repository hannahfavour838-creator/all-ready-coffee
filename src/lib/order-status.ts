import type { OrderStatus } from "@/lib/db/schema";

export const STATUS_FLOW: OrderStatus[] = ["placed", "confirmed", "preparing", "ready", "out_for_delivery", "delivered"];

export const STATUS_META: Record<OrderStatus, { label: string; short: string; customer: string; tone: "neutral" | "active" | "success" | "danger" }> = {
  placed: { label: "Order placed", short: "Placed", customer: "We've received your order and sent it to the bar.", tone: "neutral" },
  confirmed: { label: "Order confirmed", short: "Confirmed", customer: "The café accepted your order. Your barista is up next.", tone: "active" },
  preparing: { label: "Preparing", short: "Preparing", customer: "Your drinks are being pulled and steamed by hand.", tone: "active" },
  ready: { label: "Ready", short: "Ready", customer: "Sealed, labeled and waiting for your courier.", tone: "active" },
  out_for_delivery: { label: "Out for delivery", short: "On the way", customer: "Your courier has your order and is heading to you.", tone: "active" },
  delivered: { label: "Delivered", short: "Delivered", customer: "Delivered. Enjoy every sip.", tone: "success" },
  rejected: { label: "Declined", short: "Declined", customer: "The café couldn't take this order. No payment was captured.", tone: "danger" },
  cancelled: { label: "Cancelled", short: "Cancelled", customer: "This order was cancelled. No payment was captured.", tone: "danger" },
};

/** Allowed transitions for the admin workflow (server-enforced). */
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  placed: ["confirmed", "rejected"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered"],
  delivered: [],
  rejected: [],
  cancelled: [],
};

export const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  confirmed: "Accept order",
  rejected: "Reject",
  preparing: "Start preparing",
  ready: "Mark ready",
  out_for_delivery: "Out for delivery",
  delivered: "Mark delivered",
  cancelled: "Cancel order",
};

export function canTransition(from: OrderStatus, to: OrderStatus) {
  return TRANSITIONS[from].includes(to);
}

export function isActive(status: OrderStatus) {
  return !["delivered", "rejected", "cancelled"].includes(status);
}

export function stepIndex(status: OrderStatus) {
  return STATUS_FLOW.indexOf(status);
}

export const NOTIFICATION_COPY: Partial<Record<OrderStatus, { title: string; body: (n: string) => string }>> = {
  confirmed: { title: "Order accepted", body: (n) => `Order ${n} was accepted — your barista is getting started.` },
  preparing: { title: "Your order is being prepared", body: (n) => `Order ${n} is on the bar right now.` },
  ready: { title: "Your order is ready", body: (n) => `Order ${n} is sealed and waiting for the courier.` },
  out_for_delivery: { title: "Your order is on its way", body: (n) => `Order ${n} left the café and is heading to you.` },
  delivered: { title: "Delivered — enjoy", body: (n) => `Order ${n} was delivered. Thank you for choosing All Ready.` },
  rejected: { title: "We couldn't accept your order", body: (n) => `Order ${n} was declined. No payment was captured.` },
  cancelled: { title: "Order cancelled", body: (n) => `Order ${n} was cancelled. No payment was captured.` },
};
