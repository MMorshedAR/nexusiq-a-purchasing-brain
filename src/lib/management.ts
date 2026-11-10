function decimalToCents(value: number | string): number {
  const text = String(value).trim();
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) throw new Error("Enter an amount with no more than two decimal places.");
  const cents = Number(match[2]) * 100 + Number((match[3] ?? "").padEnd(2, "0"));
  return match[1] === "-" ? -cents : cents;
}

export function calculateNetSalaryCents(
  basic: number | string,
  allowances: number | string,
  bonuses: number | string,
  deductions: number | string,
): number {
  const amounts = [basic, allowances, bonuses, deductions].map(decimalToCents);
  if (amounts.some((amount) => amount < 0)) throw new Error("Salary amounts cannot be negative.");
  return amounts[0] + amounts[1] + amounts[2] - amounts[3];
}

export function formatSalaryCents(cents: number, currency = "BDT"): string {
  return new Intl.NumberFormat("en-BD", {
    style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function salaryPeriodForMonth(value: string): string {
  if (!/^\d{4}-\d{2}$/.test(value)) throw new Error("Choose a valid salary month.");
  return `${value}-01`;
}