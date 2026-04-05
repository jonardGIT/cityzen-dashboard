"use client";

import {
  getAuthOptionalEndpoint,
  getCrudEndpoint,
} from "@/features/dynamic-crud/config";
import { useCrudEndpointAvailability } from "@/features/dynamic-crud/openapi";

export interface BackendFeatureStatus {
  key: string;
  label: string;
  description: string;
  isAvailable: boolean;
}

export function useBackendFeatureSurface() {
  const restoreAvailability = useCrudEndpointAvailability(
    getCrudEndpoint("incidents", "restore"),
  );
  const mediaUploadAvailability = useCrudEndpointAvailability(
    getCrudEndpoint("incidents", "mediaUpload"),
  );
  const sessionsAvailability = useCrudEndpointAvailability(
    getAuthOptionalEndpoint("sessions"),
  );
  const mfaAvailability = useCrudEndpointAvailability(
    getAuthOptionalEndpoint("mfaSetup"),
  );

  const features: BackendFeatureStatus[] = [
    {
      key: "record-restore",
      label: "Record Restore",
      description: "Soft-deleted resource restoration endpoints.",
      isAvailable: restoreAvailability.isAvailable,
    },
    {
      key: "incident-media-upload",
      label: "Media Uploads",
      description: "Direct incident evidence upload through managed storage.",
      isAvailable: mediaUploadAvailability.isAvailable,
    },
    {
      key: "device-sessions",
      label: "Device Sessions",
      description: "Session inventory and per-device revocation controls.",
      isAvailable: sessionsAvailability.isAvailable,
    },
    {
      key: "mfa-enrollment",
      label: "MFA Enrollment",
      description: "Authenticator setup and enable/disable endpoints.",
      isAvailable: mfaAvailability.isAvailable,
    },
  ];

  return {
    features,
    isLoading:
      restoreAvailability.isLoading ||
      mediaUploadAvailability.isLoading ||
      sessionsAvailability.isLoading ||
      mfaAvailability.isLoading,
  };
}
