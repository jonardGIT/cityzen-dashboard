import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requestCrudEndpointMock,
  assertCrudSuccessMock,
  getCrudEndpointMock,
} = vi.hoisted(() => ({
  requestCrudEndpointMock: vi.fn(),
  assertCrudSuccessMock: vi.fn(),
  getCrudEndpointMock: vi.fn(),
}));

vi.mock("@/lib/api/clients", () => ({
  authClient: {
    get: vi.fn(),
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
  fetchIncidentMediaAccessUrl,
  reportIncident,
  uploadIncidentMedia,
} from "@/features/incidents/api";

describe("incident helper endpoints", () => {
  beforeEach(() => {
    requestCrudEndpointMock.mockReset();
    assertCrudSuccessMock.mockReset();
    getCrudEndpointMock.mockReset();
    assertCrudSuccessMock.mockImplementation((value) => value);
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

  it("uploads incident media with multipart form data and returns the normalized URL", async () => {
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
      body?: FormData;
    };

    expect(endpointArg).toEqual({
      method: "POST",
      path: "/incidents/media/upload",
    });
    expect(optionsArg.body).toBeInstanceOf(FormData);
    expect(optionsArg.body?.get("file")).toBe(file);
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