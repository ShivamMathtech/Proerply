import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { useAction, useWorkspace, services, MODE } from "../hooks";
import {
  Button,
  CourseArt,
  Empty,
  ErrorState,
  Loading,
  Money,
  PageTitle,
  Pill,
} from "../components/ui";
export function Checkout() {
  const { courseId = "" } = useParams();
  const {
    data: c,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => services.courses.getCourse(courseId),
  });
  const [agree, setAgree] = useState(false),
    [busy, setBusy] = useState(false);
  const navigate = useNavigate(),
    act = useAction();
  if (isLoading) return <Loading />;
  if (error || !c) return <ErrorState error={error} retry={refetch} />;
  return (
    <>
      <PageTitle
        title="One step closer to your next skill"
        description="Review your course and complete your enrollment."
      />
      <div className="detail-grid">
        <section className="panel">
          <Pill>
            {MODE === "demo" ? "SIMULATED CHECKOUT" : "SECURE HOSTED CHECKOUT"}
          </Pill>
          <h2 className="space-top">Your learning investment</h2>
          <div className="inline-note">
            {MODE === "demo"
              ? "This is a demo transaction. No payment details are collected and no money will be charged."
              : "Payment details are entered only on the payment provider’s hosted page. Enrollment is granted after the server receives verified payment confirmation."}
          </div>
          <h3>What’s included</h3>
          <ul className="checklist">
            <li>
              <Check size={16} />
              All {c.lessons.length} guided lessons
            </li>
            <li>
              <Check size={16} />
              Practice exercises and assessment
            </li>
            <li>
              <Check size={16} />
              Certificate when completion rules are met
            </li>
          </ul>
          {MODE === "demo" && (
            <Link
              className="btn secondary"
              to={"/payment/add-card?course=" + c.id}
            >
              <CreditCard size={16} />
              Preview payment method screen
            </Link>
          )}
          <hr />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            />
            {MODE === "demo"
              ? "I understand this is a simulated transaction."
              : "I have reviewed the course, its price and the completion requirements."}
          </label>
          <Button
            className="wide space-top"
            disabled={!agree || busy}
            onClick={async () => {
              setBusy(true);
              await act(async () => {
                const order = await services.payments.checkout(c.id);
                if (MODE === "api" && order.url) {
                  const url = new URL(order.url);
                  if (
                    url.protocol !== "https:" ||
                    url.hostname !== "checkout.stripe.com"
                  )
                    throw Error("Unexpected payment provider URL.");
                  location.assign(url.href);
                } else
                  navigate(
                    "/payment/success?course=" + c.id + "&order=" + order.id,
                  );
              });
              setBusy(false);
            }}
          >
            {busy
              ? "Preparing checkout…"
              : MODE === "demo"
                ? "Complete demo enrollment"
                : "Continue to secure checkout"}
            <ArrowRight size={16} />
          </Button>
          <Link className="text-link space-top" to={"/courses/" + c.id}>
            <ArrowLeft size={14} />
            Back to course
          </Link>
        </section>
        <aside className="panel">
          <CourseArt course={c} />
          <h3 className="space-top">{c.title}</h3>
          <p style={{ fontSize: 12, margin: "10px 0" }}>
            {c.category} · {c.level}
          </p>
          <hr />
          <div className="section-title">
            <span>Course price</span>
            <Money value={c.price} />
          </div>
          <div className="section-title">
            <strong>Total · USD</strong>
            <strong>
              <Money value={c.price} />
            </strong>
          </div>
          <p style={{ fontSize: 11 }}>
            A single course purchase. No recurring charges.
          </p>
          <p className="space-top" style={{ fontSize: 10 }}>
            <ShieldCheck
              size={16}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: 6,
              }}
            />
            {MODE === "demo"
              ? "Safe demo: no real card information"
              : "Payment is handled by the configured provider"}
          </p>
        </aside>
      </div>
    </>
  );
}
export function AddCard() {
  const [p] = useSearchParams();
  const navigate = useNavigate();
  const [name, setName] = useState("Alex Morgan"),
    [expiry, setExpiry] = useState("12/30");
  const [error, setError] = useState("");
  if (MODE === "api")
    return (
      <div className="panel celebration">
        <div className="celebration-icon">
          <ShieldCheck size={44} />
        </div>
        <h1>Your card stays with the provider.</h1>
        <p>
          Payment methods are added on secure hosted checkout. Proerply does not
          collect card numbers or CVVs.
        </p>
        <Link
          className="btn primary"
          to={"/checkout/" + (p.get("course") || "design")}
        >
          Continue to checkout
        </Link>
      </div>
    );
  return (
    <div className="panel" style={{ maxWidth: 550, margin: "auto" }}>
      <PageTitle title="Preview a payment method" />
      <div className="inline-note">
        DEMO ONLY. The card number is a fixed test value. Real card numbers and
        CVVs cannot be entered. No payment details are saved.
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
            setError("Enter a sample expiry as MM/YY.");
            return;
          }
          navigate("/checkout/" + (p.get("course") || "design"));
        }}
      >
        <label className="field">
          Sample cardholder name
          <input
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="field">
          Fixed test card
          <input
            readOnly
            value="4242 4242 4242 4242"
            aria-label="Fixed test card number"
          />
        </label>
        <div className="form-grid">
          <label className="field">
            Sample expiry
            <input
              value={expiry}
              maxLength={5}
              onChange={(e) => setExpiry(e.target.value)}
              placeholder="MM/YY"
              required
            />
          </label>
          <label className="field">
            Test CVV
            <input readOnly value="•••" aria-label="Test CVV placeholder" />
          </label>
        </div>
        {error && <p className="field-error">{error}</p>}
        <Button className="wide">
          Use simulated method <ArrowRight size={15} />
        </Button>
      </form>
    </div>
  );
}
export function PaymentSuccess() {
  const [p] = useSearchParams();
  const {
    data: orders,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["orders"],
    queryFn: () => services.payments.orders(),
    refetchInterval: MODE === "api" ? 5000 : false,
  });
  const order = orders?.find(
    (o) => o.id === p.get("order") || o.courseId === p.get("course"),
  );
  const paid =
    order && (order.status === "paid" || order.status === "demo_paid");
  return (
    <div className="panel celebration">
      <div className="celebration-icon">
        <CheckCircle2 size={50} />
      </div>
      <Pill tone={paid ? "green" : "orange"}>
        {paid
          ? MODE === "demo"
            ? "DEMO ENROLLMENT COMPLETE"
            : "PAYMENT CONFIRMED"
          : "CHECKING YOUR ENROLLMENT"}
      </Pill>
      <h1 className="space-top">
        {paid ? "Your next chapter is unlocked." : "Waiting for confirmation."}
      </h1>
      <p>
        {paid
          ? `You’re enrolled in ${order.title}. ${MODE === "demo" ? "This was a simulated transaction. No payment was taken." : "Your payment has been verified by the server."}`
          : "The return URL does not confirm payment. Enrollment appears after the provider’s verified webhook arrives."}
      </p>
      {error && <ErrorState error={error} retry={refetch} />}
      <div className="button-row">
        {paid && (
          <Link
            className="btn primary"
            to={"/learning/" + order.courseId + "/playlist"}
          >
            Start learning <ArrowRight size={16} />
          </Link>
        )}
        <Link className="btn secondary" to="/my-learning">
          My learning
        </Link>
        {!paid && (
          <Button
            variant="ghost"
            disabled={isLoading}
            onClick={() => void refetch()}
          >
            Refresh status
          </Button>
        )}
      </div>
      {paid && (
        <p style={{ fontSize: 10 }}>
          Reference: {order.id} · <Money value={order.amount} />
        </p>
      )}
    </div>
  );
}
