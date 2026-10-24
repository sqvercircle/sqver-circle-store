
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError || !data.user) {
        setError("Email ya password sahi nahi hai.");
        return;
      }

      const { data: admin, error: adminError } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (adminError || !admin) {
        await supabase.auth.signOut();
        setError("Is account ko admin access nahi mila hai.");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Login nahi ho paaya. Dobara try karo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f6f1] px-4 py-8 text-[#191919]">
      <section className="w-full max-w-md rounded-xl border border-black/10 bg-white p-7 shadow-sm sm:p-9">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#191919] text-xl font-bold text-white">
            S
          </div>

          <h1 className="text-xl font-bold tracking-[0.12em]">
            SQVER CIRCLE
          </h1>
          <p className="mt-2 text-sm text-black/50">
            Store Admin Login
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium"
            >
              Admin Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              className="w-full rounded-lg border border-black/15 px-4 py-3 outline-none focus:border-black"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-black/15 px-4 py-3 outline-none focus:border-black"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#191919] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#48443c] disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login to Dashboard"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-black/40">
          Authorized administrators only
        </p>
      </section>
    </main>
  );
}
