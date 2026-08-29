import { createBrowserClient } from "@supabase/ssr";

/**
 * ブラウザ(クライアントコンポーネント)から使う Supabase クライアント。
 * セッションは Cookie に保存されるため、proxy.ts 側からも参照できる。
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
