import { NextResponse } from "next/server";
import { db } from "@/prisma/db";
import { createClient } from "@/lib/supabase/server";
import type { ApiErrorResponse, TodoDto, TodoPriority } from "../route";

// ---- 画面側と共有する型 ----

export type UpdateTodoRequestBody = {
  isCompleted?: boolean;
  priority?: TodoPriority;
  dueDate?: string | null;
};

export type UpdateTodoResponse = {
  todo: TodoDto;
};

export type DeleteTodoResponse = {
  success: true;
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

async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

type RouteParams = { params: Promise<{ id: string }> };

// PATCH /api/todos/:id : 完了状態を更新
export async function PATCH(request: Request, { params }: RouteParams) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "ログインが必要です。" },
      { status: 401 },
    );
  }

  const { id } = await params;

  let body: Partial<UpdateTodoRequestBody>;
  try {
    body = (await request.json()) as Partial<UpdateTodoRequestBody>;
  } catch {
    return NextResponse.json<ApiErrorResponse>(
      { error: "リクエストボディが不正です。" },
      { status: 400 },
    );
  }

  const patch: {
    isCompleted?: boolean;
    priority?: TodoPriority;
    dueDate?: string | null;
  } = {};

  if ("isCompleted" in body) {
    if (typeof body.isCompleted !== "boolean") {
      return NextResponse.json<ApiErrorResponse>(
        { error: "isCompleted は真偽値で指定してください。" },
        { status: 400 },
      );
    }
    patch.isCompleted = body.isCompleted;
  }

  if ("priority" in body) {
    if (!isValidPriority(body.priority)) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "priority は high / medium / low のいずれかで指定してください。" },
        { status: 400 },
      );
    }
    patch.priority = body.priority;
  }

  if ("dueDate" in body) {
    if (body.dueDate !== null && !isValidDueDate(body.dueDate)) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "dueDate は YYYY-MM-DD 形式、または null で指定してください。" },
        { status: 400 },
      );
    }
    patch.dueDate = body.dueDate;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "更新する項目 (isCompleted / priority / dueDate) を指定してください。" },
      { status: 400 },
    );
  }

  // 必ず userId も条件に含め、自分の TODO 以外を更新できないようにする
  const updated = await db.orm.public.Todo.where({ id, userId }).update(patch);

  if (!updated) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "TODO が見つかりません。" },
      { status: 404 },
    );
  }

  return NextResponse.json<UpdateTodoResponse>({ todo: toDto(updated) });
}

// DELETE /api/todos/:id : TODO を削除
export async function DELETE(_request: Request, { params }: RouteParams) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "ログインが必要です。" },
      { status: 401 },
    );
  }

  const { id } = await params;

  // 必ず userId も条件に含め、自分の TODO 以外を削除できないようにする
  const deleted = await db.orm.public.Todo.where({ id, userId }).delete();

  if (!deleted) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "TODO が見つかりません。" },
      { status: 404 },
    );
  }

  return NextResponse.json<DeleteTodoResponse>({ success: true });
}
