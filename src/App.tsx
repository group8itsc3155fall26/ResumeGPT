import { FormEvent, useEffect, useState } from "react";

type Mode = "login" | "create";

export default function App() {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [accountCreated, setAccountCreated] = useState(false);

  useEffect(() => {
    if (!accountCreated) {
      return;
    }

    const redirectTimer = window.setTimeout(() => {
      window.location.assign("/homepage.html");
    }, 3000);

    return () => window.clearTimeout(redirectTimer);
  }, [accountCreated]);

  const changeMode = (nextMode: Mode) => {
    setMode(nextMode);
    setConfirmPassword("");
    setError("");
    setMessage("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!username.trim()) {
      setError("Enter your username to continue.");
      return;
    }

    if (password.length < 6) {
      setError("Your password must contain at least 6 characters.");
      return;
    }

    if (mode === "create" && password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    window.localStorage.setItem("resumegptUsername", username.trim());

    if (mode === "create") {
      setAccountCreated(true);
      return;
    }

    window.location.assign("/homepage.html");
  };

  const handleRecovery = () => {
    setError("");
    setMessage(
      username.trim()
        ? `Recovery instructions are ready for ${username.trim()}.`
        : "Enter your username first, then request recovery instructions.",
    );
  };

  if (accountCreated) {
    return (
      <main
        aria-live="assertive"
        className="grid min-h-screen place-items-center bg-ink px-6 text-center text-white"
      >
        <div>
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-charlotte-gold text-3xl font-bold text-ink">
            ✓
          </div>
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Account created successfully
          </h1>
          <p className="mt-3 text-white/60">Taking you to your homepage...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-canvas text-ink lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-28 -top-28 size-96 rounded-full border border-charlotte-gold/20" />
        <div className="absolute -right-14 -top-14 size-64 rounded-full border border-charlotte-gold/20" />
        <div className="relative flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-charlotte-gold font-bold text-ink">
            R
          </div>
          <span className="text-lg font-semibold tracking-tight">ResumeGPT</span>
        </div>

        <div className="relative max-w-xl py-16">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-charlotte-gold">
            Your experience, clearly told
          </p>
          <h1 className="font-display text-6xl font-semibold leading-[1.04] tracking-[-0.04em] xl:text-7xl">
            Make every word earn its place.
          </h1>
          <p className="mt-7 max-w-md text-lg leading-8 text-white/60">
            Turn your experience into a focused resume built for the role you
            want next.
          </p>
        </div>

        <div className="relative border-t border-white/10 pt-6 text-sm text-white/40">
          Thoughtful writing. Professional results.
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
        <div className="w-full max-w-md">
          <div className="mb-12 flex items-center gap-3 lg:hidden">
            <div className="grid size-10 place-items-center rounded-xl bg-accent font-bold text-white">
              R
            </div>
            <span className="text-lg font-semibold tracking-tight">ResumeGPT</span>
          </div>

          <p className="text-sm font-semibold text-accent">
            {mode === "login" ? "Welcome back" : "Start building"}
          </p>
          <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {mode === "login" ? "Log in to your account" : "Create your account"}
          </h2>
          <p className="mt-4 leading-7 text-muted">
            {mode === "login"
              ? "Continue where you left off."
              : "Create an account and start your first resume."}
          </p>

          <form className="mt-9 space-y-5" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="mb-2 block text-sm font-semibold" htmlFor="username">
                Username
              </label>
              <input
                autoComplete="username"
                className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3.5 outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-4 focus:ring-accent/10"
                id="username"
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter your username"
                type="text"
                value={username}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-semibold" htmlFor="password">
                  Password
                </label>
                {mode === "login" && (
                  <button
                    className="text-sm font-semibold text-accent hover:underline focus:outline-none focus:ring-2 focus:ring-accent/30"
                    onClick={handleRecovery}
                    type="button"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  className="w-full rounded-xl border border-ink/15 bg-white py-3.5 pl-4 pr-16 outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-4 focus:ring-accent/10"
                  id="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  className="absolute inset-y-0 right-4 text-sm font-semibold text-muted hover:text-ink focus:outline-none"
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {mode === "create" && (
              <div>
                <label
                  className="mb-2 block text-sm font-semibold"
                  htmlFor="confirm-password"
                >
                  Confirm password
                </label>
                <input
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3.5 outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-4 focus:ring-accent/10"
                  id="confirm-password"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Enter your password again"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                />
              </div>
            )}

            {(error || message) && (
              <p
                aria-live="polite"
                className={`rounded-xl px-4 py-3 text-sm ${
                  error
                    ? "bg-red-50 text-red-700"
                    : "bg-accent/10 text-accent"
                }`}
              >
                {error || message}
              </p>
            )}

            <button
              className="w-full rounded-xl bg-accent px-5 py-3.5 font-semibold text-white shadow-[0_10px_30px_rgba(0,80,53,0.22)] transition hover:-translate-y-0.5 hover:bg-accent-dark focus:outline-none focus:ring-4 focus:ring-accent/20"
              type="submit"
            >
              {mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>

          <div className="mt-7 text-center text-sm text-muted">
            {mode === "login" ? "New to ResumeGPT?" : "Already have an account?"}{" "}
            <button
              className="font-semibold text-ink underline decoration-ink/20 underline-offset-4 hover:decoration-ink focus:outline-none"
              onClick={() => changeMode(mode === "login" ? "create" : "login")}
              type="button"
            >
              {mode === "login" ? "Create account" : "Log in"}
            </button>
          </div>

          <p className="mt-10 border-t border-ink/10 pt-6 text-center text-xs leading-5 text-muted">
            Your profile name may be shared with ResumeGPT. Never submit
            passwords you use elsewhere.{" "}
            <button
              className="underline underline-offset-2 hover:text-ink focus:outline-none"
              onClick={() =>
                setMessage(
                  "Your login details stay in this demo and are not sent anywhere.",
                )
              }
              type="button"
            >
              Learn how we handle your data
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
