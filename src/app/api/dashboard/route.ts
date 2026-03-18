import { NextResponse } from "next/server";
import { ApiHttpError } from "@/lib/cirs/errors";
import {
  assignmentsResource,
  categoriesResource,
  incidentsResource,
  respondersResource,
  severitiesResource,
  statusesResource,
  usersResource,
} from "@/lib/cirs/resources";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function listOptionalUsers() {
  try {
    return await usersResource.list();
  } catch (error) {
    if (error instanceof ApiHttpError && error.status === 404) {
      return [];
    }

    throw error;
  }
}

export async function GET() {
  try {
    const [incidents, assignments, responders, statuses, categories, severities, users] = await Promise.all([
      incidentsResource.list(),
      assignmentsResource.list(),
      respondersResource.list(),
      statusesResource.list(),
      categoriesResource.list(),
      severitiesResource.list(),
      listOptionalUsers(),
    ]);

    return NextResponse.json({
      incidents,
      assignments,
      responders,
      statuses,
      categories,
      severities,
      users,
    });
  } catch (error) {
    if (error instanceof ApiHttpError) {
      return NextResponse.json(
        {
          message: error.message,
          status: error.status,
          details: error.payload,
          rateLimit: error.rateLimit,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        message: "Unable to load CIRS dashboard data.",
      },
      { status: 500 },
    );
  }
}
