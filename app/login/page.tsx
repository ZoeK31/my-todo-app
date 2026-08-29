"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { AuthCard } from "@/components/auth/AuthCard";
import {
  inputClassName,
  labelClassName,
  linkClassName,
  primaryButtonClassName,
} from "@/components/auth/formStyles";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.code === "invalid_credentials") {
        setErrorMessage("メールアドレスまたはパスワードが正しくありません。");
      } else if (error.code === "email_not_confirmed") {
        setErrorMessage(
          "メールアドレスの確認が完了していません。確認メールをご確認ください。",
        );
      } else {
        setErrorMessage(error.message);
      }
      setIsSubmitting(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <AuthCard
      title="ログイン"
      description="アカウントにログインしてください"
      footer={
        <>
          アカウントをお持ちでない方は{" "}
          <Link href="/signup" className={linkClassName}>
            新規登録
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className={labelClassName}>
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            className={inputClassName}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClassName}>
            パスワード
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
            className={inputClassName}
            placeholder="••••••••"
          />
        </div>

        {errorMessage && (
          <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={primaryButtonClassName}
        >
          {isSubmitting ? "ログイン中..." : "ログイン"}
        </button>
      </form>
    </AuthCard>
  );
}
