import { NextResponse } from "next/server";
import { db } from "@/prisma/db";
import { createClient } from "@/lib/supabase/server";

// ---- 画面側と共有する型 ----

export type TodoPriority = "high" | "medium" | "low";

export type TodoDto = {
  id: string;
  title: string;
  isCompleted: boolean;
  priority: TodoPriority;
  dueDate: string | null;
  createdAt: string;
};

export type ApiErrorResponse = {
  error: string;
};

export type TodosListResponse = {
  todos: TodoDto[];
};

export type CreateTodoRequestBody = {
  title: string;
  priority?: TodoPriority;
  dueDate?: string | null;
};

export type CreateTodoResponse = {
  todo: TodoDto;
};

// ---- 内部ヘルパー ----

const TODO_PRIORITIES: readonly TodoPriority[] = ["high", "medium", "low"];

function isValidPriority(value: unknown): value is TodoPriority {
  return (
    typeof value === "string" &&
    (TODO_PRIORITIES as readonly string[]).includes(value)
  );
}

const DUE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidDueDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!DUE_DATE_PATTERN.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

function toDto(row: {
  id: string;
  title: string;
  isCompleted: boolean;
  priority: TodoPriority;
  dueDate: string | null;
  createdAt: string;
}): TodoDto {
  return {
    id: row.id,
    title: row.title,
    isCompleted: row.isCompleted,
    priority: row.priority,
    dueDate: row.dueDate,
    createdAt: row.createdAt,
  };
}

/** ログイン中のユーザーを取得する。未ログインなら null。 */
async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ---- Route Handlers ----

// GET /api/todos : ログイン中ユーザーの TODO 一覧を取得
export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "ログインが必要です。" },
      { status: 401 },
    );
  }

  const rows = await db.orm.public.Todo.where({ userId })
    .orderBy((t) => t.createdAt.desc())
    .all();

  return NextResponse.json<TodosListResponse>({
    todos: rows.map(toDto),
  });
}

// POST /api/todos : TODO を追加
export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "ログインが必要です。" },
      { status: 401 },
    );
  }

  let body: Partial<CreateTodoRequestBody>;
  try {
    body = (await request.json()) as Partial<CreateTodoRequestBody>;
  } catch {
    return NextResponse.json<ApiErrorResponse>(
      { error: "リクエストボディが不正です。" },
      { status: 400 },
    );
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "title は必須です。" },
      { status: 400 },
    );
  }

  let priority: TodoPriority = "medium";
  if (body.priority !== undefined) {
    if (!isValidPriority(body.priority)) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "priority は high / medium / low のいずれかで指定してください。" },
        { status: 400 },
      );
    }
    priority = body.priority;
  }

  let dueDate: string | null = null;
  if (body.dueDate !== undefined && body.dueDate !== null) {
    if (!isValidDueDate(body.dueDate)) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "dueDate は YYYY-MM-DD 形式で指定してください。" },
        { status: 400 },
      );
    }
    dueDate = body.dueDate;
  }

  const created = await db.orm.public.Todo.create({
    userId,
    title,
    priority,
    dueDate,
  });

  return NextResponse.json<CreateTodoResponse>(
    { todo: toDto(created) },
    { status: 201 },
  );
}
