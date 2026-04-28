import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authClientGetMock,
  requestCrudEndpointMock,
  assertCrudSuccessMock,
  getCrudEndpointMock,
} = vi.hoisted(() => ({
  authClientGetMock: vi.fn(),
  requestCrudEndpointMock: vi.fn(),
  assertCrudSuccessMock: vi.fn(),
  getCrudEndpointMock: vi.fn(),
}));

vi.mock("@/lib/api/clients", () => ({
  authClient: {
    get: authClientGetMock,
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock("@/features/dynamic-crud/api-client", () => ({
  requestCrudEndpoint: requestCrudEndpointMock,
  assertCrudSuccess: assertCrudSuccessMock,
}));

vi.mock("@/features/dynamic-crud/config", () => ({
  getCrudEndpoint: getCrudEndpointMock,
}));

import {
  fetchAuditorIncidentById,
  fetchAuditorIncidentTimeline,
  fetchAuditorIncidents,
  fetchIncidentTimeline,
  fetchIncidentMediaAccessUrl,
  reportIncident,
  uploadIncidentMedia,
} from "@/features/incidents/api";

describe("incident helper endpoints", () => {
  beforeEach(() => {
    authClientGetMock.mockReset();
    requestCrudEndpointMock.mockReset();
    assertCrudSuccessMock.mockReset();
    getCrudEndpointMock.mockReset();
    assertCrudSuccessMock.mockImplementation((value) => value);
  });

  it("fetches auditor incidents from the audit list endpoint and adapts pagination", async () => {
    const signal = new AbortController().signal;
    authClientGetMock.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: "incident-1",
            publicReference: "CIRS-2026-0001",
            status: { id: "status-1", name: "Under Review" },
            category: { id: "category-1", name: "Flood" },
            severity: { id: "severity-1", level: "High" },
            dateReported: "2026-04-17T06:30:00.000Z",
            createdAt: "2026-04-17T06:35:00.000Z",
            updatedAt: "2026-04-17T06:40:00.000Z",
            barangay: "Centro 10",
            cityName: "Tuguegarao City",
            provinceName: "Cagayan",
            regionName: "Region II",
            hasMedia: true,
            assignmentCount: 2,
            statusHistoryCount: 3,
          },
        ],
        pagination: {
          page: 2,
          pageSize: 5,
          total: 7,
          totalPages: 2,
          hasNextPage: false,
          hasPrevPage: true,
        },
      },
    });

    const result = await fetchAuditorIncidents(
      {
        page: 2,
        pageSize: 5,
        search: " flood ",
        sortBy: "updatedAt",
        sortOrder: "asc",
        filters: [
          {
            field: "status.name",
            operator: "equals",
            value: "Under Review",
          },
        ],
      },
      signal,
    );

    expect(authClientGetMock).toHaveBeenCalledWith("/incidents/audit", {
      params: {
        page: 2,
        pageSize: 5,
        search: "flood",
        sortBy: "updatedAt",
        sortOrder: "asc",
        filters: JSON.stringify([
          {
            field: "status.name",
            operator: "equals",
            value: "Under Review",
          },
        ]),
      },
      signal,
    });
    expect(result).toEqual({
      data: [
        {
          id: "incident-1",
          publicReference: "CIRS-2026-0001",
          status: { id: "status-1", name: "Under Review" },
          category: { id: "category-1", name: "Flood" },
          severity: { id: "severity-1", level: "High" },
          dateReported: "2026-04-17T06:30:00.000Z",
          createdAt: "2026-04-17T06:35:00.000Z",
          updatedAt: "2026-04-17T06:40:00.000Z",
          barangay: "Centro 10",
          cityName: "Tuguegarao City",
          provinceName: "Cagayan",
          regionName: "Region II",
          hasMedia: true,
          assignmentCount: 2,
          statusHistoryCount: 3,
        },
      ],
      pagination: {
        page: 2,
        pageSize: 5,
        total: 7,
        totalPages: 2,
        hasNextPage: false,
        hasPrevPage: true,
      },
    });
  });

  it("fetches an auditor incident by id from the audit detail endpoint and unwraps the entity", async () => {
    const signal = new AbortController().signal;
    authClientGetMock.mockResolvedValueOnce({
      data: {
        data: {
          id: "incident-1",
          publicReference: "CIRS-2026-0001",
          status: { id: "status-1", name: "Under Review" },
          category: { id: "category-1", name: "Flood" },
          severity: { id: "severity-1", level: "High" },
          dateReported: "2026-04-17T06:30:00.000Z",
          createdAt: "2026-04-17T06:35:00.000Z",
          updatedAt: "2026-04-17T06:40:00.000Z",
          barangay: "Centro 10",
          cityName: "Tuguegarao City",
          provinceName: "Cagayan",
          regionName: "Region II",
          hasMedia: true,
          assignmentCount: 2,
          statusHistoryCount: 3,
        },
      },
    });

    const result = await fetchAuditorIncidentById("incident-1", signal);

    expect(authClientGetMock).toHaveBeenCalledWith(
      "/incidents/audit/incident-1",
      {
        signal,
      },
    );
    expect(result).toEqual({
      id: "incident-1",
      publicReference: "CIRS-2026-0001",
      status: { id: "status-1", name: "Under Review" },
      category: { id: "category-1", name: "Flood" },
      severity: { id: "severity-1", level: "High" },
      dateReported: "2026-04-17T06:30:00.000Z",
      createdAt: "2026-04-17T06:35:00.000Z",
      updatedAt: "2026-04-17T06:40:00.000Z",
      barangay: "Centro 10",
      cityName: "Tuguegarao City",
      provinceName: "Cagayan",
      regionName: "Region II",
      hasMedia: true,
      assignmentCount: 2,
      statusHistoryCount: 3,
    });
  });

  it("fetches the responder incident timeline endpoint and unwraps actor details", async () => {
    const signal = new AbortController().signal;
    authClientGetMock.mockResolvedValueOnce({
      data: {
        result: {
          incidentId: "incident-1",
          publicReference: "CIRS-2026-0001",
          timeline: [
            {
              id: "timeline-1",
              changedAt: "2026-04-17T07:00:00.000Z",
              fromStatus: { id: "status-1", name: "Reported" },
              toStatus: { id: "status-2", name: "Dispatched" },
              changedByUser: {
                id: "user-1",
                email: "auditor@example.com",
                role: "AUDITOR",
              },
              note: "Forwarded for review",
            },
          ],
        },
      },
    });

    const result = await fetchIncidentTimeline("incident-1", signal);

    expect(authClientGetMock).toHaveBeenCalledWith(
      "/incidents/incident-1/timeline",
      {
        signal,
      },
    );
    expect(result).toEqual({
      incidentId: "incident-1",
      publicReference: "CIRS-2026-0001",
      timeline: [
        {
          id: "timeline-1",
          changedAt: "2026-04-17T07:00:00.000Z",
          fromStatus: { id: "status-1", name: "Reported" },
          toStatus: { id: "status-2", name: "Dispatched" },
          changedByUser: {
            id: "user-1",
            email: "auditor@example.com",
            role: "AUDITOR",
          },
          note: "Forwarded for review",
        },
      ],
    });
  });

  it("fetches the auditor timeline endpoint and unwraps the redacted timeline payload", async () => {
    const signal = new AbortController().signal;
    authClientGetMock.mockResolvedValueOnce({
      data: {
        item: {
          incidentId: "incident-1",
          publicReference: "CIRS-2026-0001",
          timeline: [
            {
              id: "timeline-1",
              changedAt: "2026-04-17T07:00:00.000Z",
              fromStatus: { id: "status-1", name: "Reported" },
              toStatus: { id: "status-2", name: "Dispatched" },
            },
          ],
        },
      },
    });

    const result = await fetchAuditorIncidentTimeline("incident-1", signal);

    expect(authClientGetMock).toHaveBeenCalledWith(
      "/incidents/audit/incident-1/timeline",
      {
        signal,
      },
    );
    expect(result).toEqual({
      incidentId: "incident-1",
      publicReference: "CIRS-2026-0001",
      timeline: [
        {
          id: "timeline-1",
          changedAt: "2026-04-17T07:00:00.000Z",
          fromStatus: { id: "status-1", name: "Reported" },
          toStatus: { id: "status-2", name: "Dispatched" },
        },
      ],
    });
  });

  it("throws when the dedicated citizen report endpoint is not configured", async () => {
    getCrudEndpointMock.mockReturnValue(undefined);

    await expect(
      reportIncident({
        description: "Flooded road",
        categoryId: "category-1",
        severityId: "severity-1",
      }),
    ).rejects.toThrow("Incident reporting is not configured.");
  });

  it("requests secured media access using incident and media path params", async () => {
    getCrudEndpointMock.mockImplementation(
      (_resource: string, operation: string) => {
        if (operation === "mediaAccess") {
          return {
            method: "GET",
            path: "/incidents/{id}/media/{mediaId}",
          };
        }

        return undefined;
      },
    );
    requestCrudEndpointMock.mockResolvedValueOnce({ ok: true });
    assertCrudSuccessMock.mockReturnValueOnce({
      data: { signedUrl: "https://example.com/media/signed" },
    });

    const result = await fetchIncidentMediaAccessUrl("incident-1", "media-1");

    expect(requestCrudEndpointMock).toHaveBeenCalledWith(
      {
        method: "GET",
        path: "/incidents/{id}/media/{mediaId}",
      },
      {
        pathParams: {
          id: "incident-1",
          mediaId: "media-1",
        },
      },
    );
    expect(result).toBe("https://example.com/media/signed");
  });

  it("fails clearly when media access does not return a usable URL", async () => {
    getCrudEndpointMock.mockImplementation(
      (_resource: string, operation: string) =>
        operation === "mediaAccess"
          ? {
              method: "GET",
              path: "/incidents/{id}/media/{mediaId}",
            }
          : undefined,
    );
    requestCrudEndpointMock.mockResolvedValueOnce({ ok: true });
    assertCrudSuccessMock.mockReturnValueOnce({ data: { message: "ok" } });

    await expect(
      fetchIncidentMediaAccessUrl("incident-1", "media-1"),
    ).rejects.toThrow("Incident media access did not return a usable URL.");
  });

  it("uploads incident media with a base64 JSON payload and returns the normalized URL", async () => {
    getCrudEndpointMock.mockImplementation(
      (_resource: string, operation: string) =>
        operation === "mediaUpload"
          ? {
              method: "POST",
              path: "/incidents/media/upload",
            }
          : undefined,
    );
    requestCrudEndpointMock.mockResolvedValueOnce({ ok: true });
    assertCrudSuccessMock.mockReturnValueOnce({
      mediaUrl: "https://example.com/media/uploaded",
    });

    const file = new File(["demo"], "evidence.jpg", { type: "image/jpeg" });
    const result = await uploadIncidentMedia(file);

    const endpointArg = requestCrudEndpointMock.mock.calls[0]?.[0];
    const optionsArg = requestCrudEndpointMock.mock.calls[0]?.[1] as {
      body?: {
        fileName: string;
        contentType: string;
        dataBase64: string;
      };
    };

    expect(endpointArg).toEqual({
      method: "POST",
      path: "/incidents/media/upload",
    });
    expect(optionsArg.body).toEqual({
      fileName: "evidence.jpg",
      contentType: "image/jpeg",
      dataBase64: "ZGVtbw==",
    });
    expect(result).toBe("https://example.com/media/uploaded");
  });

  it("throws when incident media upload is not configured", async () => {
    getCrudEndpointMock.mockReturnValue(undefined);

    await expect(
      uploadIncidentMedia(
        new File(["demo"], "evidence.jpg", { type: "image/jpeg" }),
      ),
    ).rejects.toThrow("Incident media upload is not configured.");
  });
});
