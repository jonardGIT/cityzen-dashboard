import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1").replace(/\/$/, "");

function normalizePath(path: string) {
  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  return withLeadingSlash.replace(/\/{2,}/g, "/");
}

function toBackendPath(resourcePath: string) {
  const base = new URL(API_BASE_URL);
  return normalizePath(`${base.pathname}/${resourcePath}`);
}

function hasMethod(paths: Record<string, unknown>, path: string, method: "patch" | "put" | "delete") {
  const pathItem = paths[path] as Record<string, unknown> | undefined;
  return Boolean(pathItem?.[method]);
}

export async function GET() {
  try {
    const response = await fetch(`${API_BASE_URL}/openapi.json`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          canUpdateUser: false,
          canDeleteUser: false,
        },
        { status: 200 },
      );
    }

    const spec = (await response.json()) as { paths?: Record<string, unknown> };
    const paths = spec.paths ?? {};

    const usersByIdPath = toBackendPath("users/{id}");
    const adminUsersByIdPath = toBackendPath("admin/users/{id}");

    const canUpdateUser =
      hasMethod(paths, usersByIdPath, "patch") ||
      hasMethod(paths, usersByIdPath, "put") ||
      hasMethod(paths, adminUsersByIdPath, "patch") ||
      hasMethod(paths, adminUsersByIdPath, "put");

    const canDeleteUser =
      hasMethod(paths, usersByIdPath, "delete") ||
      hasMethod(paths, adminUsersByIdPath, "delete");

    return NextResponse.json({ canUpdateUser, canDeleteUser });
  } catch {
    return NextResponse.json(
      {
        canUpdateUser: false,
        canDeleteUser: false,
      },
      { status: 200 },
    );
  }
}
