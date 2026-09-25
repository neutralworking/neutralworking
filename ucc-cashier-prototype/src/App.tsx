import { useEffect, useReducer, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bitcoin,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Gift,
  Home,
  Inbox,
  Layers,
  LockKeyhole,
  Menu,
  Search,
  Settings2,
  ShieldCheck,
  TicketCheck,
  Trophy,
  User,
  Wallet,
  X,
} from "lucide-react";
import {
  amountError,
  cardErrors,
  emptyCard,
  initialAddress,
  initialFlow,
  money,
  offers,
  reducer,
  simulatePayment,
} from "./flow";
import type { Address, Card, Outcome, Step } from "./flow";

const steps = ["Payment Method", "Bonus", "Amount", "Review & Deposit"];
const games = [
  ["Tiger Tumble", "Playnetic"],
  ["Zhulong's Treasure", "Playnetic"],
  ["Bonus Mania Plinko", "KA Gaming"],
  ["Gold Rush Ultrahold", "Red Eagle"],
  ["Golden Bull", "KA Gaming"],
  ["Little Lord Rich", "Playnetic"],
  ["Big Bounty Bandits", "Peter And Sons"],
  ["Moon Of RA", "Fugaso"],
] as const;
const paymentMethods = [
  { id: "applepay", mark: "●", name: "Apple Pay", detail: "Pay with Apple Pay" },
  { id: "googlepay", mark: "G", name: "Google Pay", detail: "Pay with Google Pay" },
  { id: "neosurf", mark: "N", name: "Neosurf", detail: "Pay with Neosurf" },
  { id: "bitcoin", mark: "₿", name: "Bitcoin (BTC)", detail: "Pay with Bitcoin" },
  { id: "litecoin", mark: "Ł", name: "Litecoin (LTC)", detail: "Pay with Litecoin" },
  { id: "ethereum", mark: "◆", name: "Ethereum (ETH)", detail: "Pay with Ethereum" },
  { id: "cashlib", mark: "$", name: "Cashlib", detail: "Pay with Cashlib" },
  { id: "changelly", mark: "↗", name: "Changelly", detail: "Buy crypto by card" },
] as const;
const withdrawalMethods = [
  {
    id: "wire",
    name: "Wire Transfer",
    detail: "$100 – $2,500 per transaction",
    minimum: 100,
    Icon: Building2,
  },
  {
    id: "check",
    name: "Check",
    detail: "$100 – $2,500 per transaction",
    minimum: 100,
    Icon: TicketCheck,
  },
  {
    id: "bitcoin",
    name: "Bitcoin",
    detail: "$50 – $2,500 per transaction",
    minimum: 50,
    Icon: Bitcoin,
  },
] as const;
const cryptoAssets = [
  { id: "bitcoin", mark: "₿", name: "Bitcoin", ticker: "BTC", network: "Bitcoin", rate: 85869, destination: "bc1qetshauz3knuexv5g6nmc9p6xt7lu9p52lhq654" },
  { id: "litecoin", mark: "Ł", name: "Litecoin", ticker: "LTC", network: "Litecoin", rate: 86, destination: "ltc1qdemo7cashier4prototype5x2n9" },
  { id: "lightning", mark: "ϟ", name: "BTC Lightning", ticker: "BTC", network: "Bitcoin Lightning", rate: 85869, destination: "lnbc50000n1demo7cashier4prototype" },
  { id: "dogecoin", mark: "Ð", name: "Dogecoin", ticker: "DOGE", network: "Dogecoin", rate: 0.1, destination: "DDemo7Cashier4Prototype9x2n5" },
  { id: "ethereum", mark: "◆", name: "Ethereum", ticker: "ETH", network: "Ethereum", rate: 2400, destination: "0xDEMO84a19f03CASHIER72B6e91" },
  { id: "usdc", mark: "$", name: "USD Coin", ticker: "USDC", network: "Ethereum (ERC-20)", rate: 1, destination: "0xUSDC84a19f03CASHIER72B6e91" },
  { id: "tether", mark: "₮", name: "Tether", ticker: "USDT", network: "Ethereum (ERC-20)", rate: 1, destination: "0xUSDT84a19f03CASHIER72B6e91" },
] as const;
type CryptoAssetId = (typeof cryptoAssets)[number]["id"];
type AccountCurrency = "USD" | "AUD";
type WithdrawalScenario = "available" | "empty";
function Button({
  children,
  onClick,
  primary = false,
  disabled = false,
  ...props
}: {
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
  [key: string]: unknown;
}) {
  return (
    <button
      className={primary ? "button primary" : "button"}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
function Field({
  label,
  error,
  ...props
}: {
  label: string;
  error?: string;
  [key: string]: unknown;
}) {
  const id = label.toLowerCase().replace(/\W/g, "-");
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <span className="error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </label>
  );
}

function CardBrands() {
  return (
    <span
      className="card-brands"
      aria-label="Visa, Mastercard, American Express and Discover accepted"
    >
      <b>VISA</b>
      <b className="mastercard-mark"><i /><i /></b>
      <b>AMEX</b>
      <b>DISCOVER</b>
    </span>
  );
}

function TrustPanel() {
  return (
    <aside className="cashier-trust" aria-label="Payment security">
      <ShieldCheck size={34} />
      <div>
        <strong>Secure &amp; encrypted</strong>
        <p>Your information is safe with 256-bit SSL encryption.</p>
      </div>
    </aside>
  );
}

export default function App() {
  const [flow, dispatch] = useReducer(reducer, undefined, initialFlow);
  const [open, setOpen] = useState(true),
    [saved, setSaved] = useState(true),
    [balance, setBalance] = useState(24.5),
    [saveCard, setSaveCard] = useState(false);
  const [card, setCard] = useState<Card>(emptyCard),
    [errors, setErrors] = useState<Record<string, string>>({});
  const [address, setAddress] = useState<Address>(initialAddress),
    [draftAddress, setDraftAddress] = useState<Address>(initialAddress),
    [editingAddress, setEditingAddress] = useState(false);
  const [presets, setPresets] = useState([20, 30, 50]),
    [presetText, setPresetText] = useState("20, 30, 50"),
    [debugError, setDebugError] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("success"),
    [result, setResult] = useState<Outcome | null>(null),
    [processing, setProcessing] = useState(false);
  const [debug, setDebug] = useState(false),
    [couponOpen, setCouponOpen] = useState(false),
    [coupon, setCoupon] = useState(""),
    [couponError, setCouponError] = useState("");
  const [terms, setTerms] = useState<string | null>(null),
    [cancelCoupon, setCancelCoupon] = useState(false),
    [activeContinueInView, setActiveContinueInView] = useState(false),
    [amountTouched, setAmountTouched] = useState(false);
  const [section, setSection] = useState("Deposit"),
    [hostPage, setHostPage] = useState("Lobby"),
    [menu, setMenu] = useState(false),
    [search, setSearch] = useState(""),
    [uccColour, setUccColour] = useState(false);
  const [withdrawalScenario, setWithdrawalScenario] =
      useState<WithdrawalScenario>("empty"),
    [withdrawalMethod, setWithdrawalMethod] = useState(""),
    [withdrawalAmount, setWithdrawalAmount] = useState("100"),
    [withdrawalSubmitted, setWithdrawalSubmitted] = useState(false);
  const [transactionFrom, setTransactionFrom] = useState("2026-09-15"),
    [transactionTo, setTransactionTo] = useState("2026-09-22"),
    [transactionSearchRun, setTransactionSearchRun] = useState(true);
  const [paymentChoice, setPaymentChoice] = useState("card"),
    [currency, setCurrency] = useState<AccountCurrency>("USD"),
    [cardEligible, setCardEligible] = useState(true),
    [providerWindow, setProviderWindow] = useState<string | null>(null);
  const [cryptoAsset, setCryptoAsset] = useState<CryptoAssetId>("bitcoin"),
    [cryptoStage, setCryptoStage] = useState<"select" | "details">("select"),
    [cryptoCopied, setCryptoCopied] = useState(false);
  const [receipt, setReceipt] = useState<{
    amount: number;
    bonus: string | null;
  } | null>(null);
  const [transactions, setTransactions] = useState<
    { amount: number; status: Outcome; id: number }[]
  >([]);
  const dialog = useRef<HTMLDialogElement>(null),
    entry = useRef<HTMLElement | null>(null),
    activeContinueRef = useRef<HTMLButtonElement>(null),
    paymentLock = useRef(false),
    providerWindowRef = useRef<string | null>(null),
    run = useRef(0);
  const offer = offers.find((o) => o.code === flow.bonus),
    amountIssue = amountError(flow.amount, flow.bonus);
  const changeCard = (key: keyof Card, value: string) => {
    setCard((c) => ({ ...c, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };
  function reset(nextSaved = saved) {
    run.current++;
    paymentLock.current = false;
    setProcessing(false);
    dispatch({ type: "reset", saved: nextSaved });
    setCard(emptyCard());
    setErrors({});
    setAddress(initialAddress());
    setDraftAddress(initialAddress());
    setEditingAddress(false);
    setResult(null);
    setBalance(24.5);
    setTransactions([]);
    setReceipt(null);
    setPresets([20, 30, 50]);
    setPresetText("20, 30, 50");
    setOutcome("success");
    setCoupon("");
    setCouponOpen(false);
    setCouponError("");
    setTerms(null);
    setCancelCoupon(false);
    setAmountTouched(false);
    setDebugError("");
    setSection("Deposit");
    setPaymentChoice("card");
    setSaveCard(false);
    setProviderWindow(null);
    setCurrency("USD");
    setCardEligible(true);
    setCryptoAsset("bitcoin");
    setCryptoStage("select");
    setCryptoCopied(false);
    setWithdrawalScenario("empty");
    setWithdrawalMethod("");
    setWithdrawalAmount("100");
    setWithdrawalSubmitted(false);
    setTransactionFrom("2026-09-15");
    setTransactionTo("2026-09-22");
    setTransactionSearchRun(true);
  }
  function launch(code?: string) {
    entry.current = document.activeElement as HTMLElement;
    setSection("Deposit");
    if (code) {
      dispatch({ type: "bonus", code });
      dispatch({ type: "navigate", step: 0 });
      setResult(null);
    }
    setOpen(true);
  }
  function close() {
    if (paymentLock.current) return;
    if (providerWindowRef.current) {
      setProviderWindow(null);
      return;
    }
    setOpen(false);
    setCard(emptyCard());
    setSaveCard(false);
    setErrors({});
    setEditingAddress(false);
    setDebug(false);
    if (paymentChoice === "card" && flow.method === "new") {
      dispatch({ type: "navigate", step: 0 });
    }
  }
  useEffect(() => {
    providerWindowRef.current = providerWindow;
  }, [providerWindow]);
  useEffect(() => {
    if (!open) return;
    const el = dialog.current!;
    el.show();
    const old = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close();
    };
    window.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    const focusFrame = requestAnimationFrame(() => {
      dialog.current
        ?.querySelector<HTMLElement>("#cashier-title")
        ?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleEscape);
      el.close();
      document.body.style.overflow = old;
      entry.current?.focus();
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const heading = dialog.current?.querySelector<HTMLElement>(
      "[data-active-heading]",
    );
    heading?.focus();
    heading?.scrollIntoView({ block: "nearest" });
  }, [flow.step, section, result]);
  useEffect(() => {
    if (!open || flow.step !== 1 || !offer || cancelCoupon) {
      setActiveContinueInView(false);
      return;
    }
    setActiveContinueInView(false);
    let observer: IntersectionObserver | undefined;
    const frame = requestAnimationFrame(() => {
      const target = activeContinueRef.current;
      const root = dialog.current?.querySelector(".cashier-content");
      if (!target || !root) return;
      observer = new IntersectionObserver(
        ([entry]) => setActiveContinueInView(entry.intersectionRatio >= 0.9),
        { root, threshold: [0, 0.9, 1] },
      );
      observer.observe(target);
    });
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [open, flow.step, offer, cancelCoupon]);
  function go(step: Step) {
    dispatch({ type: "navigate", step });
    setErrors({});
    setTerms(null);
    setCancelCoupon(false);
  }
  function applyCoupon() {
    const code = coupon.trim().toUpperCase();
    const found = offers.find((o) => o.code === code);
    if (!found) {
      setCouponError(
        code
          ? "This coupon is not available. Try KICKSTARTER or BIGWIN420."
          : "Enter a coupon code.",
      );
      return;
    }
    dispatch({ type: "bonus", code: found.code });
    setCouponError("");
    setCouponOpen(false);
    if (section === "Coupons") {
      setResult(null);
      setSection("Deposit");
      go(flow.reached >= 1 ? 1 : 0);
    }
  }
  async function pay() {
    if (paymentLock.current) return;
    const issues =
      paymentChoice === "card"
        ? cardErrors(card, flow.method === "saved")
        : {};
    if (amountIssue) {
      go(2);
      setAmountTouched(true);
      return;
    }
    if (flow.bonus === undefined) {
      go(1);
      return;
    }
    if (editingAddress) {
      setErrors({
        address: "Save or cancel your address changes before depositing.",
      });
      return;
    }
    setErrors(issues);
    if (Object.keys(issues).length) return;
    paymentLock.current = true;
    setProcessing(true);
    const current = ++run.current;
    const paidAmount = Number(flow.amount);
    const status = await simulatePayment(outcome);
    if (current !== run.current) return;
    setTransactions((t) => [
      ...t,
      { amount: paidAmount, status, id: t.length + 1 },
    ]);
    if (status === "success")
      setBalance((b) => Math.round((b + paidAmount) * 100) / 100);
    if (
      status === "success" &&
      paymentChoice === "card" &&
      flow.method === "new" &&
      saveCard
    )
      setSaved(true);
    setCard(emptyCard());
    setReceipt({ amount: paidAmount, bonus: flow.bonus ?? null });
    setResult(status);
    setProcessing(false);
    paymentLock.current = false;
  }
  const summary = [
    paymentChoice === "card"
      ? flow.method === "saved"
        ? "Visa •••• 5602"
        : "Cards"
      : paymentMethods.find((method) => method.id === paymentChoice)?.name ??
        "Payment method",
    flow.bonus === undefined
      ? "Choose an offer"
      : (flow.bonus ?? "Without a bonus"),
    amountIssue ? "Amount needs attention" : money(Number(flow.amount)),
    "Review & deposit",
  ];
  const withdrawableBalance = withdrawalScenario === "available" ? 500 : 0;
  const selectedWithdrawal = withdrawalMethods.find(
    (method) => method.id === withdrawalMethod,
  );
  const withdrawalValue = Number(withdrawalAmount);
  const withdrawalIssue = selectedWithdrawal
    ? withdrawalValue < selectedWithdrawal.minimum
      ? `Minimum withdrawal is ${money(selectedWithdrawal.minimum)}.`
      : withdrawalValue > Math.min(2500, withdrawableBalance)
        ? `Enter no more than ${money(Math.min(2500, withdrawableBalance))}.`
        : ""
    : "Choose a withdrawal method.";
  const isCryptoPayment = ["bitcoin", "litecoin", "ethereum"].includes(
    paymentChoice,
  );
  const selectedCrypto = cryptoAssets.find((asset) => asset.id === cryptoAsset)!;
  const selectedProvider = paymentMethods.find(
    (method) => method.id === providerWindow,
  );
  const quotedCryptoAmount =
    selectedCrypto.rate === 1
      ? Number(flow.amount || 0).toFixed(2)
      : (Number(flow.amount || 0) / selectedCrypto.rate).toFixed(8);
  const debugPanel = (
    <div className="review-controls">
      <button
        className="review-toggle"
        aria-expanded={debug}
        onClick={() => setDebug(!debug)}
      >
        <Settings2 size={16} />
        <span>Prototype controls</span>
        <ChevronDown size={14} />
      </button>
      {debug && (
        <div className="review-panel">
          <div className="row">
            <strong>Review scenarios</strong>
            <button
              className="icon-button"
              aria-label="Close prototype controls"
              onClick={() => setDebug(false)}
            >
              <X size={16} />
            </button>
          </div>
          <fieldset disabled={processing}>
            <label className="field">
              Card scenario
              <select
                aria-label="Card scenario"
                value={saved ? "saved" : "new"}
                onChange={(e) => {
                  const value = e.target.value === "saved";
                  setSaved(value);
                  dispatch({ type: "method", method: value ? "saved" : "new" });
                  setPaymentChoice(cardEligible ? "card" : "applepay");
                  setCard(emptyCard());
                  setSaveCard(false);
                  setErrors({});
                }}
              >
                <option value="new">New card</option>
                <option value="saved">Saved Visa</option>
              </select>
            </label>
            <label className="field">
              Account currency
              <select
                aria-label="Account currency"
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value as AccountCurrency);
                  if (e.target.value === "USD" && paymentChoice === "neosurf")
                    setPaymentChoice(cardEligible ? "card" : "applepay");
                }}
              >
                <option value="USD">USD</option>
                <option value="AUD">AUD</option>
              </select>
            </label>
            <label className="field">
              Credit card eligibility
              <select
                aria-label="Credit card eligibility"
                value={cardEligible ? "eligible" : "ineligible"}
                onChange={(e) => {
                  const eligible = e.target.value === "eligible";
                  setCardEligible(eligible);
                  if (!eligible && paymentChoice === "card")
                    setPaymentChoice("applepay");
                }}
              >
                <option value="eligible">Eligible</option>
                <option value="ineligible">Ineligible</option>
              </select>
            </label>
            <label className="field">
              Withdrawal scenario
              <select
                aria-label="Withdrawal scenario"
                value={withdrawalScenario}
                onChange={(e) => {
                  setWithdrawalScenario(e.target.value as WithdrawalScenario);
                  setWithdrawalMethod("");
                  setWithdrawalAmount("100");
                  setWithdrawalSubmitted(false);
                }}
              >
                <option value="empty">No withdrawable balance</option>
                <option value="available">Withdrawable balance</option>
              </select>
            </label>
            <Field
              label="Amount presets"
              value={presetText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPresetText(e.target.value)
              }
            />
            <Button
              onClick={() => {
                const vals = presetText.split(",").map((v) => Number(v.trim()));
                if (
                  vals.length < 1 ||
                  vals.length > 6 ||
                  vals.some(
                    (v) =>
                      v < 10 ||
                      v > 2000 ||
                      !Number.isFinite(v) ||
                      Math.round(v * 100) !== v * 100,
                  )
                ) {
                  setDebugError(
                    "Enter 1–6 amounts between 10 and 2000, separated by commas.",
                  );
                  return;
                }
                setPresets([...new Set(vals)]);
                setDebugError("");
              }}
            >
              Apply presets
            </Button>
            {debugError && (
              <p role="alert" className="error">
                {debugError}
              </p>
            )}
            <Field
              label="Selected amount"
              inputMode="decimal"
              value={flow.amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                dispatch({ type: "amount", value: e.target.value })
              }
            />
            <label className="field">
              Payment outcome
              <select
                aria-label="Payment outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as Outcome)}
              >
                <option value="success">Success</option>
                <option value="declined">Declined</option>
                <option value="pending">Pending</option>
              </select>
            </label>
            <Button onClick={() => reset()}>Reset scenario</Button>
          </fieldset>
        </div>
      )}
    </div>
  );
  return (
    <>
      <div className={`app-shell ${uccColour ? "is-colour" : "is-monochrome"}`}>
        <aside className={`sidebar ${menu ? "mobile-open" : ""}`}>
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setHostPage("Lobby");
            }}
          >
            <img src="/reels-grande-logo.svg" alt="Reels Grande" />
          </a>
          <div className="sidebar-tools">
            <button aria-label="Open navigation"><Menu size={21} /></button>
            <label className="search">
              <Search size={20} />
              <input
                aria-label="Search games"
                placeholder="Search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHostPage("Lobby");
                }}
              />
            </label>
          </div>
          <nav>
            {[
              ["Lobby", Home],
              ["Favorites", Gift],
              ["Suggested", Gift],
              ["Popular Slots", Home],
              ["New Games", Layers],
              ["Table Games", CreditCard],
              ["Video Poker", Layers],
              ["Specialty", Gift],
              ["Crash Games", Trophy],
              ["All Games", Layers],
              ["Tournaments", Trophy],
              ["Promotions", Gift],
              ["Leaderboards", Trophy],
            ].map(([name, Icon]) => {
              const I = Icon as typeof Home;
              return (
                <button
                  key={String(name)}
                  className={hostPage === name ? "selected" : ""}
                  onClick={() => {
                    setHostPage(String(name));
                    setMenu(false);
                  }}
                >
                  <I size={18} />
                  {String(name)}
                </button>
              );
            })}
          </nav>
          <div className="sidebar-bottom">
            <button onClick={() => setHostPage("Game Providers")}>⚛ &nbsp; GAME PROVIDERS</button>
            <button onClick={() => setHostPage("More")}>▦ &nbsp; MORE</button>
            <button onClick={() => setHostPage("Support")}>◉ &nbsp; LIVE SUPPORT</button>
            <button onClick={() => setHostPage("Logout")}>↪ &nbsp; LOGOUT</button>
          </div>
        </aside>
        <div className="host">
          <header className="host-header">
            <div className="mobile-brand"><img src="/reels-grande-logo.svg" alt="Reels Grande" /></div>
            <div className="header-actions">
              <button className="reward-progress" onClick={() => setHostPage("Promotions")} aria-label="Rewards progress">
                <Trophy size={28} /><strong>0%</strong><span>20 FREE<br />SPINS</span>
              </button>
              <button className="account-deposit" aria-label="Deposit" onClick={() => launch()}>
                <strong>$0.00</strong><span>DEPOSIT</span>
              </button>
              <button className="header-inbox" aria-label="Inbox" onClick={() => setHostPage("Inbox")}><Inbox size={24} /></button>
              <button
                className="avatar"
                aria-label="My account"
                onClick={() => setHostPage("My Account")}
              >
                <User size={18} />
              </button>
              <button
                className="icon-button mobile-only"
                aria-label="Toggle navigation"
                onClick={() => setMenu(!menu)}
              >
                <Menu size={20} />
              </button>
            </div>
          </header>
          <main className="lobby">
            {hostPage === "Lobby" || hostPage === "Popular Slots" || hostPage === "New Games" || hostPage === "Favorites" || hostPage === "Suggested" || hostPage === "All Games" ||
            hostPage === "Promotions" ||
            hostPage === "Slots" || hostPage === "Table Games" || hostPage === "Video Poker" || hostPage === "Specialty" || hostPage === "Crash Games" ? (
              <>
                <section className="promo">
                  <picture aria-hidden="true">
                    <source media="(max-width: 650px)" srcSet="/reelsucc-mobile-reference.png" />
                    <img className="promo-image" src="/reelsucc-reference.png" alt="" />
                  </picture>
                  <button aria-label="Claim offer" onClick={() => launch("KICKSTARTER")}>Claim now</button>
                </section>
                <div className="categories">
                  {[
                    ["Lobby", "◆"],
                    ["Promotions", "♛"],
                    ["Favorites", "♥"],
                    ["Suggested", "✦"],
                    ["Popular Slots", "▦"],
                    ["New Games", "NEW"],
                    ["Table Games", "♣"],
                    ["Video Poker", "♠"],
                    ["Specialty", "★"],
                  ].map(([n, icon]) => (
                    <button
                      key={n}
                      className={hostPage === n ? "active" : ""}
                      onClick={() => setHostPage(n)}
                    >
                      <span aria-hidden="true">{icon}</span>{n}
                    </button>
                  ))}
                </div>
                <div className="row">
                  <h2 className="game-row-title">KEEP PLAYING</h2>
                  <button className="view-all">VIEW ALL</button>
                </div>
                <div className="games">
                  {games
                    .filter(
                      (g) =>
                        !search ||
                        g[0].toLowerCase().includes(search.toLowerCase()),
                    )
                    .map(([name, provider], i) => (
                      <article className="game" key={name}>
                        <div className={`game-art art-${i}`} aria-hidden="true" />
                        <button className="game-favorite" aria-label={`Favorite ${name}`}>♡</button>
                        <strong>{name}</strong>
                        <span>By: {provider}</span>
                      </article>
                    ))}
                </div>
              </>
            ) : (
              <section className="placeholder">
                <h2>
                  {hostPage === "Inbox"
                    ? "You’re all caught up"
                    : hostPage === "My Account"
                      ? "Alex Morgan"
                      : "Your next tournament"}
                </h2>
                <p>
                  {hostPage === "My Account"
                    ? "Member since 2024 · USD account"
                    : hostPage === "Inbox"
                      ? "Your offers are ready to explore in the cashier."
                      : "Tournament registration is outside this cashier preview."}
                </p>
                <Button onClick={() => launch()}>Open cashier</Button>
              </section>
            )}
          </main>
        </div>
        <nav className="mobile-nav">
          <button onClick={() => setHostPage("Tournaments")}>
            <Trophy size={24} />
            Tournaments
          </button>
          <button onClick={() => setHostPage("Promotions")}>
            <Gift size={24} />
            Promotions
          </button>
          <button className="wallet-nav" aria-label="$24.50" onClick={() => launch()}>
            <span><Wallet size={31} /></span>
            $0.00
          </button>
          <button onClick={() => setHostPage("Leaderboards")}>
            <Trophy size={24} />
            Leaderboards
          </button>
          <button onClick={() => setHostPage("Inbox")}>
            <Inbox size={25} />
            Inbox
          </button>
        </nav>
        {!(open && flow.step === 1 && offer) && (
          <button
            className="ucc-style-toggle"
            aria-pressed={uccColour}
            onClick={() => setUccColour((value) => !value)}
          >
            {uccColour ? "Monochrome view" : "Colour view"}
          </button>
        )}
      </div>
      {open && (
        <>
          <div className="cashier-scrim" aria-hidden="true" onClick={close} />
          <dialog
            ref={dialog}
            aria-labelledby="cashier-title"
            onCancel={(e) => {
              e.preventDefault();
              close();
            }}
            className={`cashier-dialog ${uccColour ? "cashier-colour" : "cashier-wireframe"}`}
          >
          <div className="cashier-header">
            <button
              className="cashier-back"
              aria-label="Back in cashier"
              disabled={processing}
              onClick={() => (flow.step > 0 ? go((flow.step - 1) as Step) : close())}
            >
              <ArrowLeft size={19} />
            </button>
            <div className="cashier-branding">
              <h2 id="cashier-title" tabIndex={-1}>Cashier</h2>
            </div>
            <button
              className="icon-button"
              aria-label="Close cashier"
              disabled={processing}
              onClick={close}
            >
              <X size={21} />
              </button>
          </div>
          <output className="cashier-balance-state" aria-label="Cash balance">
            {money(balance)}
          </output>
          <div className="cashier-layout">
            <nav className="cashier-nav" aria-label="Cashier sections">
              {["Deposit", "Withdraw", "Coupons", "Transactions"].map(
                (s, i) => {
                  const I = [Wallet, ArrowRight, Gift, Layers][i];
                  return (
                    <button
                      key={s}
                      disabled={processing}
                      className={section === s ? "selected" : ""}
                      onClick={() => {
                        setSection(s);
                        setCard(emptyCard());
                        setErrors({});
                      }}
                    >
                      <I size={17} />
                      {s}
                    </button>
                  );
                },
              )}
              <button
                className="back-games"
                onClick={close}
                disabled={processing}
              >
                <ArrowLeft size={16} />
                Back to games
              </button>
              <div className="secure">
                <LockKeyhole size={17} />
                <span>
                  Safe and simple
                  <br />
                  Every step of the way
                </span>
              </div>
            </nav>
            <div className="cashier-content">
              {section === "Deposit" && !result ? (
                <>
                  <fieldset
                    disabled={processing}
                    className={`flow-fields ${paymentChoice === "card" && flow.method === "saved" ? "saved-card-flow" : ""}`}
                  >
                    {steps.map((title, index) => {
                      const i = index as Step,
                        active = flow.step === i,
                        completed =
                          flow.reached > i && !(i === 2 && amountIssue);
                      if (
                        i === 3 &&
                        paymentChoice === "card" &&
                        flow.method === "saved"
                      )
                        return null;
                      return (
                        <section
                          key={title}
                          className={`step ${active ? "expanded" : ""}`}
                        >
                          <button
                            data-active-heading={active ? true : undefined}
                            className="step-heading"
                            aria-expanded={active}
                            aria-controls={`step-${i}`}
                            disabled={i > flow.reached}
                            onClick={() => go(i)}
                          >
                            <span
                              className={`step-number ${completed ? "complete" : ""}`}
                            >
                              {completed ? <Check size={14} /> : i + 1}
                            </span>
                            <span className="step-title">
                              {title}
                              <small>
                                {!active && i <= flow.reached ? summary[i] : ""}
                              </small>
                            </span>
                            {i <= flow.reached && (
                              <ChevronDown
                                className={active ? "rotate" : ""}
                                size={16}
                              />
                            )}
                          </button>
                          {active && (
                            <div className="step-body" id={`step-${i}`}>
                              {i === 0 && (
                                <>
                                  <TrustPanel />
                                  <h3 className="payment-method-title">
                                    Choose a payment method
                                  </h3>
                                  <div className="method-grid">
                                    {cardEligible && (
                                      <section className="card-method-panel">
                                        {saved && flow.method === "saved" ? (
                                          <>
                                            <h4>Your last used credit card</h4>
                                            <button
                                              className={`card-method-row saved-card-row ${paymentChoice === "card" ? "chosen" : ""}`}
                                              aria-label="Credit card Visa •••• 5602 Last used credit card"
                                              aria-pressed={paymentChoice === "card"}
                                              onClick={() => {
                                                setPaymentChoice("card");
                                                if (paymentChoice === "card") {
                                                  dispatch({ type: "method", method: "new" });
                                                  setCard(emptyCard());
                                                } else {
                                                  dispatch({ type: "method", method: "saved" });
                                                }
                                              }}
                                            >
                                              <span className="selection-circle">{paymentChoice === "card" ? <Check size={14} /> : null}</span>
                                              <b>VISA</b>
                                              <strong>•••• 5602</strong>
                                              <span className="change-card-label">Change card</span>
                                            </button>
                                          </>
                                        ) : (
                                          <div className="inline-card-entry">
                                            <div className="row">
                                              <h4>{saved ? "Enter a new credit card" : "Credit card details"}</h4>
                                              {saved && (
                                                <button
                                                  className="text-button"
                                                  onClick={() => {
                                                    dispatch({ type: "method", method: "saved" });
                                                    setCard(emptyCard());
                                                    setErrors({});
                                                  }}
                                                >
                                                  Use saved Visa
                                                </button>
                                              )}
                                            </div>
                                            <CardBrands />
                                            <Field
                                              label="Card number"
                                              aria-label="Card number"
                                              inputMode="numeric"
                                              autoComplete="off"
                                              placeholder="Card number"
                                              maxLength={23}
                                              value={card.number}
                                              error={errors.number}
                                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                changeCard("number", e.target.value)
                                              }
                                            />
                                            <div className="form-row">
                                              <Field
                                                label="MM / YY"
                                                aria-label="MM / YY"
                                                placeholder="MM / YY"
                                                inputMode="numeric"
                                                maxLength={5}
                                                autoComplete="off"
                                                value={card.expiry}
                                                error={errors.expiry}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                  changeCard("expiry", e.target.value)
                                                }
                                              />
                                              <Field
                                                label="CVV"
                                                aria-label="CVV"
                                                type="password"
                                                inputMode="numeric"
                                                placeholder="CVV"
                                                maxLength={4}
                                                autoComplete="off"
                                                value={card.cvv}
                                                error={errors.cvv}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                  changeCard("cvv", e.target.value)
                                                }
                                              />
                                            </div>
                                            <label className="save-card-option">
                                              <input
                                                type="checkbox"
                                                checked={saveCard}
                                                onChange={(e) => setSaveCard(e.target.checked)}
                                              />
                                              <span>
                                                <strong>Save this card for next time</strong>
                                                <small>Use it for faster deposits on this account.</small>
                                              </span>
                                            </label>
                                          </div>
                                        )}
                                      </section>
                                    )}
                                    {paymentMethods
                                        .filter(
                                          (method) =>
                                            method.id !== "neosurf" || currency === "AUD",
                                        )
                                        .map((method) => (
                                          <button
                                            key={method.id}
                                            className={`method-choice method-${method.id} ${paymentChoice === method.id ? "chosen" : ""}`}
                                            aria-pressed={paymentChoice === method.id}
                                            onClick={() => {
                                              setPaymentChoice(method.id);
                                              if (["bitcoin", "litecoin", "ethereum"].includes(method.id))
                                                setCryptoAsset(method.id as CryptoAssetId);
                                              setCryptoStage("details");
                                              setCryptoCopied(false);
                                              setCard(emptyCard());
                                            }}
                                          >
                                            <span className="method-mark" aria-hidden="true">{method.mark}</span>
                                            <span><strong>{method.name}</strong><small>{method.detail}</small></span>
                                            <span className="selection-circle">
                                              {paymentChoice === method.id ? <Check size={14} /> : null}
                                            </span>
                                          </button>
                                        ))}
                                  </div>
                                  <div className="actions">
                                    <Button
                                      primary
                                      onClick={() => {
                                        if (paymentChoice === "card" && flow.method === "new") {
                                          const issues = cardErrors(card, false);
                                          setErrors(issues);
                                          if (Object.keys(issues).length) return;
                                        }
                                        setErrors({});
                                        dispatch({ type: "advance" });
                                      }}
                                    >
                                      {saved ? "Continue & pick a bonus" : "Continue"}
                                    </Button>
                                  </div>
                                </>
                              )}
                              {i === 1 && (
                                <>
                                  {offer ? (
                                    <div className="active-offer">
                                      <div className="active-offer-banner">
                                        <span><Check size={22} /></span>
                                        <strong>Bonus</strong>
                                        <b>{offer.code}</b>
                                        <ChevronDown size={16} />
                                      </div>
                                      <div className="active-offer-body">
                                        <div className="active-coupon-notice">
                                          <Check size={16} />
                                          You have an active coupon code
                                        </div>
                                        <h3>{offer.code}</h3>
                                        <dl className="active-offer-details">
                                          <div><dt>Bonus Type</dt><dd>Percentage of next deposit</dd></div>
                                          <div><dt>Minimum Deposit</dt><dd>{money(offer.minimum).replace(".00", "")}</dd></div>
                                          <div><dt>Bonus Percentage</dt><dd>{offer.code === "BIGWIN420" ? "420%" : "450%"}</dd></div>
                                          <div><dt>Free Spins</dt><dd>{offer.code === "BIGWIN420" ? "20 Spins on Khrysos Gold" : "75 Spins on 777"}</dd></div>
                                          <div><dt>Max. Cashout</dt><dd>{offer.code === "BIGWIN420" ? "This bonus amount is non-cashable." : "15 times the deposit"}</dd></div>
                                          <div><dt>Coupon Conditions</dt><dd>{offer.terms}</dd></div>
                                        </dl>
                                      {cancelCoupon ? (
                                        <div className="confirm">
                                          <p>
                                            Remove {offer.code}? Your deposit
                                            amount will be kept.
                                          </p>
                                          <Button
                                            onClick={() => {
                                              dispatch({
                                                type: "bonus",
                                                code: null,
                                              });
                                              setCancelCoupon(false);
                                              setTerms(null);
                                            }}
                                          >
                                            Remove coupon
                                          </Button>
                                          <Button
                                            onClick={() =>
                                              setCancelCoupon(false)
                                            }
                                          >
                                            Keep coupon
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="active-offer-actions">
                                          <button
                                            className="cancel-link"
                                            onClick={() => setCancelCoupon(true)}
                                          >
                                            Cancel coupon
                                          </button>
                                          <button
                                            ref={activeContinueRef}
                                            className="button primary active-offer-continue"
                                            aria-hidden={!activeContinueInView}
                                            tabIndex={activeContinueInView ? 0 : -1}
                                            onClick={() => dispatch({ type: "advance" })}
                                          >
                                            Continue
                                          </button>
                                        </div>
                                      )}
                                      {!cancelCoupon && !activeContinueInView && (
                                        <button
                                          className="button primary floating-continue"
                                          onClick={() => dispatch({ type: "advance" })}
                                        >
                                          Continue
                                        </button>
                                      )}
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <h3 className="flow-section-title">
                                        Choose a bonus or coupon
                                        <span aria-hidden="true">ⓘ</span>
                                      </h3>
                                      <div className="offers">
                                        {offers.map((o) => (
                                          <article
                                            className="offer"
                                            key={o.code}
                                          >
                                            <button
                                              className="offer-info"
                                              aria-label={`Details for ${o.code}`}
                                              onClick={() =>
                                                setTerms(
                                                  terms === o.code
                                                    ? null
                                                    : o.code,
                                                )
                                              }
                                            >
                                              ⓘ
                                            </button>
                                            <div className="offer-image" aria-hidden="true">
                                              <span>▧</span>
                                            </div>
                                            <div className="offer-copy">
                                              <h3>{o.title}</h3>
                                              <Button
                                                aria-label="Select"
                                                onClick={() => {
                                                  dispatch({
                                                    type: "bonus",
                                                    code: o.code,
                                                  });
                                                  setTerms(null);
                                                }}
                                              >
                                                {o.code}
                                              </Button>
                                              <p>Min. Deposit: {money(o.minimum).replace(".00", "")}</p>
                                              {terms === o.code && (
                                                <p className="terms">
                                                  {o.terms}
                                                </p>
                                              )}
                                            </div>
                                          </article>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                  {!offer && (
                                    <>
                                      <button
                                        className="coupon-toggle"
                                        aria-expanded={couponOpen}
                                        onClick={() =>
                                          setCouponOpen(!couponOpen)
                                        }
                                      >
                                        I have a coupon code
                                      </button>
                                      {couponOpen && (
                                        <div className="coupon-entry">
                                          <Field
                                            label="Coupon code"
                                            value={coupon}
                                            error={couponError}
                                            onChange={(
                                              e: React.ChangeEvent<HTMLInputElement>,
                                            ) => {
                                              setCoupon(e.target.value);
                                              setCouponError("");
                                            }}
                                          />
                                          <Button onClick={applyCoupon}>
                                            Apply coupon
                                          </Button>
                                        </div>
                                      )}
                                    </>
                                  )}
                                  <div className="actions">
                                    {!offer && (
                                      <button
                                        className="deposit-without"
                                        onClick={() => {
                                          dispatch({
                                            type: "bonus",
                                            code: null,
                                          });
                                          dispatch({ type: "advance" });
                                        }}
                                      >
                                        Deposit without bonus
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                              {i === 2 && (
                                <>
                                  <h3 className="flow-section-title">
                                    Select deposit amount
                                  </h3>
                                  <div className="amount-presets">
                                    {presets.map((n) => (
                                      <button
                                        key={n}
                                        aria-pressed={flow.amount === String(n)}
                                        className={
                                          flow.amount === String(n)
                                            ? "chosen"
                                            : ""
                                        }
                                        onClick={() => {
                                          dispatch({
                                            type: "amount",
                                            value: String(n),
                                          });
                                          setAmountTouched(true);
                                        }}
                                      >
                                        <span>{money(n).replace(".00", "")}</span>
                                        {n === 50 && <small>Most Popular</small>}
                                      </button>
                                    ))}
                                    <button
                                      aria-pressed={
                                        !presets.includes(Number(flow.amount))
                                      }
                                      className={
                                        !presets.includes(Number(flow.amount))
                                          ? "chosen"
                                          : ""
                                      }
                                      onClick={() => {
                                        dispatch({ type: "amount", value: "5" });
                                        setAmountTouched(true);
                                      }}
                                    >
                                      <span>Custom<br />Amount</span>
                                      {!presets.includes(Number(flow.amount)) && (
                                        <i className="preset-check"><Check size={13} /></i>
                                      )}
                                    </button>
                                  </div>
                                  {amountTouched &&
                                    amountIssue &&
                                    presets.includes(Number(flow.amount)) && (
                                    <p role="alert" className="error amount-error">
                                      {amountIssue}
                                    </p>
                                  )}
                                  {!presets.includes(Number(flow.amount)) && (
                                    <div className="custom-amount-entry">
                                      <Field
                                        label="Enter custom amount"
                                        inputMode="decimal"
                                        value={flow.amount}
                                        error={
                                          amountTouched ? amountIssue : undefined
                                        }
                                        onChange={(
                                          e: React.ChangeEvent<HTMLInputElement>,
                                        ) => {
                                          dispatch({
                                            type: "amount",
                                            value: e.target.value,
                                          });
                                          setAmountTouched(true);
                                        }}
                                      />
                                    </div>
                                  )}
                                  <div className="actions">
                                    <Button
                                      primary
                                      onClick={() => {
                                        setAmountTouched(true);
                                        if (!amountIssue) {
                                          if (
                                            paymentChoice === "card" &&
                                            flow.method === "saved"
                                          )
                                            void pay();
                                          else dispatch({ type: "advance" });
                                        }
                                      }}
                                    >
                                      Continue
                                    </Button>
                                  </div>
                                </>
                              )}
                              {i === 3 && (
                                <>
                                  {!isCryptoPayment && paymentChoice !== "card" && <TrustPanel />}
                                  {amountIssue && (
                                    <p role="alert" className="error">
                                      {amountIssue}
                                    </p>
                                  )}
                                  {isCryptoPayment ? (
                                    cryptoStage === "select" ? (
                                      <section className="crypto-asset-selection">
                                        <h3>Choose your cryptocurrency</h3>
                                        <div className="crypto-asset-grid">
                                          {cryptoAssets.map((asset) => (
                                            <button
                                              key={asset.id}
                                              className={cryptoAsset === asset.id ? "selected" : ""}
                                              aria-pressed={cryptoAsset === asset.id}
                                              onClick={() => {
                                                setCryptoAsset(asset.id);
                                                setCryptoCopied(false);
                                              }}
                                            >
                                              <span className={`crypto-asset-mark ${asset.id}`}>
                                                {asset.id === "bitcoin" ? <Bitcoin size={20} /> : asset.mark}
                                              </span>
                                              <strong>{asset.name}</strong>
                                              {cryptoAsset === asset.id && <Check size={13} />}
                                            </button>
                                          ))}
                                        </div>
                                        <div className="actions">
                                          <Button primary onClick={() => setCryptoStage("details")}>
                                            Deposit {money(Number(flow.amount) || 0)}
                                          </Button>
                                        </div>
                                        <aside className="crypto-help">
                                          <CircleHelp size={16} aria-hidden="true" />
                                          <p>Need help making your first crypto deposit?</p>
                                          <button>Yes, please</button>
                                        </aside>
                                      </section>
                                    ) : (
                                      <section className="crypto-final-details">
                                        <h3>Deposit via {selectedCrypto.name}</h3>
                                        <button
                                          className="crypto-change-method"
                                          onClick={() => {
                                            go(0);
                                            setCryptoCopied(false);
                                          }}
                                        >
                                          or choose a different method
                                        </button>
                                        <div className="crypto-amount-summary">
                                          <div><span>USD</span><strong>{Number(flow.amount || 0).toFixed(2)}</strong></div>
                                          <div><span>Amount in {selectedCrypto.ticker}</span><strong>{quotedCryptoAmount}</strong></div>
                                        </div>
                                        <div className="demo-qr" aria-label="Demo payment QR code" />
                                        <button className="crypto-download">⇩ Download QR code</button>
                                        <code className="crypto-address">{selectedCrypto.destination}</code>
                                        <Button
                                          primary
                                          onClick={() => {
                                            navigator.clipboard?.writeText(selectedCrypto.destination).catch(() => undefined);
                                            setCryptoCopied(true);
                                          }}
                                        >
                                          {cryptoCopied ? "Copied" : "Copy"}
                                        </Button>
                                        <aside className="crypto-important">
                                          <strong>Important</strong>
                                          <ul>
                                            <li>Deposits below $20 will not be credited.</li>
                                            <li>Confirmation time: 5–30 minutes.</li>
                                            <li>Network fees may affect the final amount.</li>
                                          </ul>
                                        </aside>
                                      </section>
                                    )
                                  ) : paymentChoice !== "card" ? (
                                    <div className="provider-handoff">
                                      <span className="method-mark">{paymentMethods.find((method) => method.id === paymentChoice)?.mark}</span>
                                      <div>
                                        <strong>{paymentMethods.find((method) => method.id === paymentChoice)?.name}</strong>
                                        <p>You’ll continue securely with this payment provider.</p>
                                      </div>
                                    </div>
                                  ) : flow.method === "new" ? (
                                    <div className="saved-payment-summary new-card-review">
                                      <div><span>Payment Method</span><strong>Visa •••• 4242</strong></div>
                                      <div><span>Bonus / Coupon</span><strong>{offer ? `${offer.code} (${offer.title.split("%")[0]}%)` : "No bonus"}</strong></div>
                                      <div><span>Deposit Amount</span><strong>{money(Number(flow.amount) || 0)}</strong></div>
                                    </div>
                                  ) : (
                                    <div className="saved-payment-summary">
                                      <div><span>Payment Method</span><strong>Visa ••5602</strong></div>
                                      <div><span>Bonus / Coupon</span><strong>{offer ? `${offer.code} (${offer.title.split("%")[0]}%)` : "No bonus"}</strong></div>
                                      <div><span>Deposit Amount</span><strong>{money(Number(flow.amount) || 0)}</strong></div>
                                    </div>
                                  )}
                                  {paymentChoice === "card" && <div className="billing">
                                    <div className="row">
                                      <strong>Address on file</strong>
                                      {!editingAddress && (
                                        <button
                                          className="text-button"
                                          aria-label="Edit"
                                          onClick={() => {
                                            setDraftAddress({ ...address });
                                            setEditingAddress(true);
                                          }}
                                        >
                                          Update address
                                        </button>
                                      )}
                                    </div>
                                    {editingAddress ? (
                                      <>
                                        <div className="address-form">
                                          {(
                                            [
                                              ["line", "Street address"],
                                              ["city", "City"],
                                              ["region", "State / region"],
                                              ["zip", "Postal code"],
                                            ] as const
                                          ).map(([key, label]) => (
                                            <Field
                                              key={key}
                                              label={label}
                                              value={draftAddress[key]}
                                              error={errors[key]}
                                              onChange={(
                                                e: React.ChangeEvent<HTMLInputElement>,
                                              ) => {
                                                setDraftAddress((a) => ({
                                                  ...a,
                                                  [key]: e.target.value,
                                                }));
                                                setErrors((v) => ({
                                                  ...v,
                                                  [key]: "",
                                                }));
                                              }}
                                            />
                                          ))}
                                          <label className="field">
                                            Country
                                            <select
                                              value={draftAddress.country}
                                              onChange={(e) =>
                                                setDraftAddress((a) => ({
                                                  ...a,
                                                  country: e.target.value,
                                                }))
                                              }
                                            >
                                              <option>United States</option>
                                              <option>Canada</option>
                                              <option>United Kingdom</option>
                                            </select>
                                          </label>
                                        </div>
                                        <div className="actions">
                                          <Button
                                            onClick={() => {
                                              setEditingAddress(false);
                                              setErrors({});
                                            }}
                                          >
                                            Cancel address edit
                                          </Button>
                                          <Button
                                            onClick={() => {
                                              const errs: Record<
                                                string,
                                                string
                                              > = {};
                                              for (const key of [
                                                "line",
                                                "city",
                                                "region",
                                                "zip",
                                              ] as const)
                                                if (!draftAddress[key].trim())
                                                  errs[key] =
                                                    "This field is required.";
                                              setErrors(errs);
                                              if (!Object.keys(errs).length) {
                                                setAddress({ ...draftAddress });
                                                setEditingAddress(false);
                                              }
                                            }}
                                          >
                                            Save address
                                          </Button>
                                        </div>
                                      </>
                                    ) : (
                                      <p>
                                        {address.line}
                                        <br />
                                        {address.city}, {address.region} {address.zip}
                                        <br />
                                        {address.country}
                                      </p>
                                    )}
                                  </div>}
                                  {errors.address && (
                                    <p role="alert" className="error">
                                      {errors.address}
                                    </p>
                                  )}
                                  {!isCryptoPayment && (
                                    <>
                                      <div className="actions">
                                        <Button
                                          primary
                                          disabled={processing}
                                          onClick={() => {
                                            if (paymentChoice !== "card") {
                                              setProviderWindow(paymentChoice);
                                              return;
                                            }
                                            void pay();
                                          }}
                                        >
                                          {processing
                                            ? "Processing…"
                                            : paymentChoice !== "card"
                                              ? "Continue to provider"
                                              : `Deposit ${money(Number(flow.amount) || 0)}`}
                                          <LockKeyhole size={15} />
                                        </Button>
                                      </div>
                                      <p className="deposit-footnote">
                                        Funds are credited to your account quickly.
                                      </p>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </section>
                      );
                    })}
                  </fieldset>
                  {providerWindow && selectedProvider && (
                    <div className="provider-window-layer">
                      <section
                        className="provider-window"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="provider-window-title"
                      >
                        <div className="provider-window-chrome" aria-hidden="true">
                          <span />
                          <span />
                          <span />
                          <div>secure.{selectedProvider.id}.example</div>
                        </div>
                        <div className="provider-window-body">
                          <span className={`method-mark method-${selectedProvider.id}`}>
                            {selectedProvider.mark}
                          </span>
                          <small>Secure provider window</small>
                          <h3 id="provider-window-title">
                            Complete payment with {selectedProvider.name}
                          </h3>
                          <p>
                            This window simulates the provider’s approval flow.
                            Close it to return the completed transaction to the cashier.
                          </p>
                          <Button
                            primary
                            onClick={() => {
                              setProviderWindow(null);
                              void pay();
                            }}
                          >
                            Close window to finish transaction
                          </Button>
                        </div>
                      </section>
                    </div>
                  )}
                  {processing && (
                    <p className="processing" role="status">
                      Processing your deposit. Please wait…
                    </p>
                  )}
                </>
              ) : section === "Deposit" && result ? (
                <div className="result">
                  <div className="result-icon">
                    {result === "success" ? (
                      <Check size={30} />
                    ) : result === "declined" ? (
                      <CreditCard size={30} />
                    ) : (
                      <Layers size={30} />
                    )}
                  </div>
                  <h3 tabIndex={-1} data-active-heading>
                    {result === "success"
                      ? "Your deposit is complete"
                      : result === "declined"
                        ? "Your card was declined"
                        : "Your deposit is pending"}
                  </h3>
                  <p>
                    {result === "success"
                      ? `${money(receipt?.amount ?? 0)} has been added to your cash balance.`
                      : result === "declined"
                        ? "Your balance has not changed. A digital wallet may have a better chance of approval than retrying the same card."
                        : "We’re waiting for confirmation. Your balance will update once the payment is approved."}
                  </p>
                  {result === "declined" && (
                    <div className="notice">
                      Payment response: DEMO_CARD_DECLINED
                    </div>
                  )}
                  {result === "success" && receipt?.bonus && (
                    <p>
                      {receipt.bonus} selected. Bonus fulfillment is simulated.
                    </p>
                  )}
                  <small>
                    Reference RG-{String(transactions.length).padStart(4, "0")}
                  </small>
                  <div className={`actions ${result === "declined" ? "declined-actions" : ""}`}>
                    {result === "declined" ? (
                      <>
                        <Button
                          primary
                          onClick={() => {
                            setPaymentChoice("applepay");
                            setOutcome("success");
                            setResult(null);
                            dispatch({ type: "advance" });
                          }}
                        >
                          Use Apple Pay
                        </Button>
                        <Button
                          onClick={() => {
                            setPaymentChoice("googlepay");
                            setOutcome("success");
                            setResult(null);
                            dispatch({ type: "advance" });
                          }}
                        >
                          Use Google Pay
                        </Button>
                      </>
                    ) : (
                      <Button primary onClick={close}>
                        Back to games
                      </Button>
                    )}
                    <Button onClick={() => setSection("Transactions")}>
                      View transactions
                    </Button>
                  </div>
                  {result !== "declined" && (
                    <button
                      className="text-button"
                      onClick={() => {
                        setResult(null);
                        dispatch({ type: "reset", saved });
                      }}
                    >
                      Make another deposit
                    </button>
                  )}
                </div>
              ) : section === "Withdraw" ? (
                <div className="withdrawal-view">
                  {withdrawalSubmitted && selectedWithdrawal ? (
                    <div className="withdrawal-confirmation" role="status">
                      <span className="result-icon"><Check size={30} /></span>
                      <span className="eyebrow">Withdrawal requested</span>
                      <h3>{money(withdrawalValue)} is being reviewed</h3>
                      <p>
                        Your {selectedWithdrawal.name.toLowerCase()} request has
                        been added to the transaction queue.
                      </p>
                      <small>Reference WD-0001</small>
                      <div className="actions">
                        <Button
                          primary
                          onClick={() => setSection("Transactions")}
                        >
                          View transactions
                        </Button>
                        <Button onClick={() => setWithdrawalSubmitted(false)}>
                          Make another withdrawal
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <section className="withdrawal-guidance">
                        <h3 tabIndex={-1} data-active-heading>
                          Verification and withdrawal
                        </h3>
                        <p>
                          {withdrawalScenario === "empty"
                            ? "To access your withdrawal methods and upload documents for account verification, you’ll need to have funds in your account. Once you make a deposit, these options will become available to you. We’re here to help you every step of the way!"
                            : "Choose a withdrawal method below. Additional identity verification may be required before your request can be approved."}
                        </p>
                        <p>
                          If you need assistance, contact us through{" "}
                          <button
                            className="inline-link"
                            onClick={() => {
                              close();
                              setHostPage("Support");
                            }}
                          >
                            Live Chat
                          </button>
                          .
                        </p>
                      </section>

                      <section className="withdrawal-balance" aria-label="Withdrawable balance">
                        <span>Withdrawable balance*</span>
                        <strong>{money(withdrawableBalance)}</strong>
                        <small>
                          * This is your current casino balance, though the
                          approved withdrawal amount may differ due to maximum
                          cash-out limits or removal of casino bonus cash.
                        </small>
                      </section>

                      <section className="withdrawal-methods">
                        <h3>Withdrawal methods</h3>
                        {withdrawalMethods.map((method) => {
                          const MethodIcon = method.Icon;
                          const locked = withdrawalScenario === "empty";
                          const selected = withdrawalMethod === method.id;
                          return (
                            <button
                              key={method.id}
                              className={selected ? "selected" : ""}
                              disabled={locked}
                              aria-pressed={selected}
                              onClick={() => {
                                setWithdrawalMethod(method.id);
                                setWithdrawalAmount(String(method.minimum));
                              }}
                            >
                              <span className="withdrawal-method-icon">
                                <MethodIcon size={20} />
                              </span>
                              <span>
                                <strong>{method.name}</strong>
                                <small>{method.detail}</small>
                              </span>
                              {locked ? (
                                <LockKeyhole size={20} />
                              ) : selected ? (
                                <Check size={20} />
                              ) : (
                                <ChevronRight size={20} />
                              )}
                            </button>
                          );
                        })}
                      </section>

                      {withdrawalScenario === "available" && selectedWithdrawal && (
                        <section className="withdrawal-request">
                          <div>
                            <span className="eyebrow">Selected method</span>
                            <h3>{selectedWithdrawal.name}</h3>
                          </div>
                          <Field
                            label="Withdrawal amount"
                            type="number"
                            min={selectedWithdrawal.minimum}
                            max={Math.min(2500, withdrawableBalance)}
                            step="1"
                            value={withdrawalAmount}
                            error={withdrawalIssue || undefined}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setWithdrawalAmount(e.target.value)
                            }
                          />
                          <Button
                            primary
                            disabled={!!withdrawalIssue}
                            onClick={() => setWithdrawalSubmitted(true)}
                          >
                            Request {money(withdrawalValue || 0)} withdrawal
                          </Button>
                        </section>
                      )}
                    </>
                  )}
                </div>
              ) : section === "Coupons" ? (
                <div className="coupon-hub">
                  <section className="coupon-redeem">
                    <h3 tabIndex={-1} data-active-heading>
                      Enter your coupon code
                    </h3>
                    <div className="coupon-redeem-row">
                      <Field
                        label="Coupon code"
                        aria-label="Coupon code"
                        placeholder="Coupon code"
                        value={coupon}
                        error={couponError}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setCoupon(e.target.value);
                          setCouponError("");
                        }}
                      />
                      <Button primary onClick={applyCoupon}>Redeem</Button>
                    </div>
                  </section>

                  <section className="coupon-featured">
                    <div className="coupon-featured-copy">
                      <span className="eyebrow">Featured promotion</span>
                      <h3>{offers[0].title}</h3>
                      <p>{offers[0].description}</p>
                      <Button
                        primary
                        onClick={() => {
                          setResult(null);
                          dispatch({ type: "bonus", code: offers[0].code });
                          setSection("Deposit");
                          go(flow.reached >= 1 ? 1 : 0);
                        }}
                      >
                        Claim now
                      </Button>
                    </div>
                    <div className="coupon-art" aria-hidden="true">
                      <Gift size={32} />
                      <span>Promotion artwork</span>
                    </div>
                  </section>

                  <h3 className="coupon-list-title">Recommended promotions</h3>
                  <div className="coupon-recommendations">
                    {offers.map((o) => (
                      <article className="coupon-card" key={o.code}>
                        <div className="coupon-card-art" aria-hidden="true">
                          {o.title.split(" ")[0]}
                        </div>
                        <div>
                          <span className="eyebrow">Code {o.code}</span>
                          <h3>{o.title}</h3>
                          <p>{o.description} Minimum deposit {money(o.minimum)}.</p>
                          <button
                            className="inline-link"
                            onClick={() => {
                              setResult(null);
                              dispatch({ type: "bonus", code: o.code });
                              setSection("Deposit");
                              go(flow.reached >= 1 ? 1 : 0);
                            }}
                          >
                            Use promotion
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : section === "Transactions" ? (
                <div className="transactions-view">
                  <h3 tabIndex={-1} data-active-heading>
                    My transactions
                  </h3>
                  <section className="transaction-filters">
                    <span className="transaction-filter-label">Dates</span>
                    <div className="transaction-date-fields">
                      <Field
                        label="From"
                        type="date"
                        value={transactionFrom}
                        max={transactionTo}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setTransactionFrom(e.target.value);
                          setTransactionSearchRun(false);
                        }}
                      />
                      <Field
                        label="To"
                        type="date"
                        value={transactionTo}
                        min={transactionFrom}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setTransactionTo(e.target.value);
                          setTransactionSearchRun(false);
                        }}
                      />
                    </div>
                    <Button primary onClick={() => setTransactionSearchRun(true)}>
                      Search
                    </Button>
                  </section>

                  {transactionSearchRun &&
                  (transactions.length || withdrawalSubmitted) ? (
                    <section className="transaction-results" aria-label="Transaction results">
                      {withdrawalSubmitted && selectedWithdrawal && (
                        <div className="transaction">
                          <div>
                            <strong>{selectedWithdrawal.name} withdrawal</strong>
                            <small>WD-0001 · 22 Sep 2026</small>
                          </div>
                          <strong>−{money(withdrawalValue)}</strong>
                          <span className="status-pill">pending</span>
                        </div>
                      )}
                      {transactions
                        .slice()
                        .reverse()
                        .map((t) => (
                          <div className="transaction" key={t.id}>
                            <div>
                              <strong>Card deposit</strong>
                              <small>RG-{String(t.id).padStart(4, "0")} · 22 Sep 2026</small>
                            </div>
                            <strong>{money(t.amount)}</strong>
                            <span className="status-pill">{t.status}</span>
                          </div>
                        ))}
                    </section>
                  ) : transactionSearchRun ? (
                    <div className="transaction-empty">
                      <strong>No transactions in selected date range.</strong>
                      <p>Please select a new date range for different results.</p>
                    </div>
                  ) : (
                    <div className="transaction-empty">
                      <strong>Date range changed.</strong>
                      <p>Select Search to refresh your transactions.</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
          <nav
            className="mobile-nav cashier-mobile-nav"
            aria-label="Main navigation"
          >
            <button
              onClick={() => {
                close();
                setHostPage("My Account");
              }}
            >
              <User size={20} />
              Refer &amp; Earn
            </button>
            <button
              onClick={() => {
                close();
                setHostPage("Tournaments");
              }}
            >
              <Trophy size={20} />
              Tournaments
            </button>
            <button
              className="wallet-nav"
              onClick={() => {
                setSection("Deposit");
                setResult(null);
              }}
            >
              <Wallet size={21} />
              <strong>{money(balance)}</strong>
              Balance
            </button>
            <button
              onClick={() => {
                close();
                setHostPage("Promotions");
              }}
            >
              <Gift size={20} />
              Promotions
            </button>
            <button
              onClick={() => {
                close();
                setHostPage("Inbox");
              }}
            >
              <Inbox size={20} />
              Inbox
            </button>
          </nav>
          </dialog>
        </>
      )}
      {!(open && flow.step === 1 && offer) && debugPanel}
    </>
  );
}
