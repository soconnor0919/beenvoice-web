export type LineItemBillingType = "hourly" | "fixed";

export function isFixedLineItem(hours: number): boolean {
  return hours === 0;
}

export function getLineItemBillingType(hours: number): LineItemBillingType {
  return isFixedLineItem(hours) ? "fixed" : "hourly";
}

export function calculateLineItemAmount(hours: number, rate: number): number {
  return isFixedLineItem(hours) ? rate : hours * rate;
}

export function formatLineItemDetail(
  hours: number,
  rate: number,
  formatCurrency: (amount: number) => string,
): string {
  if (isFixedLineItem(hours)) {
    return "Fixed amount";
  }
  return `${hours}h @ ${formatCurrency(rate)}/hr`;
}

export function applyBillingTypeChange(
  billingType: LineItemBillingType,
  current: { hours: number; rate: number },
): { hours: number; rate: number; amount: number } {
  if (billingType === "fixed") {
    const amount = calculateLineItemAmount(current.hours, current.rate);
    return { hours: 0, rate: amount, amount };
  }

  const hours = current.hours > 0 ? current.hours : 1;
  const amount = calculateLineItemAmount(hours, current.rate);
  return { hours, rate: current.rate, amount };
}
