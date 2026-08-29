import { NextResponse } from "next/server";
import { db } from "@/prisma/db";
import { createClient } from "@/lib/supabase/server";
import type { ApiErrorResponse, TodoDto } from "../route";

// ---- 画面側と共有する型 ----

export type UpdateTodoRequestBody = {
  isCompleted: boolean;
};

export type UpdateTodoResponse = {
  todo: TodoDto;
};

export type DeleteTodoResponse = {
  success: true;
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

  if (typeof body.isCompleted !== "boolean") {
    return NextResponse.json<ApiErrorResponse>(
      { error: "isCompleted は真偽値で指定してください。" },
      { status: 400 },
    );
  }

  // 必ず userId も条件に含め、自分の TODO 以外を更新できないようにする
  const updated = await db.orm.public.Todo.where({ id, userId }).update({
    isCompleted: body.isCompleted,
  });

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
