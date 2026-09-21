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
    code: "SPINFEVER",
    title: "150% bonus + 30 free spins",
    minimum: 30,
    description: "A little extra for your next session.",
    terms:
      "150% match up to $300. 30 spins on Midnight Reels. Bonus and winnings carry a 30× playthrough requirement. Available once per account; expires after 7 days. Synthetic terms for prototype review.",
  },
  {
    code: "BANDITS400",
    title: "400% deposit bonus",
    minimum: 89,
    description: "Make more of your next deposit.",
    terms:
      "400% match up to $800. Bonus and winnings carry a 40× playthrough requirement. Available once per account; expires after 7 days. Synthetic terms for prototype review.",
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
    if (!card.name.trim()) errors.name = "Enter a name for this demo card.";
  }
  if (card.cvv !== "123") errors.cvv = "Use the demo security code 123.";
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
  line: "120 Example Street",
  city: "Austin",
  region: "TX",
  zip: "78701",
  country: "United States",
});
export function simulatePayment(outcome: Outcome): Promise<Outcome> {
  return new Promise((resolve) => setTimeout(() => resolve(outcome), 850));
}
