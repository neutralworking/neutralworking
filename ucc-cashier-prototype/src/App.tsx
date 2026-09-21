import { useEffect, useReducer, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
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

const steps = ["Payment Method", "Bonus", "Amount", "Payment Details"];
const games = [
  "Electric Coins 2",
  "Bubble or Broom",
  "777 Football Hit",
  "Coin Blitz 2",
  "Buffalo Power",
  "Book of Gold",
];
const paymentMethods = [
  { id: "card", mark: "▰", name: "Cards", detail: "Visa & Mastercard" },
  { id: "apple", mark: "●", name: "Apple Pay", detail: "Pay with Apple Pay" },
  { id: "google", mark: "G", name: "Google Pay", detail: "Pay with Google Pay" },
  { id: "crypto", mark: "₿", name: "Crypto", detail: "BTC, LTC & USDT" },
  { id: "changelly", mark: "↗", name: "Changelly", detail: "Buy crypto by card" },
  { id: "cashapp", mark: "$", name: "Cash App", detail: "Pay with Cash App" },
  { id: "rewards", mark: "R", name: "Players Rewards Card", detail: "Rewards card" },
] as const;
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

export default function App() {
  const [flow, dispatch] = useReducer(reducer, undefined, initialFlow);
  const [open, setOpen] = useState(false),
    [saved, setSaved] = useState(false),
    [balance, setBalance] = useState(24.5);
  const [card, setCard] = useState<Card>(emptyCard),
    [errors, setErrors] = useState<Record<string, string>>({});
  const [address, setAddress] = useState<Address>(initialAddress),
    [draftAddress, setDraftAddress] = useState<Address>(initialAddress),
    [editingAddress, setEditingAddress] = useState(false);
  const [presets, setPresets] = useState([30, 50, 100]),
    [presetText, setPresetText] = useState("30, 50, 100"),
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
    [amountTouched, setAmountTouched] = useState(false);
  const [section, setSection] = useState("Deposit"),
    [hostPage, setHostPage] = useState("Lobby"),
    [menu, setMenu] = useState(false),
    [search, setSearch] = useState("");
  const [paymentChoice, setPaymentChoice] = useState("card");
  const [receipt, setReceipt] = useState<{
    amount: number;
    bonus: string | null;
  } | null>(null);
  const [transactions, setTransactions] = useState<
    { amount: number; status: Outcome; id: number }[]
  >([]);
  const dialog = useRef<HTMLDialogElement>(null),
    entry = useRef<HTMLElement | null>(null),
    paymentLock = useRef(false),
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
    setPresets([30, 50, 100]);
    setPresetText("30, 50, 100");
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
    setOpen(false);
    setCard(emptyCard());
    setErrors({});
    setEditingAddress(false);
    setDebug(false);
  }
  useEffect(() => {
    if (!open) return;
    const el = dialog.current!;
    el.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
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
  }, [flow.step, section, result, open]);
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
          ? "This coupon is not available. Try SPINFEVER or BANDITS400."
          : "Enter a coupon code.",
      );
      return;
    }
    dispatch({ type: "bonus", code: found.code });
    setCouponError("");
    setCouponOpen(false);
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
    setCard(emptyCard());
    setReceipt({ amount: paidAmount, bonus: flow.bonus ?? null });
    setResult(status);
    setProcessing(false);
    paymentLock.current = false;
  }
  const summary = [
    paymentChoice === "card"
      ? flow.method === "saved"
        ? "Visa •••• 4242"
        : "Cards"
      : paymentMethods.find((method) => method.id === paymentChoice)?.name ??
        "Payment method",
    flow.bonus === undefined
      ? "Choose an offer"
      : (flow.bonus ?? "Without a bonus"),
    amountIssue ? "Amount needs attention" : money(Number(flow.amount)),
    "Review & deposit",
  ];
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
                  setCard(emptyCard());
                  setErrors({});
                }}
              >
                <option value="new">New card</option>
                <option value="saved">Saved Visa</option>
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
      <div className="app-shell">
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
          <label className="search">
            <Search size={16} />
            <input
              aria-label="Search games"
              placeholder="Search games"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setHostPage("Lobby");
              }}
            />
          </label>
          <nav>
            {[
              ["Popular Slots", Home],
              ["New Games", Layers],
              ["Table Games", CreditCard],
              ["Video Poker", Layers],
              ["Specialty", Gift],
              ["Crash Games", Trophy],
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
            <button onClick={() => setHostPage("VIP Program")}>VIP Program</button>
            <button onClick={() => setHostPage("Banking")}>Banking</button>
            <button onClick={() => setHostPage("Support")}>Support</button>
          </div>
        </aside>
        <div className="host">
          <header className="host-header">
            <div className="mobile-brand"><img src="/reels-grande-logo.svg" alt="Reels Grande" /></div>
            <span className="desktop-label">CASINO GAMES</span>
            <div className="header-actions">
              <button className="top-promotion" onClick={() => setHostPage("Promotions")}><Gift size={14} /> Promotions</button>
              <Button onClick={() => setHostPage("My Account")}>Log in</Button>
              <Button primary aria-label="Deposit" onClick={() => launch()}>Cashier</Button>
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
            {hostPage === "Lobby" || hostPage === "Popular Slots" || hostPage === "New Games" ||
            hostPage === "Promotions" ||
            hostPage === "Slots" || hostPage === "Table Games" || hostPage === "Video Poker" || hostPage === "Specialty" || hostPage === "Crash Games" ? (
              <>
                <section className="promo">
                  <div className="promo-copy">
                    <span className="eyebrow">WELCOME OFFER</span>
                    <h2>GET 150%<br />NO RULES BONUS</h2>
                    <p>Take all your winnings home. No limits.</p>
                    <Button primary aria-label="Claim offer" onClick={() => launch("SPINFEVER")}>
                      CLAIM NOW
                    </Button>
                  </div>
                  <div className="promo-art" aria-hidden="true">
                    <div className="coin coin-one">$</div>
                    <div className="slot-machine"><span>7</span><span>7</span><span>7</span></div>
                    <div className="coin coin-two">$</div>
                  </div>
                </section>
                <div className="carousel-dots" aria-hidden="true"><i></i><i></i><i></i></div>
                <div className="categories">
                  {[
                    ["Our Popular Picks", "♠"],
                    ["Video Slots", "▦"],
                    ["Card Games", "▰"],
                    ["Specialty Games", "★"],
                    ["Jackpots", "♛"],
                    ["All Games", "⊞"],
                  ].map(([n, icon]) => (
                    <button
                      key={n}
                      className={search === n ? "active" : ""}
                      onClick={() => setSearch(search === n ? "" : n)}
                    >
                      <span aria-hidden="true">{icon}</span>{n}
                    </button>
                  ))}
                </div>
                <div className="row">
                  <h2 className="game-row-title">
                    {search &&
                    !["Our Popular Picks", "Video Slots", "Card Games", "Specialty Games", "Jackpots", "All Games"].includes(
                      search,
                    )
                      ? "Search results"
                      : "Hottest Slots"}
                  </h2>
                  <button className="view-all">ALL <ChevronRight size={13} /></button>
                </div>
                <div className="games">
                  {games
                    .filter(
                      (g) =>
                        !search ||
                        [
                          "Our Popular Picks",
                          "Video Slots",
                          "Card Games",
                          "Specialty Games",
                          "Jackpots",
                          "All Games",
                        ].includes(search) ||
                        g.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((g, i) => (
                      <article className="game" key={g}>
                        <div className={`game-art art-${i}`} aria-hidden="true">
                          <span>{["COINS", "BROOM", "777", "BLITZ", "BUFFALO", "GOLD"][i]}</span>
                        </div>
                        <strong>{g}</strong>
                        <span>{["FUGASO", "PLAYNETIC", "BF GAMES", "FUGASO", "PLAYSON", "BETSOFT"][i]}</span>
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
            <footer className="host-footer">18+ · Play responsibly</footer>
          </main>
        </div>
        <nav className="mobile-nav">
          <button onClick={() => setHostPage("Lobby")}>
            <Home size={20} />
            Lobby
          </button>
          <button onClick={() => setHostPage("Promotions")}>
            <Gift size={20} />
            Promos
          </button>
          <button className="wallet-nav" onClick={() => launch()}>
            <Wallet size={21} />
            {money(balance)}
          </button>
          <button onClick={() => setHostPage("Inbox")}>
            <Inbox size={20} />
            Inbox
          </button>
          <button onClick={() => setHostPage("My Account")}>
            <User size={20} />
            Account
          </button>
        </nav>
      </div>
      {!open && debugPanel}
      {open && (
        <dialog
          ref={dialog}
          aria-labelledby="cashier-title"
          onCancel={(e) => {
            e.preventDefault();
            close();
          }}
          className="cashier-dialog"
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
            <div>
              <span className="eyebrow">REELS GRANDE</span>
              <h2 id="cashier-title">Cashier</h2>
            </div>
            <div className="cashier-balance">
              <span>Cash balance</span>
              <strong>{money(balance)}</strong>
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
                  <div className="content-intro">
                    <h3>Make a deposit</h3>
                    <span>USD</span>
                  </div>
                  <fieldset disabled={processing} className="flow-fields">
                    {steps.map((title, index) => {
                      const i = index as Step,
                        active = flow.step === i,
                        completed =
                          flow.reached > i && !(i === 2 && amountIssue);
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
                                  <div className="payment-groups" aria-label="Payment categories">
                                    <button className="active">Cards</button>
                                    <button>Crypto</button>
                                    <button>Other</button>
                                  </div>
                                  <div className="crypto-banner">
                                    <strong>Fast deposits with crypto</strong>
                                    <span>Choose Crypto, Changelly or Bitcoin Lightning.</span>
                                  </div>
                                  <div className="method-grid">
                                    {saved && (
                                      <button
                                        className={`choice ${flow.method === "saved" ? "chosen" : ""}`}
                                        aria-pressed={flow.method === "saved"}
                                        onClick={() => {
                                          dispatch({
                                            type: "method",
                                            method: "saved",
                                          });
                                          setPaymentChoice("card");
                                          setCard(emptyCard());
                                        }}
                                      >
                                        <span className="visa">VISA</span>
                                        <strong>Visa •••• 4242</strong>
                                        <small>Last used · expires 12/30</small>
                                        <span className="choice-check">
                                          {flow.method === "saved" ? (
                                            <Check size={15} />
                                          ) : null}
                                        </span>
                                      </button>
                                    )}
                                    {paymentMethods.map((method) => (
                                      <button
                                        key={method.id}
                                        className={`choice method-choice ${paymentChoice === method.id && flow.method === "new" ? "chosen" : ""}`}
                                        aria-pressed={paymentChoice === method.id && flow.method === "new"}
                                        onClick={() => {
                                          dispatch({ type: "method", method: "new" });
                                          setPaymentChoice(method.id);
                                          setCard(emptyCard());
                                        }}
                                      >
                                        <span className="method-mark" aria-hidden="true">{method.mark}</span>
                                        <strong>{saved && method.id === "card" ? "Use a different card" : method.name}</strong>
                                        <small>{method.detail}</small>
                                        <span className="choice-check">
                                          {paymentChoice === method.id && flow.method === "new" ? <Check size={15} /> : null}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                  <div className="actions">
                                    <Button
                                      primary
                                      onClick={() =>
                                        dispatch({ type: "advance" })
                                      }
                                    >
                                      Continue & pick a bonus{" "}
                                      <ArrowRight size={16} />
                                    </Button>
                                  </div>
                                </>
                              )}
                              {i === 1 && (
                                <>
                                  {offer ? (
                                    <div className="active-offer">
                                      <div className="row">
                                        <span className="eyebrow">
                                          ACTIVE COUPON
                                        </span>
                                        <span className="status-pill">
                                          <Check size={13} />
                                          Selected
                                        </span>
                                      </div>
                                      <h3>{offer.code}</h3>
                                      <strong>{offer.title}</strong>
                                      <p>
                                        Minimum deposit {money(offer.minimum)}
                                      </p>
                                      <button
                                        className="text-button"
                                        onClick={() =>
                                          setTerms(
                                            terms === offer.code
                                              ? null
                                              : offer.code,
                                          )
                                        }
                                      >
                                        {terms === offer.code
                                          ? "Hide details"
                                          : "See more details"}
                                      </button>
                                      {terms === offer.code && (
                                        <p className="terms">{offer.terms}</p>
                                      )}
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
                                        <button
                                          className="text-button cancel-link"
                                          onClick={() => setCancelCoupon(true)}
                                        >
                                          Cancel coupon
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <>
                                      <p className="muted">
                                        Pick a little extra, or keep it simple.
                                      </p>
                                      <div className="offers">
                                        {offers.map((o) => (
                                          <article
                                            className="offer"
                                            key={o.code}
                                          >
                                            <div className="offer-icon">
                                              <Gift size={21} />
                                            </div>
                                            <div className="offer-copy">
                                              <span className="eyebrow">
                                                {o.code}
                                              </span>
                                              <h3>{o.title}</h3>
                                              <p>
                                                Min. deposit {money(o.minimum)}
                                              </p>
                                              <button
                                                className="text-button"
                                                onClick={() =>
                                                  setTerms(
                                                    terms === o.code
                                                      ? null
                                                      : o.code,
                                                  )
                                                }
                                                aria-label={`Details for ${o.code}`}
                                              >
                                                Offer details
                                              </button>
                                              {terms === o.code && (
                                                <p className="terms">
                                                  {o.terms}
                                                </p>
                                              )}
                                            </div>
                                            <Button
                                              onClick={() => {
                                                dispatch({
                                                  type: "bonus",
                                                  code: o.code,
                                                });
                                                setTerms(null);
                                              }}
                                            >
                                              Select
                                            </Button>
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
                                        <Gift size={17} />I have a coupon code{" "}
                                        <ChevronDown size={15} />
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
                                    <Button onClick={() => go(0)}>Back</Button>
                                    {offer ? (
                                      <Button
                                        primary
                                        onClick={() =>
                                          dispatch({ type: "advance" })
                                        }
                                      >
                                        Continue <ArrowRight size={16} />
                                      </Button>
                                    ) : (
                                      <Button
                                        primary
                                        onClick={() => {
                                          dispatch({
                                            type: "bonus",
                                            code: null,
                                          });
                                          dispatch({ type: "advance" });
                                        }}
                                      >
                                        Deposit without bonus{" "}
                                        <ArrowRight size={16} />
                                      </Button>
                                    )}
                                  </div>
                                </>
                              )}
                              {i === 2 && (
                                <>
                                  <p className="muted">
                                    How much would you like to deposit?
                                  </p>
                                  {offer && (
                                    <div className="notice">
                                      <Gift size={17} />
                                      <span>
                                        {offer.code} · minimum{" "}
                                        {money(offer.minimum)}
                                      </span>
                                    </div>
                                  )}
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
                                        {money(n).replace(".00", "")}
                                      </button>
                                    ))}
                                  </div>
                                  <Field
                                    label={
                                      presets.includes(Number(flow.amount))
                                        ? "Deposit amount (USD)"
                                        : "Custom amount (USD)"
                                    }
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
                                  <small className="muted">
                                    {money(Math.max(10, offer?.minimum ?? 0))}{" "}
                                    minimum · $2,000 maximum
                                  </small>
                                  <div className="actions">
                                    <Button onClick={() => go(1)}>Back</Button>
                                    <Button
                                      primary
                                      onClick={() => {
                                        setAmountTouched(true);
                                        if (!amountIssue)
                                          dispatch({ type: "advance" });
                                      }}
                                    >
                                      Continue <ArrowRight size={16} />
                                    </Button>
                                  </div>
                                </>
                              )}
                              {i === 3 && (
                                <>
                                  <div className="payment-summary">
                                    <div>
                                      <span>Deposit</span>
                                      <strong>
                                        {money(Number(flow.amount) || 0)}
                                      </strong>
                                    </div>
                                    <div>
                                      <span>Bonus</span>
                                      <strong>
                                        {offer?.code ?? "No bonus"}
                                      </strong>
                                    </div>
                                    <button
                                      className="text-button"
                                      onClick={() => go(2)}
                                    >
                                      Edit amount
                                    </button>
                                  </div>
                                  {amountIssue && (
                                    <p role="alert" className="error">
                                      {amountIssue}
                                    </p>
                                  )}
                                  {paymentChoice === "card" && <div className="demo-notice">
                                    <button
                                      className="text-button"
                                      aria-label="Fill demo details"
                                      onClick={() => {
                                        setCard({
                                          number: "4242 4242 4242 4242",
                                          expiry: "12/30",
                                          cvv: "123",
                                          name: "Alex Morgan",
                                        });
                                        setErrors({});
                                      }}
                                      >
                                      Fill card details
                                    </button>
                                  </div>}
                                  {paymentChoice !== "card" ? (
                                    <div className="provider-handoff">
                                      <span className="method-mark">{paymentMethods.find((method) => method.id === paymentChoice)?.mark}</span>
                                      <div>
                                        <strong>{paymentMethods.find((method) => method.id === paymentChoice)?.name}</strong>
                                        <p>You’ll continue securely with this payment provider.</p>
                                      </div>
                                    </div>
                                  ) : flow.method === "new" ? (
                                    <>
                                      <Field
                                        label="Name on card"
                                        value={card.name}
                                        autoComplete="off"
                                        error={errors.name}
                                        onChange={(
                                          e: React.ChangeEvent<HTMLInputElement>,
                                        ) => changeCard("name", e.target.value)}
                                      />
                                      <Field
                                        label="Card number"
                                        inputMode="numeric"
                                        autoComplete="off"
                                        placeholder="4242 4242 4242 4242"
                                        maxLength={23}
                                        value={card.number}
                                        error={errors.number}
                                        onChange={(
                                          e: React.ChangeEvent<HTMLInputElement>,
                                        ) =>
                                          changeCard("number", e.target.value)
                                        }
                                      />
                                    </>
                                  ) : (
                                    <div className="saved-summary">
                                      <span className="visa">VISA</span>
                                      <strong>Visa ending in 4242</strong>
                                      <button
                                        className="text-button"
                                        onClick={() => go(0)}
                                      >
                                        Change card
                                      </button>
                                    </div>
                                  )}
                                  {paymentChoice === "card" && <div className="form-row">
                                    {flow.method === "new" && (
                                      <Field
                                        label="Expiry date"
                                        placeholder="MM/YY"
                                        inputMode="numeric"
                                        maxLength={5}
                                        autoComplete="off"
                                        value={card.expiry}
                                        error={errors.expiry}
                                        onChange={(
                                          e: React.ChangeEvent<HTMLInputElement>,
                                        ) =>
                                          changeCard("expiry", e.target.value)
                                        }
                                      />
                                    )}
                                    <Field
                                      label="Security code"
                                      type="password"
                                      inputMode="numeric"
                                      placeholder="123"
                                      maxLength={4}
                                      autoComplete="off"
                                      value={card.cvv}
                                      error={errors.cvv}
                                      onChange={(
                                        e: React.ChangeEvent<HTMLInputElement>,
                                      ) => changeCard("cvv", e.target.value)}
                                    />
                                  </div>}
                                  {paymentChoice === "card" && <div className="billing">
                                    <div className="row">
                                      <strong>Billing address</strong>
                                      {!editingAddress && (
                                        <button
                                          className="text-button"
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
                                        {address.city}, {address.region}{" "}
                                        {address.zip} · {address.country}
                                      </p>
                                    )}
                                  </div>}
                                  {errors.address && (
                                    <p role="alert" className="error">
                                      {errors.address}
                                    </p>
                                  )}
                                  <div className="actions">
                                    <Button onClick={() => go(2)}>Back</Button>
                                    <Button
                                      primary
                                      disabled={processing}
                                      onClick={pay}
                                    >
                                      {processing
                                        ? "Processing…"
                                        : `Deposit ${money(Number(flow.amount) || 0)}`}
                                      <LockKeyhole size={15} />
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </section>
                      );
                    })}
                  </fieldset>
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
                        ? "Your balance has not changed. Check your details and try again."
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
                  <div className="actions">
                    {result === "declined" ? (
                      <Button
                        primary
                        onClick={() => {
                          setResult(null);
                          go(3);
                        }}
                      >
                        Retry by card
                      </Button>
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
              ) : section === "Coupons" ? (
                <>
                  <h3 tabIndex={-1} data-active-heading>
                    Your coupons
                  </h3>
                  <p className="muted">
                    Choose a coupon in your deposit journey.
                  </p>
                  {offers.map((o) => (
                    <article className="offer" key={o.code}>
                      <div className="offer-copy">
                        <strong>{o.code}</strong>
                        <p>
                          {o.title} · Min. {money(o.minimum)}
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          setResult(null);
                          dispatch({ type: "bonus", code: o.code });
                          setSection("Deposit");
                          go(flow.reached >= 1 ? 1 : 0);
                        }}
                      >
                        Use coupon
                      </Button>
                    </article>
                  ))}
                </>
              ) : section === "Transactions" ? (
                <>
                  <h3 tabIndex={-1} data-active-heading>
                    Transactions
                  </h3>
                  <p className="muted">This session’s deposit activity</p>
                  {transactions.length ? (
                    transactions
                      .slice()
                      .reverse()
                      .map((t) => (
                        <div className="transaction" key={t.id}>
                          <div>
                            <strong>Card deposit</strong>
                            <small>RG-{String(t.id).padStart(4, "0")}</small>
                          </div>
                          <strong>{money(t.amount)}</strong>
                          <span className="status-pill">{t.status}</span>
                        </div>
                      ))
                  ) : (
                    <div className="empty-state">
                      No deposits yet. Your first deposit will appear here.
                    </div>
                  )}
                  <Button onClick={() => setSection("Deposit")}>
                    Return to deposit
                  </Button>
                </>
              ) : (
                <>
                  <h3 tabIndex={-1} data-active-heading>
                    Withdraw
                  </h3>
                  <p>Withdrawal options will appear here.</p>
                  <Button onClick={() => setSection("Deposit")}>
                    Return to deposit
                  </Button>
                </>
              )}
            </div>
          </div>
          {debugPanel}
        </dialog>
      )}
    </>
  );
}
