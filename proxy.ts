import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// このプロジェクトの Next.js は v16 系のため middleware.ts ではなく
// proxy.ts(export 名も proxy)を使う。
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 以下を除く全パスで実行:
     * - api (Route Handler。認証チェックは各 route.ts 側で行い、JSON で 401 を返す)
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化ファイル)
     * - favicon.ico, 画像ファイルなど
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
