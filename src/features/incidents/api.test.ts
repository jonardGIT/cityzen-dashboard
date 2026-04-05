import { describe, expect, it } from "vitest";
import {
  getIncidentMediaReference,
  normalizeIncidentMediaAccessUrl,
} from "@/features/incidents/api";

describe("incident media helpers", () => {
  it("extracts a media identifier and fallback URL from flexible incident shapes", () => {
    expect(
      getIncidentMediaReference({
        id: "incident-1",
        media: {
          id: "media-1",
          accessUrl: "https://example.com/access",
        },
      }),
    ).toEqual({
      mediaId: "media-1",
      fallbackUrl: "https://example.com/access",
    });

    expect(
      getIncidentMediaReference({
        id: "incident-2",
        attachments: [
          {
            id: "media-2",
            mediaUrl: "https://example.com/file",
          },
        ],
      }),
    ).toEqual({
      mediaId: "media-2",
      fallbackUrl: "https://example.com/file",
    });
  });

  it("normalizes media access payloads across likely backend response shapes", () => {
    expect(normalizeIncidentMediaAccessUrl("https://example.com/direct")).toBe(
      "https://example.com/direct",
    );
    expect(
      normalizeIncidentMediaAccessUrl({
        data: { signedUrl: "https://example.com/signed" },
      }),
    ).toBe("https://example.com/signed");
    expect(
      normalizeIncidentMediaAccessUrl([
        null,
        { href: "https://example.com/array-first" },
      ]),
    ).toBe("https://example.com/array-first");
    expect(
      normalizeIncidentMediaAccessUrl({
        data: [{ mediaUrl: "https://example.com/uploaded" }],
      }),
    ).toBe("https://example.com/uploaded");
  });
});
