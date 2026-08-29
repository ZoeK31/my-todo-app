import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

/**
 * ログイン/新規登録ページ共通の、中央寄せダークテーマのカード型フォームの外枠。
 */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl shadow-black/40">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-zinc-50">{title}</h1>
          <p className="mt-1 text-sm text-zinc-400">{description}</p>
        </div>

        {children}

        <div className="mt-6 text-center text-sm text-zinc-400">{footer}</div>
      </div>
    </div>
  );
}
