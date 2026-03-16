"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

type AdminLoginFormProps = {
  adminConfigured: boolean;
};

export function AdminLoginForm({ adminConfigured }: AdminLoginFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      setMessage("");

      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password })
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(payload.error ?? "Unable to sign in.");
        return;
      }

      setPassword("");
      router.refresh();
    });
  }

  return (
    <div className="admin-login-shell">
      <section className="panel admin-login-card">
        <div className="panel__header">
          <p className="panel__eyebrow">Commissioner Access</p>
          <h1>Admin sign-in</h1>
          <p className="panel__description">
            Use the shared password to update both brackets, ESPN links, payout
            copy, and leaderboard sources.
          </p>
        </div>
        {!adminConfigured ? (
          <div className="empty-state">
            Set `ADMIN_PASSWORD` in `.env.local` to unlock the admin area.
          </div>
        ) : (
          <form className="admin-form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span>Shared password</span>
              <input
                className="text-input"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>
            {message ? <p className="form-message is-error">{message}</p> : null}
            <button className="cta-button" disabled={isPending} type="submit">
              {isPending ? "Signing in..." : "Enter admin"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
