// @ts-nocheck -- ported from the original Lemma codebase, which used looser type settings

import { useState, type FormEvent } from "react";
import { ArrowRight, Check, Sigma, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setError("");
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMessage("Check your inbox for a secure sign-in link.");
  };
  const continueAsGuest = async () => {
    setGuestLoading(true);
    setError("");
    setMessage("");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setGuestLoading(false);
      setError(result.error.message || "Google sign-in failed.");
      return;
    }
    if (result.redirected) return;
    setGuestLoading(false);
  };
  return (
    <main className="auth-screen">
      <div className="auth-brand">
        <span className="brand-mark">
          <Sigma size={19} />
        </span>
        <span>lemma</span>
      </div>
      <section className="auth-panel">
        <span className="auth-eyebrow">YOUR CS STUDY SPACE</span>
        <h1>
          Pick up where
          <br />
          your thinking left off.
        </h1>
        <p>Your notes, classes, and pages stay yours and follow you between sessions.</p>
        <form onSubmit={submit}>
          <label htmlFor="auth-email">University or personal email</label>
          <div className="auth-input">
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@university.edu"
            />
            <button type="submit" disabled={sending || guestLoading}>
              {sending ? (
                "Sending…"
              ) : (
                <>
                  Continue <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
        <button
          className="guest-sign-in"
          type="button"
          onClick={continueAsGuest}
          disabled={sending || guestLoading}
        >
          {guestLoading ? (
            "Opening Google…"
          ) : (
            <>
              <UserRound size={16} /> Continue with Google
            </>
          )}
        </button>
        {message && (
          <div className="auth-message">
            <Check size={15} />
            {message}
          </div>
        )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <small>You stay signed in on this device.</small>
      </section>
      <div className="auth-equation" aria-hidden="true">
        <span>∑</span>
        <span>f : X → Y</span>
        <span>
          ∫<sub>a</sub>
          <sup>b</sup> f(x) dx
        </span>
        <span>O(n log n)</span>
        <span>∇ × E = −∂B/∂t</span>
      </div>
      <footer>Made for the work between lectures.</footer>
    </main>
  );
}
