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

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      if (error.code === "over_email_send_rate_limit") {
        setErrorMessage(
          "確認メールの送信回数が上限に達しました。しばらく時間をおいてから再度お試しください。",
        );
      } else if (
        error.code === "user_already_exists" ||
        error.code === "email_exists"
      ) {
        setErrorMessage(
          "このメールアドレスは既に登録されています。ログインしてください。",
        );
      } else {
        setErrorMessage(error.message);
      }
      setIsSubmitting(false);
      return;
    }

    // メール確認が無効な設定の場合は、登録と同時にセッションが発行される
    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }

    // メール確認が有効な場合、identities が空配列 = 登録済みメールアドレス
    // (エラーではなく成功レスポンスとして返ってくる場合があるため、こちらでも判定する)
    if (data.user && data.user.identities?.length === 0) {
      setErrorMessage("このメールアドレスは既に登録されています。ログインしてください。");
      setIsSubmitting(false);
      return;
    }

    setInfoMessage(
      "確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。",
    );
    setIsSubmitting(false);
  }

  return (
    <AuthCard
      title="新規登録"
      description="メールアドレスとパスワードで登録してください"
      footer={
        <>
          既にアカウントをお持ちの方は{" "}
          <Link href="/login" className={linkClassName}>
            ログイン
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
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
            className={inputClassName}
            placeholder="6文字以上"
          />
        </div>

        {errorMessage && (
          <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
            {errorMessage}
          </p>
        )}

        {infoMessage && (
          <p className="rounded-lg border border-emerald-900 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-300">
            {infoMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={primaryButtonClassName}
        >
          {isSubmitting ? "登録中..." : "登録する"}
        </button>
      </form>
    </AuthCard>
  );
}
