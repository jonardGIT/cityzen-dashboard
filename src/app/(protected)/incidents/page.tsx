"use client";

import { InfoCircleOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tooltip,
  Typography,
} from "antd";
import type { TableProps } from "antd";
import { AxiosError } from "axios";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FilterToolbar } from "@/components/common/FilterToolbar";
import { ErrorState, LoadingState } from "@/components/common/PageStates";
import { ResizableTable } from "@/components/common/ResizableTable";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { SharedTable, type SharedTableColumn } from "@/components/crud/SharedTable";
import { useAuth } from "@/context/AuthContext";
import {
  defaultAssignmentsQueryState,
  useAssignmentsQuery,
} from "@/features/assignments/api";
import {
  useCreateIncidentMutation,
  useIncidentsQuery,
} from "@/features/incidents/api";
import {
  useCategoriesQuery,
  useCitizensQuery,
  useRespondersQuery,
  useSeveritiesQuery,
  useStatusesQuery,
} from "@/features/reference-data/api";
import { CAN_CREATE_INCIDENT } from "@/lib/auth/permissions";
import { mapValidationErrorsToForm } from "@/lib/forms/mapValidationErrors";
import { reverseGeocodeIncidentAddress } from "@/lib/geo/reverse-geocode";
import { useListQueryParams } from "@/hooks/useListQueryParams";
import { DEFAULT_SORT_BY, DEFAULT_SORT_ORDER } from "@/lib/api/list-query-params";
import type { ApiErrorPayload, Incident } from "@/types/api";

const { Link, Text, Title } = Typography;

interface IncidentFormValues {
  description: string;
  mediaUrl?: string;
  dateReported?: string;
  citizenId: string;
  categoryId: string;
  severityId: string;
  statusId: string;
  latitude?: string;
  longitude?: string;
  addressLine1?: string;
  addressLine2?: string;
  barangay?: string;
  districtName?: string;
  cityName?: string;
  provinceName?: string;
  regionName?: string;
  postalCode?: string;
  landmark?: string;
}

function formatDateTime(value: unknown): string {
  if (!value) {
    return "N/A";
  }

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return parsed.toLocaleString();
}

function formatRelativeTime(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const diffMs = parsed.getTime() - Date.now();
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMs) < hourMs) {
    return rtf.format(Math.round(diffMs / minuteMs), "minute");
  }

  if (Math.abs(diffMs) < dayMs) {
    return rtf.format(Math.round(diffMs / hourMs), "hour");
  }

  return rtf.format(Math.round(diffMs / dayMs), "day");
}

function joinLocationParts(parts: Array<string | undefined>): string | null {
  const filtered = parts.filter(
    (part): part is string =>
      typeof part === "string" && part.trim().length > 0,
  );

  return filtered.length > 0 ? filtered.join(", ") : null;
}

function getIncidentAddress(incident: Incident): string {
  return (
    joinLocationParts([
      incident.addressLine1,
      incident.addressLine2,
      incident.barangay,
      incident.cityName,
      incident.provinceName,
    ]) ?? "N/A"
  );
}

function hasCoordinates(incident: Incident): boolean {
  return incident.latitude !== undefined && incident.longitude !== undefined;
}

function hasAddressSnapshot(incident: Incident): boolean {
  return Boolean(
    joinLocationParts([
      incident.addressLine1,
      incident.addressLine2,
      incident.barangay,
      incident.districtName,
      incident.cityName,
      incident.provinceName,
      incident.regionName,
      incident.postalCode,
    ]),
  );
}

function getAssignmentTimestamp(assignment: {
  assignedDate?: string;
  createdAt?: string;
  updatedAt?: string;
}): number {
  const value =
    assignment.assignedDate ?? assignment.createdAt ?? assignment.updatedAt;
  const parsed = value ? new Date(value).getTime() : Number.NaN;
  return Number.isNaN(parsed) ? -1 : parsed;
}

function getStatusColor(statusName: string): string {
  const normalized = statusName.trim().toLowerCase();

  if (
    ["resolved", "closed", "cancelled", "canceled", "completed"].some((term) =>
      normalized.includes(term),
    )
  ) {
    return "green";
  }

  if (
    ["in progress", "dispatched", "responding", "ongoing"].some((term) =>
      normalized.includes(term),
    )
  ) {
    return "processing";
  }

  return "gold";
}

export default function IncidentsPage() {
  const { message } = App.useApp();
  const { hasRole } = useAuth();
  const router = useRouter();
  const optionQueryState: ListQueryState = {
    page: 1,
    pageSize: 200,
    search: "",
    sortBy: DEFAULT_SORT_BY,
    sortOrder: DEFAULT_SORT_ORDER,
    filters: [],
  };
  const citizensQuery = useCitizensQuery(optionQueryState);
  const categoriesQuery = useCategoriesQuery(optionQueryState);
  const severitiesQuery = useSeveritiesQuery(optionQueryState);
  const statusesQuery = useStatusesQuery(optionQueryState);
  const respondersQuery = useRespondersQuery(optionQueryState);
  const assignmentsQuery = useAssignmentsQuery(
    defaultAssignmentsQueryState({ page: 1, pageSize: 200 }),
  );
  const createMutation = useCreateIncidentMutation();
  const [open, setOpen] = useState(false);
  const [locationLookupPending, setLocationLookupPending] = useState(false);
  const [locationLookupError, setLocationLookupError] = useState<string | null>(
    null,
  );
  const [form] = Form.useForm<IncidentFormValues>();
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

  const listQuery = useListQueryParams();

  const incidentsListQuery = useIncidentsQuery(listQuery);
  const rows = incidentsListQuery.data?.data ?? [];
  const pagination = incidentsListQuery.data?.pagination;
  const totalIncidents = pagination?.total ?? rows.length;

  const severityOptions = useMemo(
    () =>
      (severitiesQuery.data?.data ?? []).map((item) => ({
        value: String(item.id),
        label: item.level ?? `Severity ${item.id}`,
        description: item.definition,
      })),
    [severitiesQuery.data],
  );

  const citizenOptions = useMemo(
    () =>
      (citizensQuery.data?.data ?? []).map((item) => ({
        value: String(item.id),
        label: item.name ?? `Citizen ${item.id}`,
      })),
    [citizensQuery.data],
  );

  const statusOptions = useMemo(
    () =>
      (statusesQuery.data?.data ?? []).map((item) => ({
        value: String(item.id),
        label: item.name ?? `Status ${item.id}`,
      })),
    [statusesQuery.data],
  );

  const citizenLabels = useMemo(
    () => new Map(citizenOptions.map((item) => [item.value, item.label])),
    [citizenOptions],
  );

  const statusLabels = useMemo(
    () => new Map(statusOptions.map((item) => [item.value, item.label])),
    [statusOptions],
  );
  const responderLabels = useMemo(
    () =>
      new Map(
        (respondersQuery.data?.data ?? []).map((item) => [
          String(item.id),
          item.name ??
            (`${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() ||
              item.email ||
              `Responder ${item.id}`),
        ]),
      ),
    [respondersQuery.data],
  );
  const latestAssignmentByIncident = useMemo(() => {
    const map = new Map<string, { responderId?: string; timestamp: number }>();

    for (const assignment of assignmentsQuery.data?.data ?? []) {
      const incidentId = assignment.incidentId
        ? String(assignment.incidentId)
        : null;
      if (!incidentId) {
        continue;
      }

      const existingAssignment = map.get(incidentId);
      const nextTimestamp = getAssignmentTimestamp(assignment);

      if (
        !existingAssignment ||
        nextTimestamp >= existingAssignment.timestamp
      ) {
        map.set(incidentId, {
          responderId: assignment.responderId
            ? String(assignment.responderId)
            : undefined,
          timestamp: nextTimestamp,
        });
      }
    }

    return map;
  }, [assignmentsQuery.data]);

  const columns: TableProps<Incident>["columns"] = [
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      width: 260,
    },
    {
      title: "Citizen",
      dataIndex: "citizenId",
      key: "citizenId",
      width: 180,
      render: (value: string) =>
        citizenLabels.get(String(value)) ?? `Citizen ${value ?? "N/A"}`,
    },
    {
      title: "Address",
      dataIndex: "addressLine1",
      key: "addressLine1",
      width: 260,
      render: (_value: string | undefined, row: Incident) =>
        getIncidentAddress(row),
    },
    {
      title: "Coordinates",
      key: "coordinates",
      width: 180,
      render: (_: unknown, row: Incident) =>
        hasCoordinates(row) ? `${row.latitude}, ${row.longitude}` : "N/A",
    },
    {
      title: "Status",
      dataIndex: "statusId",
      key: "statusId",
      width: 140,
      render: (value: string) => {
        const statusName =
          statusLabels.get(String(value)) ?? `Status ${value ?? "N/A"}`;

        return <Tag color={getStatusColor(statusName)}>{statusName}</Tag>;
      },
    },
    {
      title: "Assignee",
      key: "assignee",
      width: 180,
      render: (_: unknown, row: Incident) => {
        const assignment = latestAssignmentByIncident.get(String(row.id));
        const label = assignment?.responderId
          ? (responderLabels.get(assignment.responderId) ?? "Assigned")
          : "Unassigned";
        const relative =
          assignment && assignment.timestamp >= 0
            ? formatRelativeTime(new Date(assignment.timestamp).toISOString())
            : null;

        return (
          <div className={styles.cellStack}>
            <Text>{label}</Text>
            <Text className={styles.cellMeta}>
              {relative ? `Assigned ${relative}` : "No assignment yet"}
            </Text>
          </div>
        );
      },
    },
    {
      title: "Reported",
      dataIndex: "dateReported",
      key: "dateReported",
      width: 170,
      render: (value: unknown) => formatDateTime(value),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      render: (value: unknown) => formatDateTime(value),
    },
    {
      title: "Updated",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 170,
      render: (value: unknown) => formatDateTime(value),
    },
    {
      title: "Actions",
      key: "workspace",
      width: 180,
      render: (_: unknown, row: Incident) => (
        <Space size={4} wrap>
          <Button
            type="link"
            onClick={() => router.push(`/incidents/${row.id}`)}
          >
            Open workspace
          </Button>
          {row.citizenId ? (
            <Button
              type="link"
              onClick={() => router.push(`/citizens/${row.citizenId}`)}
            >
              Citizen
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  const columns: Array<SharedTableColumn<Incident>> = [
    { key: "description", title: "Description", filterKind: "text" },
    { key: "citizenId", title: "Citizen", filterKind: "select", selectOptions: citizenLabels },
    { key: "statusId", title: "Status", filterKind: "select", selectOptions: statusLabels },
    {
      key: "dateReported",
      title: "Reported",
      filterKind: "date",
      render: (value) => formatDateTime(value),
    },
    {
      key: "createdAt",
      title: "Created",
      filterKind: "date",
      sortable: true,
      render: (value) => formatDateTime(value),
    },
    {
      key: "updatedAt",
      title: "Updated",
      filterKind: "date",
      sortable: true,
      render: (value) => formatDateTime(value),
    },
  ];

  if (incidentsListQuery.isLoading) {
    return <LoadingState />;
  }

  if (incidentsListQuery.error) {
    return <ErrorState message={String(incidentsListQuery.error)} />;
  }

  const canCreate = hasRole(...CAN_CREATE_INCIDENT);
  const geocodedCount = rows.filter(hasCoordinates).length;
  const addressSnapshotCount = rows.filter(hasAddressSnapshot).length;
  const reportedTodayCount = rows.filter((incident) => {
    const value = incident.dateReported ?? incident.createdAt;
    if (!value) {
      return false;
    }

    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
      return false;
    }

    const now = new Date();

    return (
      parsed.getFullYear() === now.getFullYear() &&
      parsed.getMonth() === now.getMonth() &&
      parsed.getDate() === now.getDate()
    );
  }).length;
  const previewAddress = joinLocationParts([
    addressLine1Value,
    addressLine2Value,
    barangayValue,
    districtNameValue,
    cityNameValue,
    provinceNameValue,
    regionNameValue,
    postalCodeValue,
  ]);
  const previewCoordinates =
    latitudeValue && longitudeValue
      ? `${latitudeValue}, ${longitudeValue}`
      : null;
  const previewMapUrl =
    latitudeValue && longitudeValue
      ? `https://www.openstreetmap.org/?mlat=${encodeURIComponent(latitudeValue)}&mlon=${encodeURIComponent(longitudeValue)}#map=18/${encodeURIComponent(latitudeValue)}/${encodeURIComponent(longitudeValue)}`
      : null;

  const applyCurrentLocation = async () => {
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

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const addressSnapshot = await reverseGeocodeIncidentAddress(
        latitude,
        longitude,
      );

      form.setFieldsValue(addressSnapshot);
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

  const submit = async () => {
    try {
      const values = await form.validateFields();
      await createMutation.mutateAsync({
        description: values.description,
        mediaUrl: values.mediaUrl,
        dateReported: values.dateReported
          ? new Date(values.dateReported).toISOString()
          : undefined,
        citizenId: values.citizenId,
        categoryId: values.categoryId,
        severityId: values.severityId,
        statusId: values.statusId,
        latitude: values.latitude ? Number(values.latitude) : undefined,
        longitude: values.longitude ? Number(values.longitude) : undefined,
        addressLine1: values.addressLine1,
        addressLine2: values.addressLine2,
        barangay: values.barangay,
        districtName: values.districtName,
        cityName: values.cityName,
        provinceName: values.provinceName,
        regionName: values.regionName,
        postalCode: values.postalCode,
        landmark: values.landmark,
      });
      message.success("Incident created");
      form.resetFields();
      setOpen(false);
      setLocationLookupError(null);
    } catch (error) {
      const mapped = mapValidationErrorsToForm(form, error);
      if (!mapped) {
        const axiosError = error as AxiosError<ApiErrorPayload>;
        if (axiosError.response?.data?.message) {
          message.error(axiosError.response.data.message);
        }
      }
    }
  };

  return (
    <Space orientation="vertical" size={16} style={{ width: "100%" }}>
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Title level={3} style={{ margin: 0 }}>
          Incidents
        </Title>
        <RoleGuard allowedRoles={CAN_CREATE_INCIDENT} disableOnly>
          <Button type="primary" onClick={() => setOpen(true)} disabled={!canCreate}>
            Create Incident
          </Button>
        </RoleGuard>
      </Space>

      <SharedTable<Incident>
        rows={rows}
        columns={columns}
        loading={incidentsListQuery.isFetching}
        page={listQuery.page}
        pageSize={listQuery.pageSize}
        paginationMeta={pagination}
        onPageChange={listQuery.setPage}
        onPageSizeChange={listQuery.setPageSize}
        globalSearch={listQuery.search}
        onGlobalSearchChange={listQuery.setSearch}
        globalSearchPlaceholder="Search incidents"
        sortState={{ key: listQuery.sortBy, order: listQuery.sortOrder }}
        onSortChange={(columnKey, order) => {
          if (columnKey === "createdAt" || columnKey === "updatedAt") {
            listQuery.setSort(columnKey, order);
          }
        }}
        serverDateFilters={{
          createdAt: { from: listQuery.createdFrom, to: listQuery.createdTo },
          updatedAt: { from: listQuery.updatedFrom, to: listQuery.updatedTo },
        }}
        onServerDateFilterChange={(columnKey, value) => {
          if (columnKey === "createdAt") {
            listQuery.setCreatedRange(value.from, value.to);
            return;
          }

          listQuery.setUpdatedRange(value.from, value.to);
        }}
        topToolbar={
          <FilterToolbar
            state={listQuery}
            setters={listQuery}
            loading={Boolean(incidentsListQuery.isFetching)}
          />
        }
        scrollX={980}
      />

      <Modal
        title="Create Incident"
        open={open}
        onCancel={() => {
          setOpen(false);
          setLocationLookupError(null);
        }}
        onOk={() => void submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form<IncidentFormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
        >
          <div className={styles.modalBody}>
            <Button
              onClick={() => void applyCurrentLocation()}
              loading={locationLookupPending}
            >
              Use Current Location
            </Button>
            {locationLookupError ? (
              <Alert type="warning" showIcon title={locationLookupError} />
            ) : null}

            {previewAddress || previewCoordinates || landmarkValue ? (
              <Card
                size="small"
                title="Location Preview"
                className={styles.previewCard}
              >
                <div className={styles.previewStack}>
                  <Text>
                    <strong>Coordinates:</strong>{" "}
                    {previewCoordinates ?? "Not set"}
                  </Text>
                  <Text>
                    <strong>Address:</strong> {previewAddress ?? "Not set"}
                  </Text>
                  <Text>
                    <strong>Landmark:</strong>{" "}
                    {landmarkValue?.trim() || "Not set"}
                  </Text>
                  {previewMapUrl ? (
                    <Link href={previewMapUrl} target="_blank" rel="noreferrer">
                      Open in OpenStreetMap
                    </Link>
                  ) : null}
                </div>
              </Card>
            ) : null}

            <Card
              size="small"
              title="Incident details"
              className={styles.previewCard}
            >
              <div className={styles.sectionGrid}>
                <Form.Item
                  className={styles.fullSpan}
                  name="description"
                  label="Description"
                  rules={[
                    { required: true, message: "Description is required" },
                  ]}
                >
                  <Input.TextArea rows={3} />
                </Form.Item>

                <Form.Item name="mediaUrl" label="Media URL">
                  <Input placeholder="Optional evidence or attachment URL" />
                </Form.Item>

                <Form.Item name="dateReported" label="Date Reported">
                  <Input type="datetime-local" />
                </Form.Item>

                <Form.Item
                  name="citizenId"
                  label="Citizen"
                  rules={[{ required: true }]}
                >
                  <Select
                    options={citizenOptions}
                    loading={citizensQuery.isLoading}
                  />
                </Form.Item>

                <Form.Item
                  name="categoryId"
                  label="Category"
                  rules={[{ required: true }]}
                >
                  <Select
                    options={(categoriesQuery.data?.data ?? []).map((item) => ({
                      value: String(item.id),
                      label: item.name ?? `Category ${item.id}`,
                    }))}
                    loading={categoriesQuery.isLoading}
                  />
                </Form.Item>

                <Form.Item
                  name="severityId"
                  label="Severity"
                  rules={[{ required: true }]}
                >
                  <Select
                    options={severityOptions}
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
                    loading={severitiesQuery.isLoading}
                  />
                </Form.Item>

                <Form.Item
                  name="statusId"
                  label="Status"
                  rules={[{ required: true }]}
                >
                  <Select
                    options={statusOptions}
                    loading={statusesQuery.isLoading}
                  />
                </Form.Item>
              </div>
            </Card>

            <Card
              size="small"
              title="Location snapshot"
              className={styles.previewCard}
            >
              <div className={styles.sectionGrid}>
                <Form.Item name="latitude" label="Latitude">
                  <Input placeholder="e.g. 14.5995" />
                </Form.Item>

                <Form.Item name="longitude" label="Longitude">
                  <Input placeholder="e.g. 120.9842" />
                </Form.Item>

                <Form.Item name="addressLine1" label="Address Line 1">
                  <Input placeholder="House number, street, building" />
                </Form.Item>

                <Form.Item name="addressLine2" label="Address Line 2">
                  <Input placeholder="Subdivision, block, unit, or floor" />
                </Form.Item>

                <Form.Item name="barangay" label="Barangay">
                  <Input placeholder="Barangay" />
                </Form.Item>

                <Form.Item name="districtName" label="District">
                  <Input placeholder="District" />
                </Form.Item>

                <Form.Item name="cityName" label="City">
                  <Input placeholder="City" />
                </Form.Item>

                <Form.Item name="provinceName" label="Province">
                  <Input placeholder="Province" />
                </Form.Item>

                <Form.Item name="regionName" label="Region">
                  <Input placeholder="Region" />
                </Form.Item>

                <Form.Item name="postalCode" label="Postal Code">
                  <Input placeholder="Postal code" />
                </Form.Item>

                <Form.Item
                  className={styles.fullSpan}
                  name="landmark"
                  label="Landmark"
                >
                  <Input placeholder="Nearby landmark" />
                </Form.Item>
              </div>
            </Card>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
