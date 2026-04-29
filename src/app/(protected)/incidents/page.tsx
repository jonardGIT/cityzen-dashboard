"use client";

import { InfoCircleOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
  Result,
} from "antd";
import { AxiosError } from "axios";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FilterToolbar } from "@/components/common/FilterToolbar";
import { ErrorState, LoadingState } from "@/components/common/PageStates";
import {
  SharedTable,
  type SharedTableColumn,
} from "@/components/crud/SharedTable";
import { useAuth } from "@/context/AuthContext";
import {
  defaultAssignmentsQueryState,
  useAssignmentsQuery,
} from "@/features/assignments/api";
import { getCrudEndpoint } from "@/features/dynamic-crud/config";
import { useCrudEndpointAvailability } from "@/features/dynamic-crud/openapi";
import {
  type AuditorIncident,
  uploadIncidentMedia,
  useAuditorIncidentsQuery,
  useCreateIncidentMutation,
  useIncidentsQuery,
  useReportIncidentMutation,
} from "@/features/incidents/api";
import {
  useCategoriesQuery,
  useCitizensQuery,
  useRespondersQuery,
  useSeveritiesQuery,
  useStatusesQuery,
} from "@/features/reference-data/api";
import {
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  type ListQueryState,
} from "@/lib/api/list-query-params";
import { canAccessCrudResource } from "@/lib/auth/navigation";
import { CAN_CREATE_INCIDENT } from "@/lib/auth/permissions";
import {
  formatDisplayDateTime,
  formatDisplayRelativeTime,
} from "@/lib/format/date-time";
import {
  buildIncidentAddressLabel,
  getStatusColor,
  joinDisplayParts,
} from "@/lib/incidents/display";
import { mapValidationErrorsToForm } from "@/lib/forms/mapValidationErrors";
import { reverseGeocodeIncidentAddress } from "@/lib/geo/reverse-geocode";
import { useListQueryParams } from "@/hooks/useListQueryParams";
import type { ApiErrorPayload, Incident } from "@/types/api";
import { Role } from "@/types/auth";
import styles from "./page.module.css";

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

function getIncidentAddress(incident: Incident): string {
  return buildIncidentAddressLabel(incident);
}

function hasCoordinates(incident: Incident): boolean {
  return incident.latitude !== undefined && incident.longitude !== undefined;
}

function hasAddressSnapshot(incident: Incident): boolean {
  return Boolean(
    joinDisplayParts([
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

export default function IncidentsPage() {
  const { message } = App.useApp();
  const { user, capabilities, isAuthenticated, hasRole } = useAuth();
  const router = useRouter();
  const canAccessPage = canAccessCrudResource(
    {
      role: user?.role,
      capabilities,
      isAuthenticated,
    },
    "incidents",
  );
  const isAuditor = hasRole(Role.AUDITOR);
  const isCitizenReporter = hasRole(Role.CITIZEN_REPORTER);
  const canCreateAdminIncident = hasRole(...CAN_CREATE_INCIDENT);
  const optionQueryState: ListQueryState = {
    page: 1,
    pageSize: 200,
    search: "",
    sortBy: DEFAULT_SORT_BY,
    sortOrder: DEFAULT_SORT_ORDER,
    filters: [],
  };
  const canLoadAdminOptions = canAccessPage && !isCitizenReporter && !isAuditor;
  const citizensQuery = useCitizensQuery(optionQueryState, canLoadAdminOptions);
  const categoriesQuery = useCategoriesQuery(optionQueryState, canAccessPage);
  const severitiesQuery = useSeveritiesQuery(optionQueryState, canAccessPage);
  const statusesQuery = useStatusesQuery(optionQueryState, canAccessPage);
  const respondersQuery = useRespondersQuery(
    optionQueryState,
    canLoadAdminOptions,
  );
  const assignmentsQuery = useAssignmentsQuery(
    defaultAssignmentsQueryState({ page: 1, pageSize: 200 }),
    canLoadAdminOptions,
  );
  const createMutation = useCreateIncidentMutation();
  const reportMutation = useReportIncidentMutation();
  const mediaUploadAvailability = useCrudEndpointAvailability(
    getCrudEndpoint("incidents", "mediaUpload"),
  );
  const [open, setOpen] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const [locationLookupPending, setLocationLookupPending] = useState(false);
  const [locationLookupError, setLocationLookupError] = useState<string | null>(
    null,
  );
  const [mediaUploadPending, setMediaUploadPending] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
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

  const incidentsListQuery = useIncidentsQuery(
    listQuery,
    canAccessPage && !isAuditor,
  );
  const auditorIncidentsListQuery = useAuditorIncidentsQuery(
    listQuery,
    canAccessPage && isAuditor,
  );
  const incidentListQuery = isAuditor
    ? auditorIncidentsListQuery
    : incidentsListQuery;
  const rows = incidentsListQuery.data?.data ?? [];
  const auditorRows = auditorIncidentsListQuery.data?.data ?? [];
  const pagination = incidentListQuery.data?.pagination;
  const totalIncidents =
    pagination?.total ?? (isAuditor ? auditorRows.length : rows.length);

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
          item.name ?? `Responder ${item.id}`,
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

  if (!canAccessPage) {
    return (
      <Result
        status="403"
        title="Forbidden"
        subTitle="You do not have permission to access incidents."
      />
    );
  }

  const columns: Array<SharedTableColumn<Incident>> = [
    {
      key: "description",
      title: "Description",
      filterKind: "text",
      width: 260,
    },
    {
      key: "citizenId",
      title: "Citizen",
      filterKind: "select",
      selectOptions: citizenLabels,
      width: 180,
      render: (value) =>
        citizenLabels.get(String(value ?? "")) ?? `Citizen ${value ?? "N/A"}`,
    },
    {
      key: "addressLine1",
      title: "Address",
      filterKind: "text",
      width: 260,
      render: (_value, row) => getIncidentAddress(row),
    },
    {
      key: "coordinates",
      title: "Coordinates",
      width: 180,
      render: (_value, row) =>
        hasCoordinates(row) ? `${row.latitude}, ${row.longitude}` : "N/A",
    },
    {
      key: "statusId",
      title: "Status",
      filterKind: "select",
      selectOptions: statusLabels,
      width: 140,
      render: (value) => {
        const statusName =
          statusLabels.get(String(value ?? "")) ?? `Status ${value ?? "N/A"}`;

        return <Tag color={getStatusColor(statusName)}>{statusName}</Tag>;
      },
    },
    {
      key: "assignee",
      title: "Assignee",
      width: 180,
      render: (_value, row) => {
        const assignment = latestAssignmentByIncident.get(String(row.id));
        const label = assignment?.responderId
          ? (responderLabels.get(assignment.responderId) ?? "Assigned")
          : "Unassigned";
        const relative =
          assignment && assignment.timestamp >= 0
            ? formatDisplayRelativeTime(
                new Date(assignment.timestamp).toISOString(),
              )
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
      key: "dateReported",
      title: "Reported",
      filterKind: "date",
      width: 170,
      render: (value) => formatDisplayDateTime(value),
    },
    {
      key: "createdAt",
      title: "Created",
      filterKind: "date",
      sortable: true,
      width: 170,
      render: (value) => formatDisplayDateTime(value),
    },
    {
      key: "updatedAt",
      title: "Updated",
      filterKind: "date",
      sortable: true,
      width: 170,
      render: (value) => formatDisplayDateTime(value),
    },
  ];

  const auditorColumns: Array<SharedTableColumn<AuditorIncident>> = [
    {
      key: "publicReference",
      title: "Reference",
      filterKind: "text",
      width: 180,
    },
    {
      key: "category",
      title: "Category",
      filterKind: "text",
      width: 220,
      render: (_value, row) => row.category.name,
    },
    {
      key: "severity",
      title: "Severity",
      width: 160,
      render: (_value, row) => row.severity.level,
    },
    {
      key: "status",
      title: "Status",
      width: 160,
      render: (_value, row) => (
        <Tag color={getStatusColor(row.status.name)}>{row.status.name}</Tag>
      ),
    },
    {
      key: "location",
      title: "Location",
      width: 260,
      render: (_value, row) =>
        joinDisplayParts([
          row.barangay,
          row.cityName,
          row.provinceName,
          row.regionName,
        ]) || "N/A",
    },
    {
      key: "assignmentCount",
      title: "Assignments",
      width: 140,
    },
    {
      key: "statusHistoryCount",
      title: "Status history",
      width: 150,
    },
    {
      key: "dateReported",
      title: "Reported",
      filterKind: "date",
      width: 170,
      render: (value) => formatDisplayDateTime(value),
    },
    {
      key: "createdAt",
      title: "Created",
      filterKind: "date",
      sortable: true,
      width: 170,
      render: (value) => formatDisplayDateTime(value),
    },
    {
      key: "updatedAt",
      title: "Updated",
      filterKind: "date",
      sortable: true,
      width: 170,
      render: (value) => formatDisplayDateTime(value),
    },
  ];

  if (incidentListQuery.isLoading) {
    return <LoadingState />;
  }

  if (incidentListQuery.error) {
    return <ErrorState message={String(incidentListQuery.error)} />;
  }

  const canOpenIncidentModal = canCreateAdminIncident || isCitizenReporter;
  const geocodedCount = isAuditor ? 0 : rows.filter(hasCoordinates).length;
  const addressSnapshotCount = isAuditor
    ? auditorRows.filter((incident) =>
        Boolean(
          joinDisplayParts([
            incident.barangay,
            incident.cityName,
            incident.provinceName,
            incident.regionName,
          ]),
        ),
      ).length
    : rows.filter(hasAddressSnapshot).length;
  const reportedTodayCount = (isAuditor ? auditorRows : rows).filter(
    (incident) => {
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
    },
  ).length;
  const previewAddress = joinDisplayParts([
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
      const dateReported = values.dateReported
        ? new Date(values.dateReported).toISOString()
        : undefined;
      const locationPayload = {
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
      };

      if (isCitizenReporter) {
        await reportMutation.mutateAsync({
          description: values.description,
          dateReported,
          categoryId: values.categoryId,
          severityId: values.severityId,
          ...locationPayload,
        });
        message.success("Incident reported");
      } else {
        await createMutation.mutateAsync({
          description: values.description,
          mediaUrl: values.mediaUrl,
          dateReported,
          citizenId: values.citizenId,
          categoryId: values.categoryId,
          severityId: values.severityId,
          statusId: values.statusId,
          ...locationPayload,
        });
        message.success("Incident created");
      }

      form.resetFields();
      setOpen(false);
      setLocationLookupError(null);
      setMediaUploadError(null);
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
      message.success("Media uploaded and attached to the incident draft.");
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
    <div className={styles.pageShell}>
      <Card className={styles.heroCard}>
        <div className={styles.heroInner}>
          <div className={styles.heroHeader}>
            <div className={styles.heroCopy}>
              <Text className={styles.eyebrow}>Incident operations</Text>
              <Title level={3} className={styles.heroTitle}>
                Triage, capture, and review incident reports from one workspace.
              </Title>
              <Text className={styles.heroDescription}>
                {isCitizenReporter
                  ? "Report incidents with the required location snapshot fields and track the records attached to your account."
                  : isAuditor
                    ? "Review the redacted auditor-safe incident projection and monitor incident activity without exposing operationally sensitive fields."
                    : "Keep the live queue searchable, verify location snapshots quickly, and create new incident records with the backend-aligned address contract."}
              </Text>
            </div>
            {canOpenIncidentModal ? (
              <Button
                className={styles.heroAction}
                type="primary"
                size="large"
                onClick={() => setOpen(true)}
              >
                {isCitizenReporter ? "Report Incident" : "Create Incident"}
              </Button>
            ) : null}
          </div>

          <div className={styles.heroMetrics}>
            <div className={styles.metricTile}>
              <Statistic value={totalIncidents} title="Total incidents" />
              <Text className={styles.metricLabel}>
                Across the current server query.
              </Text>
            </div>
            <div className={styles.metricTile}>
              <Statistic
                value={isAuditor ? auditorRows.length : rows.length}
                title="Visible rows"
              />
              <Text className={styles.metricLabel}>
                Current page after filters and search.
              </Text>
            </div>
            <div className={styles.metricTile}>
              <Statistic value={geocodedCount} title="With coordinates" />
              <Text className={styles.metricLabel}>
                Ready for map-based verification.
              </Text>
            </div>
            <div className={styles.metricTile}>
              <Statistic value={reportedTodayCount} title="Reported today" />
              <Text className={styles.metricLabel}>
                Based on reported or created timestamps.
              </Text>
            </div>
          </div>
        </div>
      </Card>

      <Card className={styles.controlCard}>
        <div className={styles.controlStack}>
          <div className={styles.controlHeader}>
            <Input.Search
              allowClear
              placeholder="Search incidents by description or record context"
              value={listQuery.search}
              onChange={(event) => listQuery.setSearch(event.target.value)}
              style={{ maxWidth: 420 }}
            />
            <Text className={styles.controlMeta}>
              {addressSnapshotCount} records include address snapshots in this
              result set.
            </Text>
          </div>
          <FilterToolbar
            state={listQuery}
            setters={listQuery}
            loading={Boolean(incidentsListQuery.isFetching)}
          />
        </div>
      </Card>

      <div className={styles.contentGrid}>
        <Card className={styles.tableCard}>
          <div className={styles.sectionHeader}>
            <Title level={4} className={styles.sectionTitle}>
              Live incident queue
            </Title>
            <Text className={styles.sectionDescription}>
              {isAuditor
                ? "Review the backend redacted incident projection for audit and compliance workflows."
                : "Review current incident records, verify address quality, and move into follow-up actions."}
            </Text>
          </div>
          {isAuditor ? (
            <SharedTable<AuditorIncident>
              rows={auditorRows}
              columns={auditorColumns}
              storageKey="incidents-auditor-shared-table"
              loading={incidentListQuery.isFetching}
              page={listQuery.page}
              pageSize={listQuery.pageSize}
              paginationMeta={pagination}
              onPageChange={listQuery.setPage}
              onPageSizeChange={listQuery.setPageSize}
              globalSearch={listQuery.search}
              sortState={{ key: listQuery.sortBy, order: listQuery.sortOrder }}
              onSortChange={(columnKey, order) => {
                if (columnKey === "createdAt" || columnKey === "updatedAt") {
                  listQuery.setSort(columnKey, order);
                }
              }}
              serverDateFilters={{
                createdAt: {
                  from: listQuery.createdFrom,
                  to: listQuery.createdTo,
                },
                updatedAt: {
                  from: listQuery.updatedFrom,
                  to: listQuery.updatedTo,
                },
              }}
              onServerDateFilterChange={(columnKey, value) => {
                if (columnKey === "createdAt") {
                  listQuery.setCreatedRange(value.from, value.to);
                  return;
                }

                listQuery.setUpdatedRange(value.from, value.to);
              }}
              topToolbar={null}
              scrollX={1600}
            />
          ) : (
            <SharedTable<Incident>
              rows={rows}
              columns={columns}
              storageKey="incidents-shared-table"
              loading={incidentListQuery.isFetching}
              page={listQuery.page}
              pageSize={listQuery.pageSize}
              paginationMeta={pagination}
              onPageChange={listQuery.setPage}
              onPageSizeChange={listQuery.setPageSize}
              globalSearch={listQuery.search}
              sortState={{ key: listQuery.sortBy, order: listQuery.sortOrder }}
              onSortChange={(columnKey, order) => {
                if (columnKey === "createdAt" || columnKey === "updatedAt") {
                  listQuery.setSort(columnKey, order);
                }
              }}
              serverDateFilters={{
                createdAt: {
                  from: listQuery.createdFrom,
                  to: listQuery.createdTo,
                },
                updatedAt: {
                  from: listQuery.updatedFrom,
                  to: listQuery.updatedTo,
                },
              }}
              onServerDateFilterChange={(columnKey, value) => {
                if (columnKey === "createdAt") {
                  listQuery.setCreatedRange(value.from, value.to);
                  return;
                }

                listQuery.setUpdatedRange(value.from, value.to);
              }}
              topToolbar={null}
              scrollX={1360}
              actionColumn={{
                title: "Actions",
                width: 180,
                render: (row) => (
                  <Space size={4} wrap>
                    <Button
                      type="link"
                      onClick={() => router.push(`/incidents/${row.id}`)}
                    >
                      Open workspace
                    </Button>
                    {!isCitizenReporter && row.citizenId ? (
                      <Button
                        type="link"
                        onClick={() =>
                          router.push(`/citizens/${row.citizenId}`)
                        }
                      >
                        Citizen
                      </Button>
                    ) : null}
                  </Space>
                ),
              }}
            />
          )}
        </Card>

        <Card className={styles.sidebarCard}>
          <div className={styles.sectionHeader}>
            <Title level={4} className={styles.sectionTitle}>
              Capture checklist
            </Title>
            <Text className={styles.sectionDescription}>
              Keep the incident payload complete before dispatch and assignment
              workflows begin.
            </Text>
          </div>
          <div className={styles.sidebarList}>
            <div className={styles.sidebarItem}>
              <Text className={styles.sidebarLabel}>Location snapshot</Text>
              <Text>
                Collect coordinates plus address fields so the incident stays
                valid even if upstream geo services change later.
              </Text>
            </div>
            <div className={styles.sidebarItem}>
              <Text className={styles.sidebarLabel}>Severity and status</Text>
              <Text>
                {isCitizenReporter
                  ? "Choose category and severity so operators can triage the report quickly once it reaches the response queue."
                  : "Set both on creation so the dashboard can place the incident in the correct queue immediately."}
              </Text>
            </div>
            <div className={styles.sidebarItem}>
              <Text className={styles.sidebarLabel}>Media evidence</Text>
              <Text>
                {isCitizenReporter
                  ? "The self-service report flow stays limited to the backend contract fields for incident details and location snapshot data."
                  : "Add a resolvable media URL when supporting photos or attachments exist."}
              </Text>
            </div>
            <div className={styles.sidebarItem}>
              <Text className={styles.sidebarLabel}>Current signal</Text>
              <Text>
                {geocodedCount} visible records already have coordinates, and{" "}
                {addressSnapshotCount} include address snapshots.
              </Text>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        title={isCitizenReporter ? "Report Incident" : "Create Incident"}
        open={open}
        onCancel={() => {
          setOpen(false);
          setLocationLookupError(null);
        }}
        onOk={() => void submit()}
        confirmLoading={createMutation.isPending || reportMutation.isPending}
      >
        <Form<IncidentFormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
        >
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*,.pdf"
            style={{ display: "none" }}
            onChange={(event) => void handleMediaFileSelection(event)}
          />
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

                {isCitizenReporter ? null : (
                  <Form.Item
                    name="mediaUrl"
                    label="Media URL"
                    extra={
                      <Space
                        orientation="vertical"
                        size={8}
                        style={{ width: "100%" }}
                      >
                        <Text>
                          Upload evidence through the configured media endpoint
                          or paste an existing URL.
                        </Text>
                        <Space wrap>
                          {mediaUploadAvailability.isAvailable ? (
                            <Button
                              onClick={() => mediaInputRef.current?.click()}
                              loading={mediaUploadPending}
                            >
                              Upload Media
                            </Button>
                          ) : null}
                          <Button
                            onClick={() => {
                              form.setFieldValue("mediaUrl", undefined);
                              setMediaUploadError(null);
                            }}
                            disabled={mediaUploadPending}
                          >
                            Clear
                          </Button>
                        </Space>
                        {mediaUploadError ? (
                          <Alert
                            type="warning"
                            showIcon
                            title={mediaUploadError}
                          />
                        ) : null}
                        {!mediaUploadAvailability.isAvailable ? (
                          <Alert
                            type="info"
                            showIcon
                            title="The current backend feature profile supports URL-based media references only."
                          />
                        ) : null}
                      </Space>
                    }
                  >
                    <Input placeholder="Optional evidence or attachment URL" />
                  </Form.Item>
                )}

                <Form.Item name="dateReported" label="Date Reported">
                  <Input type="datetime-local" />
                </Form.Item>

                {isCitizenReporter ? null : (
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
                )}

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

                {isCitizenReporter ? null : (
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
                )}
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
