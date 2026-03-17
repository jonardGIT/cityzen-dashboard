import { NextResponse } from "next/server";
import { ApiHttpError } from "@/lib/cirs/errors";
import {
  assignmentsResource,
  categoriesResource,
  incidentsResource,
  severitiesResource,
  statusesResource,
} from "@/lib/cirs/resources";

export async function GET() {
  try {
    const [incidents, assignments, statuses, categories, severities] = await Promise.all([
      incidentsResource.list(),
      assignmentsResource.list(),
      statusesResource.list(),
      categoriesResource.list(),
      severitiesResource.list(),
    ]);

    return NextResponse.json({
      incidents,
      assignments,
      statuses,
      categories,
      severities,
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
