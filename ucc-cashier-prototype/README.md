# UCC Cashier Prototype

Standalone React + TypeScript + Vite prototype for the UCC deposit cashier. It uses deterministic synthetic account data and a simulated payment service; no card or CVV values are persisted or sent anywhere.

## Run

```bash
npm install
npm run dev
npm run build
npm test
```

The browser suite covers desktop and 360px, 390px, and 430px mobile layouts.

## Review scenarios

- Deposit → new card → SPINFEVER → custom amount → edit address → fill demo details → success.
- Deposit → coupon code `BANDITS400` → active coupon terms → cancel/keep/remove → no-bonus path → amount validation.
- Prototype controls → Saved Visa → declined or pending payment → retry.
- Prototype controls → edit presets and selected amount → reset scenario.
- Claim offer opens the cashier with SPINFEVER retained; closing preserves non-sensitive draft selections and clears card-entry values.

Demo card: `4242 4242 4242 4242`, expiry `12/30`, CVV `123`.

## Assumptions and remaining scope

- Card details are entered at Payment Details, following the supplied current-cashier screenshots; method selection happens in Payment Method.
- The milestone supports card, saved Visa, bonus/coupon, no bonus, transactions, and simulated success/decline/pending states. Crypto, Apple Pay, Google Pay, Cash App, provider handoffs, withdrawals, and full coupon-history flows remain outside this milestone.
- Promotional entry is modeled by the Claim offer action and retains the synthetic SPINFEVER offer. The referenced source URL and exact eligibility rules were not available for verification.
- Later mobile stages are responsive adaptations of the supplied desktop states; the supplied mobile reference showed Payment Method only.
- Final cosmetic styling, production payment integration, account persistence, and real offer rules remain design/product follow-up scope.
