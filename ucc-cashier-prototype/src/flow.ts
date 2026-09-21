export type Step = 0 | 1 | 2 | 3;
export type Outcome = "success" | "declined" | "pending";
export type Offer = {
  code: string;
  title: string;
  minimum: number;
  description: string;
  terms: string;
};
export const offers: Offer[] = [
  {
    code: "KICKSTARTER",
    title: "450% NO RULES BONUS",
    minimum: 30,
    description: "450% no rules deposit bonus.",
    terms:
      "Minimum deposit $30. Up to 75 spins on 777. Maximum cashout is 15 times the deposit. No playthrough requirement. Slots and Keno only. Up to four redemptions.",
  },
  {
    code: "BIGWIN420",
    title: "420% NO RULES BONUS",
    minimum: 99,
    description: "420% no rules deposit bonus.",
    terms:
      "Minimum deposit $99. Bonus and winnings are subject to the displayed offer conditions. Slots and Keno only. Synthetic terms for prototype review.",
  },
];
export const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );
export type Flow = {
  step: Step;
  reached: Step;
  method: "new" | "saved";
  bonus: string | null | undefined;
  amount: string;
};
export const initialFlow = (): Flow => ({
  step: 0,
  reached: 0,
  method: "new",
  bonus: undefined,
  amount: "50",
});
export type Action =
  | { type: "navigate"; step: Step }
  | { type: "advance" }
  | { type: "method"; method: Flow["method"] }
  | { type: "bonus"; code: string | null }
  | { type: "amount"; value: string }
  | { type: "reset"; saved: boolean };
export function reducer(s: Flow, a: Action): Flow {
  switch (a.type) {
    case "navigate":
      return a.step <= s.reached ? { ...s, step: a.step } : s;
    case "advance": {
      const step = Math.min(s.step + 1, 3) as Step;
      return { ...s, step, reached: Math.max(s.reached, step) as Step };
    }
    case "method":
      return { ...s, method: a.method };
    case "bonus":
      return { ...s, bonus: a.code };
    case "amount":
      return { ...s, amount: a.value };
    case "reset":
      return { ...initialFlow(), method: a.saved ? "saved" : "new" };
  }
}
export function amountError(value: string, bonus: Flow["bonus"]) {
  const min = Math.max(10, offers.find((o) => o.code === bonus)?.minimum ?? 0);
  if (!/^\d+(\.\d{1,2})?$/.test(value) || !Number.isFinite(Number(value)))
    return "Enter a valid amount with up to two decimal places.";
  if (Number(value) < min)
    return `Minimum deposit ${money(min)}${bonus ? ` with ${bonus}` : ""}.`;
  if (Number(value) > 2000) return "Maximum deposit is $2,000.00.";
  return "";
}
export type Card = {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
};
export const emptyCard = (): Card => ({
  number: "",
  expiry: "",
  cvv: "",
  name: "",
});
export function cardErrors(card: Card, saved: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  // Only deterministic synthetic values are accepted. No processor or logging.
  if (!saved) {
    if (card.number.replace(/\s/g, "") !== "4242424242424242")
      errors.number = "Use the demo card 4242 4242 4242 4242.";
    if (card.expiry !== "12/30") errors.expiry = "Use the demo expiry 12/30.";
  }
  if (!saved && card.cvv !== "123")
    errors.cvv = "Use the demo security code 123.";
  return errors;
}
export type Address = {
  line: string;
  city: string;
  region: string;
  zip: string;
  country: string;
};
export const initialAddress = (): Address => ({
  line: "Goamer 23",
  city: "Miami",
  region: "Florida",
  zip: "12000",
  country: "United States",
});
export function simulatePayment(outcome: Outcome): Promise<Outcome> {
  return new Promise((resolve) => setTimeout(() => resolve(outcome), 850));
}
