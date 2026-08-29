import { NextResponse } from "next/server";
import { db } from "@/prisma/db";
import { createClient } from "@/lib/supabase/server";

// ---- 画面側と共有する型 ----

export type TodoDto = {
  id: string;
  title: string;
  isCompleted: boolean;
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
};

export type CreateTodoResponse = {
  todo: TodoDto;
};

// ---- 内部ヘルパー ----

function toDto(row: {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt: string;
}): TodoDto {
  return {
    id: row.id,
    title: row.title,
    isCompleted: row.isCompleted,
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

  const created = await db.orm.public.Todo.create({ userId, title });

  return NextResponse.json<CreateTodoResponse>(
    { todo: toDto(created) },
    { status: 201 },
  );
}
