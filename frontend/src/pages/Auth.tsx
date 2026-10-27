import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Bell, Check, Eye, EyeOff } from "lucide-react";
import { useAction, useWorkspace, services, MODE } from "../hooks";
import { Button, Toast } from "../components/ui";
import { HeroArt } from "./Discovery";
const schema = z.object({
  name: z.string().optional(),
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters.").max(128),
  confirm: z.string().optional(),
});
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout">
      <aside className="auth-aside">
        <Link to="/home" className="brand">
          <span className="brand-mark">p</span>proerply.
        </Link>
        <div>
          <HeroArt />
          <h2>
            Good things happen
            <br />
            when you stay curious.
          </h2>
          <p>
            Thoughtful courses. Inspiring people. A learning journey that feels
            like your own.
          </p>
        </div>
        <p style={{ fontSize: 11 }}>Learn today. Build tomorrow.</p>
      </aside>
      <main className="auth-main">
        <div className="auth-card">{children}</div>
      </main>
      <Toast />
    </div>
  );
}
export function AuthPage({ variant = "login" }: { variant?: string }) {
  const signup = variant === "signup";
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const act = useAction();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const submit = handleSubmit(async (values) => {
    setError("");
    if (
      signup &&
      (!values.name?.trim() || values.password !== values.confirm)
    ) {
      setError(
        !values.name?.trim()
          ? "Enter your full name."
          : "Your passwords do not match.",
      );
      return;
    }
    setBusy(true);
    try {
      if (signup)
        await services.auth.register(
          values.name!,
          values.email,
          values.password,
        );
      else await services.auth.login(values.email, values.password);
      await act(async () => true);
      navigate(signup ? "/onboarding/1" : "/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  });
  return (
    <AuthShell>
      {MODE === "demo" && (
        <span className="demo-chip">
          BROWSER-LOCAL DEMO · MOCK AUTHENTICATION
        </span>
      )}
      <h1>{signup ? "A new chapter starts here." : "Welcome back."}</h1>
      <p>
        {signup
          ? "Create your learning profile and follow your curiosity."
          : "Your next idea is waiting for you. Let’s pick up where you left off."}
      </p>
      <form onSubmit={submit} noValidate>
        {signup && (
          <label className="field">
            Full name
            <input
              autoComplete="name"
              {...register("name")}
              placeholder="Alex Morgan"
              maxLength={80}
            />
          </label>
        )}
        <label className="field">
          Email address
          <input
            autoComplete="email"
            type="email"
            {...register("email")}
            placeholder="you@example.com"
          />
          {errors.email && (
            <span className="field-error">{errors.email.message}</span>
          )}
        </label>
        <label className="field">
          Password
          <div className="password-wrap">
            <input
              autoComplete={signup ? "new-password" : "current-password"}
              type={show ? "text" : "password"}
              {...register("password")}
              placeholder="At least 8 characters"
            />
            <button
              className="icon-btn"
              type="button"
              onClick={() => setShow(!show)}
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <span className="field-error">{errors.password.message}</span>
          )}
        </label>
        {signup && (
          <label className="field">
            Confirm password
            <input
              type={show ? "text" : "password"}
              autoComplete="new-password"
              {...register("confirm")}
              placeholder="Enter your password again"
            />
          </label>
        )}
        {!signup && (
          <div style={{ textAlign: "right", margin: "-4px 0 24px" }}>
            <Link className="text-link" to="/forgot-password">
              Forgot password?
            </Link>
          </div>
        )}
        {error && (
          <div
            className="field-error"
            role="alert"
            style={{ marginBottom: 15 }}
          >
            {error}
          </div>
        )}
        <Button className="wide" disabled={busy} type="submit">
          {busy ? "Just a moment…" : signup ? "Create account" : "Sign in"}
          <ArrowRight size={16} />
        </Button>
      </form>
      <div className="auth-foot">
        {signup ? "Already learning with us?" : "New to Proerply?"}{" "}
        <Link to={signup ? "/login" : "/signup"}>
          {signup ? "Sign in" : "Create an account"}
        </Link>
      </div>
      {MODE === "demo" && (
        <>
          <div className="auth-divider">OR TAKE A LOOK AROUND</div>
          <div className="demo-accounts">
            {[
              ["learner", "Explore as a learner"],
              ["instructor", "Open instructor studio"],
              ["admin", "Open admin studio"],
            ].map(([role, label]) => (
              <Button
                variant="secondary"
                key={role}
                onClick={() =>
                  act(async () => {
                    await services.auth.login(
                      role + "@proerply.demo",
                      "DemoPass123!",
                    );
                    navigate(role === "learner" ? "/home" : "/admin");
                  })
                }
              >
                {label}
                <ArrowRight size={14} />
              </Button>
            ))}
          </div>
          <p style={{ fontSize: 10, marginTop: 15 }}>
            Demo profiles use mock authentication. Passwords are not stored or
            checked beyond format. Don’t enter a real password.
          </p>
        </>
      )}
    </AuthShell>
  );
}
export function ResetFlow({ variant = "forgot" }: { variant?: string }) {
  const [params] = useSearchParams();
  const navigate = useNavigate(),
    act = useAction();
  const [email, setEmail] = useState(params.get("email") || "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await act(
      async () => {
        if (variant === "forgot") {
          const r = await services.auth.forgot(email);
          navigate(
            "/verify-code?email=" +
              encodeURIComponent(email) +
              "&message=" +
              encodeURIComponent(r.message),
          );
        } else if (variant === "verify") {
          const r = await services.auth.verify(email, code);
          navigate("/reset-password", { state: { token: r.token } });
          sessionStorage.setItem("proerply-reset-token", r.token);
        } else {
          if (password !== confirm) throw Error("Passwords do not match.");
          await services.auth.reset(
            sessionStorage.getItem("proerply-reset-token") || "",
            password,
          );
          sessionStorage.removeItem("proerply-reset-token");
          navigate("/login");
        }
      },
      variant === "reset"
        ? "Password reset completed. Sign in to continue."
        : undefined,
    );
    setBusy(false);
  }
  return (
    <AuthShell>
      <Link to="/login" className="text-link" style={{ marginBottom: 30 }}>
        <ArrowLeft size={15} />
        Back to sign in
      </Link>
      <h1>
        {variant === "forgot"
          ? "Let’s get you back in."
          : variant === "verify"
            ? "Check your reset code."
            : "A fresh start."}
      </h1>
      <p>
        {variant === "forgot"
          ? "Enter your account email to begin password recovery."
          : variant === "verify"
            ? params.get("message") ||
              "Enter the verification code from your configured delivery method."
            : "Choose a password with at least eight characters."}
      </p>
      {MODE === "demo" && (
        <div className="inline-note">
          Demo reset only. No email is sent. Verification code:{" "}
          <strong>123456</strong>.
        </div>
      )}
      <form onSubmit={submit}>
        {variant === "forgot" ? (
          <label className="field">
            Email address
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        ) : variant === "verify" ? (
          <label className="field">
            6-digit verification code
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </label>
        ) : (
          <>
            <label className="field">
              New password
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className="field">
              Confirm password
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
          </>
        )}
        <Button className="wide" disabled={busy}>
          {busy
            ? "Please wait…"
            : variant === "forgot"
              ? "Continue"
              : variant === "verify"
                ? "Verify code"
                : "Save new password"}
          <ArrowRight size={15} />
        </Button>
      </form>
    </AuthShell>
  );
}
const slides = [
  [
    "Make room for your next big idea.",
    "Discover thoughtfully crafted courses that turn curiosity into confidence.",
  ],
  [
    "Learn a little. Build a lot.",
    "Practice with guided lessons, small exercises, and assessments that help the ideas stick.",
  ],
  [
    "Your people. Your pace.",
    "Meet instructors, ask a question, and make a learning routine that works for you.",
  ],
  [
    "Small steps. Real progress.",
    "Track your growth, earn badges, and celebrate each completed chapter.",
  ],
];
export function Onboarding({ variant = "1" }: { variant?: string }) {
  const step = Math.max(1, Math.min(4, Number(variant)));
  const navigate = useNavigate(),
    act = useAction();
  const { data: s } = useWorkspace();
  async function finish() {
    if (s?.user) await act(() => services.profile.update({ onboarding: true }));
    navigate(s?.user ? "/notifications" : "/signup");
  }
  return (
    <AuthShell>
      <div className="section-title">
        <span className="muted" style={{ fontSize: 11 }}>
          YOUR JOURNEY · {step} OF 4
        </span>
        <button className="text-link" onClick={finish}>
          Skip for now
        </button>
      </div>
      <div className="onboarding-art">
        <HeroArt />
      </div>
      <div className="onboarding-copy">
        <h1>{slides[step - 1][0]}</h1>
        <p>{slides[step - 1][1]}</p>
      </div>
      <div className="step-dots">
        {slides.map((_, i) => (
          <Link
            key={i}
            to={"/onboarding/" + (i + 1)}
            className={step === i + 1 ? "active" : ""}
            aria-label={"Onboarding step " + (i + 1)}
          />
        ))}
      </div>
      <div className="button-row">
        {step > 1 && (
          <Link className="btn secondary" to={"/onboarding/" + (step - 1)}>
            <ArrowLeft size={16} />
            Back
          </Link>
        )}
        <Button
          style={{ flex: 1 }}
          onClick={() =>
            step === 4 ? finish() : navigate("/onboarding/" + (step + 1))
          }
        >
          {step === 4 ? "Let’s get started" : "Continue"}
          <ArrowRight size={16} />
        </Button>
      </div>
    </AuthShell>
  );
}
export function Notifications() {
  const { data: s } = useWorkspace();
  const act = useAction();
  const [permission, setPermission] = useState(
    "Notification" in window ? Notification.permission : "unsupported",
  );
  async function enable() {
    await act(async () => {
      if (!("Notification" in window))
        throw Error(
          "This browser does not support notifications. Your reminders are still available in the app.",
        );
      const p = await Notification.requestPermission();
      setPermission(p);
      await services.notifications.save(p === "granted");
      if (p !== "granted")
        throw Error(
          "Notifications were not enabled. You can change permission in your browser settings.",
        );
    }, "Notifications enabled while Proerply is open.");
  }
  return (
    <div className="panel celebration">
      <div className="celebration-icon">
        <Bell size={43} />
      </div>
      <h1>A gentle nudge to keep growing.</h1>
      <p>
        Allow notifications for study reminders while Proerply is open. You can
        always find and manage reminders in your workspace.
      </p>
      <div className="inline-note">
        Browser permission: {permission}. Reminders do not run after the app is
        closed.
      </div>
      <div className="button-row">
        <Button
          onClick={enable}
          disabled={permission === "granted" && !!s?.user?.notifications}
        >
          {permission === "granted" && s?.user?.notifications
            ? "Notifications enabled"
            : "Enable notifications"}
        </Button>
        <Link className="btn secondary" to="/home">
          Maybe later
        </Link>
      </div>
      {s?.user?.notifications && (
        <Button
          variant="ghost"
          className="space-top"
          onClick={() =>
            act(
              () => services.notifications.save(false),
              "In-app notifications paused.",
            )
          }
        >
          Pause app reminders
        </Button>
      )}
    </div>
  );
}
