"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type {
  ApiErrorResponse,
  CreateTodoRequestBody,
  CreateTodoResponse,
  TodoDto,
  TodosListResponse,
} from "@/app/api/todos/route";
import type {
  DeleteTodoResponse,
  UpdateTodoRequestBody,
  UpdateTodoResponse,
} from "@/app/api/todos/[id]/route";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [todos, setTodos] = useState<TodoDto[]>([]);
  const [isLoadingTodos, setIsLoadingTodos] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  // 初回マウント時に一覧を取得する。setState はすべて .then/.catch/.finally の
  // コールバック内で行い、アンマウント後の setState を ignore フラグで防ぐ。
  useEffect(() => {
    let ignore = false;

    fetch("/api/todos")
      .then(async (res) => {
        if (!res.ok) {
          const body = (await res.json()) as ApiErrorResponse;
          throw new Error(body.error);
        }
        return (await res.json()) as TodosListResponse;
      })
      .then((body) => {
        if (!ignore) setTodos(body.todos);
      })
      .catch((error) => {
        if (!ignore) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "TODO の取得に失敗しました。",
          );
        }
      })
      .finally(() => {
        if (!ignore) setIsLoadingTodos(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    setIsAdding(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title } satisfies CreateTodoRequestBody),
      });
      if (!res.ok) {
        const body = (await res.json()) as ApiErrorResponse;
        throw new Error(body.error);
      }
      const body = (await res.json()) as CreateTodoResponse;
      setTodos((prev) => [body.todo, ...prev]);
      setNewTitle("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "TODO の追加に失敗しました。",
      );
    } finally {
      setIsAdding(false);
    }
  }

  async function handleToggle(todo: TodoDto) {
    setPendingIds((prev) => new Set(prev).add(todo.id));
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isCompleted: !todo.isCompleted,
        } satisfies UpdateTodoRequestBody),
      });
      if (!res.ok) {
        const body = (await res.json()) as ApiErrorResponse;
        throw new Error(body.error);
      }
      const body = (await res.json()) as UpdateTodoResponse;
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? body.todo : t)),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "更新に失敗しました。",
      );
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(todo.id);
        return next;
      });
    }
  }

  async function handleDelete(id: string) {
    setPendingIds((prev) => new Set(prev).add(id));
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json()) as ApiErrorResponse;
        throw new Error(body.error);
      }
      (await res.json()) as DeleteTodoResponse;
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "削除に失敗しました。",
      );
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-zinc-950">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-4 sm:px-6">
        <h1 className="text-lg font-semibold text-zinc-50">My TODO App</h1>
        <div className="flex items-center gap-3 sm:gap-4">
          {user && (
            <span className="hidden text-sm text-zinc-400 sm:inline">
              {user.email}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {isLoggingOut ? "ログアウト中..." : "ログアウト"}
          </button>
        </div>
      </header>

      <main className="flex flex-1 justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl shadow-black/40 sm:p-8">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              disabled={isAdding}
              placeholder="やることを入力..."
              className="w-full min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 placeholder:text-zinc-500 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isAdding || newTitle.trim() === ""}
              className="shrink-0 rounded-lg bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              追加
            </button>
          </form>

          {errorMessage && (
            <p className="mt-4 rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
              {errorMessage}
            </p>
          )}

          <ul className="mt-6 space-y-2">
            {isLoadingTodos && (
              <li className="py-6 text-center text-sm text-zinc-500">
                読み込み中...
              </li>
            )}

            {!isLoadingTodos && todos.length === 0 && (
              <li className="py-6 text-center text-sm text-zinc-500">
                TODO はまだありません。
              </li>
            )}

            {todos.map((todo) => {
              const isPending = pendingIds.has(todo.id);
              return (
                <li
                  key={todo.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5"
                >
                  <input
                    type="checkbox"
                    checked={todo.isCompleted}
                    onChange={() => handleToggle(todo)}
                    disabled={isPending}
                    className="h-4 w-4 shrink-0 accent-zinc-50 disabled:opacity-50"
                    aria-label={`${todo.title} を完了にする`}
                  />
                  <span
                    className={`min-w-0 flex-1 break-words text-sm ${
                      todo.isCompleted
                        ? "text-zinc-500 line-through"
                        : "text-zinc-100"
                    }`}
                  >
                    {todo.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(todo.id)}
                    disabled={isPending}
                    className="shrink-0 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors hover:border-red-800 hover:text-red-300 disabled:opacity-50"
                  >
                    削除
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </main>
    </div>
  );
}
