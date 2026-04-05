"use client";

import { InfoCircleOutlined } from "@ant-design/icons";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Tooltip,
  Typography,
} from "antd";
import type { FormInstance } from "antd";
import { getCrudEndpoint } from "@/features/dynamic-crud/config";
import { useCrudEndpointAvailability } from "@/features/dynamic-crud/openapi";
import type { CrudFieldConfig } from "@/features/dynamic-crud/types";
import { uploadIncidentMedia } from "@/features/incidents/api";
import { reverseGeocodeIncidentAddress } from "@/lib/geo/reverse-geocode";

const { Link, Text } = Typography;

type SelectFieldOption = { value: string; label: string; description?: string };

interface CrudFormModalProps {
  resourceName?: string;
  title: string;
  open: boolean;
  submitting?: boolean;
  fields: CrudFieldConfig[];
  form: FormInstance<Record<string, unknown>>;
  optionsByField: Record<string, SelectFieldOption[]>;
  onCancel: () => void;
  onSubmit: () => void;
  isUpdate?: boolean;
  submitDisabled?: boolean;
  submitDisabledMessage?: string;
  onRetrySubmitDependency?: () => void;
}

function joinLocationParts(parts: Array<string | undefined>): string | null {
  const filtered = parts.filter(
    (part): part is string =>
      typeof part === "string" && part.trim().length > 0,
  );

  return filtered.length > 0 ? filtered.join(", ") : null;
}

export function CrudFormModal({
  resourceName,
  title,
  open,
  submitting,
  fields,
  form,
  optionsByField,
  onCancel,
  onSubmit,
  isUpdate,
  submitDisabled,
  submitDisabledMessage,
  onRetrySubmitDependency,
}: CrudFormModalProps) {
  const { message } = App.useApp();
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const [locationLookupPending, setLocationLookupPending] = useState(false);
  const [locationLookupError, setLocationLookupError] = useState<string | null>(
    null,
  );
  const [mediaUploadPending, setMediaUploadPending] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const mediaUploadEndpoint =
    resourceName === "incidents"
      ? getCrudEndpoint("incidents", "mediaUpload")
      : undefined;
  const mediaUploadAvailability =
    useCrudEndpointAvailability(mediaUploadEndpoint);
  const latitudeValue = Form.useWatch("latitude", form);
  const longitudeValue = Form.useWatch("longitude", form);
  const addressLine1Value = Form.useWatch("addressLine1", form);
  const addressLine2Value = Form.useWatch("addressLine2", form);
  const barangayValue = Form.useWatch("barangay", form);
  const districtNameValue = Form.useWatch("districtName", form);
  const cityNameValue = Form.useWatch("cityName", form);
  const provinceNameValue = Form.useWatch("provinceName", form);
  const regionNameValue = Form.useWatch("regionName", form);
  const postalCodeValue = Form.useWatch("postalCode", form);
  const landmarkValue = Form.useWatch("landmark", form);

  const supportsLocationAssist = fields.some(
    (field) => field.name === "latitude" || field.name === "longitude",
  );
  const supportsIncidentMediaUpload =
    resourceName === "incidents" &&
    fields.some((field) => field.name === "mediaUrl") &&
    mediaUploadAvailability.isAvailable;
  const previewAddress = joinLocationParts([
    typeof addressLine1Value === "string" ? addressLine1Value : undefined,
    typeof addressLine2Value === "string" ? addressLine2Value : undefined,
    typeof barangayValue === "string" ? barangayValue : undefined,
    typeof districtNameValue === "string" ? districtNameValue : undefined,
    typeof cityNameValue === "string" ? cityNameValue : undefined,
    typeof provinceNameValue === "string" ? provinceNameValue : undefined,
    typeof regionNameValue === "string" ? regionNameValue : undefined,
    typeof postalCodeValue === "string" ? postalCodeValue : undefined,
  ]);
  const previewCoordinates =
    typeof latitudeValue === "string" &&
    latitudeValue.trim().length > 0 &&
    typeof longitudeValue === "string" &&
    longitudeValue.trim().length > 0
      ? `${latitudeValue}, ${longitudeValue}`
      : null;
  const previewMapUrl =
    previewCoordinates &&
    typeof latitudeValue === "string" &&
    typeof longitudeValue === "string"
      ? `https://www.openstreetmap.org/?mlat=${encodeURIComponent(latitudeValue)}&mlon=${encodeURIComponent(longitudeValue)}#map=18/${encodeURIComponent(latitudeValue)}/${encodeURIComponent(longitudeValue)}`
      : null;

  useEffect(() => {
    if (!open) {
      setLocationLookupError(null);
      setLocationLookupPending(false);
      setMediaUploadError(null);
      setMediaUploadPending(false);
      if (mediaInputRef.current) {
        mediaInputRef.current.value = "";
      }
    }
  }, [open]);

  const applyCurrentLocation = async () => {
    if (!supportsLocationAssist) {
      return;
    }

    if (!("geolocation" in navigator)) {
      const errorMessage = "Geolocation is not available in this browser.";
      setLocationLookupError(errorMessage);
      message.error(errorMessage);
      return;
    }

    setLocationLookupPending(true);
    setLocationLookupError(null);

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          });
        },
      );

      const addressSnapshot = await reverseGeocodeIncidentAddress(
        position.coords.latitude,
        position.coords.longitude,
      );

      form.setFieldsValue(
        addressSnapshot as unknown as Parameters<typeof form.setFieldsValue>[0],
      );
      message.success("Current location applied to the incident form.");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to capture the current location.";

      setLocationLookupError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLocationLookupPending(false);
    }
  };

  const handleMediaFileSelection = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setMediaUploadPending(true);
    setMediaUploadError(null);

    try {
      const mediaUrl = await uploadIncidentMedia(file);
      form.setFieldValue("mediaUrl", mediaUrl);
      message.success("Media uploaded and attached to the form.");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to upload incident media.";

      setMediaUploadError(errorMessage);
      message.error(errorMessage);
    } finally {
      setMediaUploadPending(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={() => {
        setLocationLookupError(null);
        onCancel();
      }}
      onOk={onSubmit}
      confirmLoading={submitting}
      okButtonProps={{ disabled: submitDisabled }}
      destroyOnHidden
    >
      <Form<Record<string, unknown>>
        form={form}
        layout="vertical"
        requiredMark={false}
      >
        {supportsLocationAssist ? (
          <>
            <Button
              style={{ marginBottom: 16 }}
              onClick={() => void applyCurrentLocation()}
              loading={locationLookupPending}
            >
              Use Current Location
            </Button>
            {locationLookupError ? (
              <Alert
                showIcon
                type="warning"
                style={{ marginBottom: 16 }}
                title={locationLookupError}
              />
            ) : null}
            {previewAddress ||
            previewCoordinates ||
            typeof landmarkValue === "string" ? (
              <Card
                size="small"
                title="Location Preview"
                style={{ marginBottom: 16 }}
              >
                <div style={{ display: "grid", gap: 8 }}>
                  <Text>
                    <strong>Coordinates:</strong>{" "}
                    {previewCoordinates ?? "Not set"}
                  </Text>
                  <Text>
                    <strong>Address:</strong> {previewAddress ?? "Not set"}
                  </Text>
                  <Text>
                    <strong>Landmark:</strong>{" "}
                    {typeof landmarkValue === "string" &&
                    landmarkValue.trim().length > 0
                      ? landmarkValue
                      : "Not set"}
                  </Text>
                  {previewMapUrl ? (
                    <Link href={previewMapUrl} target="_blank" rel="noreferrer">
                      Open in OpenStreetMap
                    </Link>
                  ) : null}
                </div>
              </Card>
            ) : null}
          </>
        ) : null}
        {submitDisabledMessage ? (
          <Alert
            showIcon
            type="error"
            style={{ marginBottom: 16 }}
            title={submitDisabledMessage}
            action={
              onRetrySubmitDependency ? (
                <Button size="small" onClick={onRetrySubmitDependency}>
                  Retry
                </Button>
              ) : undefined
            }
          />
        ) : null}
        {supportsIncidentMediaUpload ? (
          <>
            <input
              ref={mediaInputRef}
              type="file"
              accept="image/*,video/*,.pdf"
              style={{ display: "none" }}
              onChange={(event) => void handleMediaFileSelection(event)}
            />
            <Card
              size="small"
              title="Media Upload"
              style={{ marginBottom: 16 }}
            >
              <div style={{ display: "grid", gap: 8 }}>
                <Text>
                  Upload evidence through the configured incident media
                  endpoint. The returned URL will populate the media field
                  automatically.
                </Text>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Button
                    onClick={() => mediaInputRef.current?.click()}
                    loading={mediaUploadPending}
                  >
                    Upload Media
                  </Button>
                  <Button
                    onClick={() => {
                      form.setFieldValue("mediaUrl", undefined);
                      setMediaUploadError(null);
                    }}
                    disabled={mediaUploadPending}
                  >
                    Clear Media URL
                  </Button>
                </div>
                {mediaUploadError ? (
                  <Alert showIcon type="warning" message={mediaUploadError} />
                ) : null}
              </div>
            </Card>
          </>
        ) : null}
        {resourceName === "incidents" &&
        fields.some((field) => field.name === "mediaUrl") &&
        !mediaUploadAvailability.isAvailable ? (
          <Alert
            showIcon
            type="info"
            style={{ marginBottom: 16 }}
            message="Media upload is unavailable for the current backend feature profile."
          />
        ) : null}
        {fields.map((field) => {
          const rules = field.required
            ? [{ required: true, message: `${field.label} is required` }]
            : [];

          if (field.type === "password" && isUpdate) {
            return null;
          }

          if (field.type === "textarea") {
            return (
              <Form.Item
                key={field.name}
                name={field.name}
                label={field.label}
                rules={rules}
              >
                <Input.TextArea rows={3} />
              </Form.Item>
            );
          }

          if (field.type === "email") {
            return (
              <Form.Item
                key={field.name}
                name={field.name}
                label={field.label}
                rules={[
                  ...rules,
                  { type: "email", message: "Enter a valid email" },
                ]}
              >
                <Input />
              </Form.Item>
            );
          }

          if (field.type === "password") {
            return (
              <Form.Item
                key={field.name}
                name={field.name}
                label={field.label}
                rules={rules}
              >
                <Input.Password />
              </Form.Item>
            );
          }

          if (field.type === "select") {
            return (
              <Form.Item
                key={field.name}
                name={field.name}
                label={field.label}
                rules={rules}
              >
                <Select
                  options={optionsByField[field.name] ?? []}
                  optionRender={(option) => {
                    const description = option.data.description;
                    if (
                      typeof description !== "string" ||
                      description.length === 0
                    ) {
                      return <span>{String(option.label)}</span>;
                    }

                    return (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          width: "100%",
                        }}
                      >
                        <span>{String(option.label)}</span>
                        <Tooltip title={description}>
                          <InfoCircleOutlined style={{ color: "#1677ff" }} />
                        </Tooltip>
                      </span>
                    );
                  }}
                />
              </Form.Item>
            );
          }

          if (field.type === "datetime") {
            return (
              <Form.Item
                key={field.name}
                name={field.name}
                label={field.label}
                rules={rules}
              >
                <Input type="datetime-local" />
              </Form.Item>
            );
          }

          return (
            <Form.Item
              key={field.name}
              name={field.name}
              label={field.label}
              rules={rules}
            >
              <Input />
            </Form.Item>
          );
        })}
      </Form>
    </Modal>
  );
}

export function toInitialFormValues(
  values: Record<string, unknown>,
  fields: CrudFieldConfig[],
) {
  const normalized: Record<string, unknown> = { ...values };

  for (const field of fields) {
    if (field.type === "select") {
      const value = normalized[field.name];
      if (value !== undefined && value !== null && value !== "") {
        normalized[field.name] = String(value);
      }
    }

    if (field.type === "datetime") {
      const value = normalized[field.name];
      if (typeof value === "string" && value.length > 0) {
        normalized[field.name] = value;
      }
    }
  }

  return normalized;
}
