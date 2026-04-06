"use client";

import {
  App,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import { AxiosError } from "axios";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ErrorState, LoadingState } from "@/components/common/PageStates";
import {
  defaultAssignmentsQueryState,
  useCreateAssignmentMutation,
  useAssignmentsQuery,
} from "@/features/assignments/api";
import {
  defaultIncidentsQueryState,
  fetchIncidentMediaAccessUrl,
  getIncidentMediaReference,
  useIncidentQuery,
  useUpdateIncidentMutation,
} from "@/features/incidents/api";
import {
  useCategoriesQuery,
  useCitizensQuery,
  useRespondersQuery,
  useSeveritiesQuery,
  useStatusesQuery,
} from "@/features/reference-data/api";
import {
  CAN_CREATE_ASSIGNMENT,
  CAN_CREATE_INCIDENT,
} from "@/lib/auth/permissions";
import {
  formatDisplayDateTime as formatDateTime,
  formatDisplayRelativeTime as formatRelativeTime,
} from "@/lib/format/date-time";
import {
  buildIncidentAddressLabel,
  buildIncidentCoordinatesLabel,
  getAssignmentDisplayDate,
  getResponderDisplayName,
  getStatusColor,
} from "@/lib/incidents/display";
import { mapValidationErrorsToForm } from "@/lib/forms/mapValidationErrors";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useAuth } from "@/context/AuthContext";
import type { ApiErrorPayload } from "@/types/api";
import { Role } from "@/types/auth";
import styles from "./page.module.css";

const { Text, Title } = Typography;

interface AssignmentQuickActionValues {
  responderId: string;
  statusId?: string;
  notes?: string;
}

interface StatusQuickActionValues {
  statusId: string;
}

function buildIncidentListUrl(incidentId: string): string {
  const params = new URLSearchParams({
    page: "1",
    pageSize: "20",
    filters: JSON.stringify([
      {
        field: "id",
        operator: "equals",
        value: incidentId,
      },
    ]),
  });

  return `/incidents?${params.toString()}`;
}

export default function IncidentWorkspacePage() {
  const { message } = App.useApp();
  const { hasRole } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const incidentId = params.id;
  const isCitizenReporter = hasRole(Role.CITIZEN_REPORTER);
  const canAssign = hasRole(...CAN_CREATE_ASSIGNMENT);
  const canManageIncident = hasRole(...CAN_CREATE_INCIDENT);
  const incidentQuery = useIncidentQuery(incidentId);
  const createAssignmentMutation = useCreateAssignmentMutation();
  const updateIncidentMutation = useUpdateIncidentMutation();
  const optionQueryState = useMemo(
    () => defaultIncidentsQueryState({ page: 1, pageSize: 200 }),
    [],
  );
  const assignmentQueryState = useMemo(
    () =>
      defaultAssignmentsQueryState({
        page: 1,
        pageSize: 100,
        filters: [
          {
            field: "incidentId",
            operator: "equals",
            value: incidentId,
          },
        ],
      }),
    [incidentId],
  );

  const assignmentsQuery = useAssignmentsQuery(assignmentQueryState, !isCitizenReporter);
  const citizensQuery = useCitizensQuery(optionQueryState, !isCitizenReporter);
  const respondersQuery = useRespondersQuery(optionQueryState, !isCitizenReporter);
  const statusesQuery = useStatusesQuery(optionQueryState);
  const severitiesQuery = useSeveritiesQuery(optionQueryState);
  const categoriesQuery = useCategoriesQuery(optionQueryState);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [mediaAccessPending, setMediaAccessPending] = useState(false);
  const [assignForm] = Form.useForm<AssignmentQuickActionValues>();
  const [statusForm] = Form.useForm<StatusQuickActionValues>();

  if (incidentQuery.isLoading) {
    return <LoadingState />;
  }

  if (incidentQuery.error || !incidentQuery.data) {
    return (
      <ErrorState
        message={String(incidentQuery.error ?? "Incident not found")}
      />
    );
  }

  const incident = incidentQuery.data;
  const assignments = [...(assignmentsQuery.data?.data ?? [])].sort(
    (left, right) => {
      const leftTime = new Date(getAssignmentDisplayDate(left) ?? 0).getTime();
      const rightTime = new Date(
        getAssignmentDisplayDate(right) ?? 0,
      ).getTime();
      return rightTime - leftTime;
    },
  );
  const latestAssignment = assignments[0];
  const citizens = citizensQuery.data?.data ?? [];
  const responders = respondersQuery.data?.data ?? [];
  const statuses = statusesQuery.data?.data ?? [];
  const severities = severitiesQuery.data?.data ?? [];
  const categories = categoriesQuery.data?.data ?? [];
  const responderOptions = responders.map((item) => ({
    value: String(item.id),
    label:
      item.name ??
      (`${item.firstName ?? ""} ${item.lastName ?? ""}`.trim() ||
        `Responder ${item.id}`),
  }));
  const statusOptions = statuses.map((item) => ({
    value: String(item.id),
    label: item.name ?? `Status ${item.id}`,
  }));

  const citizen = citizens.find(
    (item) => String(item.id) === String(incident.citizenId ?? ""),
  );
  const status = statuses.find(
    (item) => String(item.id) === String(incident.statusId ?? ""),
  );
  const severity = severities.find(
    (item) => String(item.id) === String(incident.severityId ?? ""),
  );
  const category = categories.find(
    (item) => String(item.id) === String(incident.categoryId ?? ""),
  );
  const responder = latestAssignment?.responderId
    ? responders.find(
        (item) => String(item.id) === String(latestAssignment.responderId),
      )
    : undefined;
  const mapUrl =
    incident.latitude !== undefined && incident.longitude !== undefined
      ? `https://www.openstreetmap.org/?mlat=${encodeURIComponent(String(incident.latitude))}&mlon=${encodeURIComponent(String(incident.longitude))}#map=18/${encodeURIComponent(String(incident.latitude))}/${encodeURIComponent(String(incident.longitude))}`
      : null;
  const mediaReference = getIncidentMediaReference(incident);

  const submitAssignment = async () => {
    try {
      const values = await assignForm.validateFields();
      await createAssignmentMutation.mutateAsync({
        incidentId: String(incident.id),
        responderId: values.responderId,
        statusId: values.statusId,
        notes: values.notes,
      });
      message.success("Responder assigned");
      assignForm.resetFields();
      setAssignModalOpen(false);
    } catch (error) {
      const mapped = mapValidationErrorsToForm(assignForm, error);
      if (!mapped) {
        const axiosError = error as AxiosError<ApiErrorPayload>;
        if (axiosError.response?.data?.message) {
          message.error(axiosError.response.data.message);
        }
      }
    }
  };

  const openStatusModal = () => {
    statusForm.setFieldsValue({
      statusId: String(incident.statusId ?? ""),
    });
    setStatusModalOpen(true);
  };

  const submitStatusUpdate = async () => {
    try {
      const values = await statusForm.validateFields();
      await updateIncidentMutation.mutateAsync({
        id: String(incident.id),
        payload: { statusId: values.statusId },
      });
      message.success("Incident status updated");
      setStatusModalOpen(false);
    } catch (error) {
      const mapped = mapValidationErrorsToForm(statusForm, error);
      if (!mapped) {
        const axiosError = error as AxiosError<ApiErrorPayload>;
        if (axiosError.response?.data?.message) {
          message.error(axiosError.response.data.message);
        }
      }
    }
  };

  const openIncidentMedia = async () => {
    if (mediaAccessPending) {
      return;
    }

    try {
      setMediaAccessPending(true);

      const resolvedUrl = mediaReference.mediaId
        ? await fetchIncidentMediaAccessUrl(
            String(incident.id),
            mediaReference.mediaId,
          )
        : mediaReference.fallbackUrl;

      if (!resolvedUrl) {
        message.info("No media attachment is available for this incident.");
        return;
      }

      window.open(resolvedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      if (mediaReference.fallbackUrl) {
        window.open(
          mediaReference.fallbackUrl,
          "_blank",
          "noopener,noreferrer",
        );
        message.warning(
          error instanceof Error
            ? `${error.message} Falling back to the stored media URL.`
            : "Falling back to the stored media URL.",
        );
        return;
      }

      message.error(
        error instanceof Error
          ? error.message
          : "Unable to open incident media.",
      );
    } finally {
      setMediaAccessPending(false);
    }
  };

  return (
    <div className={styles.pageShell}>
      <Card className={styles.heroCard} variant="borderless">
        <div className={styles.heroInner}>
          <div className={styles.heroHeader}>
            <div className={styles.heroCopy}>
              <Text className={styles.eyebrow}>Incident workspace</Text>
              <Title level={3} className={styles.heroTitle}>
                {incident.description?.trim() || `Incident ${incident.id}`}
              </Title>
              <Text className={styles.heroDescription}>
                Review the current incident snapshot, dispatch context, and
                captured location without returning to the list.
              </Text>
            </div>
            <div className={styles.heroActions}>
              <Button onClick={() => router.push("/incidents")}>
                Back to incidents
              </Button>
              <Button
                onClick={() =>
                  router.push(buildIncidentListUrl(String(incident.id)))
                }
              >
                Open in list
              </Button>
              {!isCitizenReporter && incident.citizenId ? (
                <Button
                  onClick={() => router.push(`/citizens/${incident.citizenId}`)}
                >
                  Open citizen
                </Button>
              ) : null}
              <RoleGuard allowedRoles={CAN_CREATE_INCIDENT} disableOnly>
                <Button onClick={openStatusModal} disabled={!canManageIncident}>
                  Change status
                </Button>
              </RoleGuard>
              <RoleGuard allowedRoles={CAN_CREATE_ASSIGNMENT} disableOnly>
                <Button
                  type="primary"
                  onClick={() => setAssignModalOpen(true)}
                  disabled={!canAssign}
                >
                  Assign responder
                </Button>
              </RoleGuard>
            </div>
          </div>

          <div className={styles.heroMetrics}>
            <div className={styles.metricTile}>
              <Statistic title="Status" value={status?.name ?? "Unknown"} />
              <Text className={styles.metricLabel}>
                Current lifecycle state
              </Text>
            </div>
            <div className={styles.metricTile}>
              <Statistic
                title="Severity"
                value={severity?.level ?? severity?.name ?? "Unspecified"}
              />
              <Text className={styles.metricLabel}>
                Dispatch priority signal
              </Text>
            </div>
            <div className={styles.metricTile}>
              <Statistic title="Assignments" value={isCitizenReporter ? 0 : assignments.length} />
              <Text className={styles.metricLabel}>
                {isCitizenReporter
                  ? "Assignment history is reserved for operator workflows"
                  : "Recorded assignment events"}
              </Text>
            </div>
            <div className={styles.metricTile}>
              <Statistic
                title="Coordinates"
                value={
                  incident.latitude !== undefined &&
                  incident.longitude !== undefined
                    ? "Captured"
                    : "Missing"
                }
              />
              <Text className={styles.metricLabel}>
                Location verification status
              </Text>
            </div>
          </div>
        </div>
      </Card>

      <div className={styles.contentGrid}>
        <div className={styles.mainStack}>
          <Card className={styles.sectionCard} variant="borderless">
            <Title level={4} className={styles.sectionTitle}>
              Incident snapshot
            </Title>
            <Text className={styles.sectionDescription}>
              Backend-aligned incident fields as currently recorded.
            </Text>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Incident ID">
                {String(incident.id)}
              </Descriptions.Item>
              <Descriptions.Item label="Description">
                {incident.description ?? "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={getStatusColor(status?.name ?? "Unknown")}>
                  {status?.name ?? "Unknown"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Severity">
                {severity?.level ?? severity?.name ?? "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Category">
                {category?.name ?? "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Citizen">
                {citizen?.name ?? String(incident.citizenId ?? "N/A")}
              </Descriptions.Item>
              <Descriptions.Item label="Reported">
                {formatDateTime(incident.dateReported)}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {formatDateTime(incident.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Updated">
                {formatDateTime(incident.updatedAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Media evidence">
                {mediaReference.mediaId || mediaReference.fallbackUrl ? (
                  <Button
                    type="link"
                    style={{ paddingInline: 0 }}
                    loading={mediaAccessPending}
                    onClick={() => void openIncidentMedia()}
                  >
                    {mediaReference.mediaId
                      ? "Open secured media"
                      : "Open media"}
                  </Button>
                ) : (
                  "N/A"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Landmark">
                {incident.landmark ?? "N/A"}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {isCitizenReporter ? null : (
            <Card className={styles.sectionCard} variant="borderless">
              <Title level={4} className={styles.sectionTitle}>
                Assignment activity
              </Title>
              <Text className={styles.sectionDescription}>
                Recent assignment records tied to this incident.
              </Text>
              {assignmentsQuery.isLoading ? (
                <LoadingState />
              ) : assignments.length === 0 ? (
                <Text className={styles.emptyText}>
                  No assignments recorded for this incident yet.
                </Text>
              ) : (
                <div className={styles.assignmentList}>
                  {assignments.map((assignment) => {
                    const assignmentResponder = assignment.responderId
                      ? responders.find(
                          (item) =>
                            String(item.id) === String(assignment.responderId),
                        )
                      : undefined;
                    const assignmentStatus = assignment.statusId
                      ? statuses.find(
                          (item) =>
                            String(item.id) === String(assignment.statusId),
                        )
                      : undefined;

                    return (
                      <div
                        key={String(assignment.id)}
                        className={styles.assignmentRow}
                      >
                        <Space wrap size={8}>
                          <Text strong>
                            {getResponderDisplayName(assignmentResponder)}
                          </Text>
                          <Tag
                            color={getStatusColor(
                              assignmentStatus?.name ?? status?.name ?? "Unknown",
                            )}
                          >
                            {assignmentStatus?.name ??
                              status?.name ??
                              "Status not set"}
                          </Tag>
                        </Space>
                        <Text type="secondary">
                          Assigned{" "}
                          {formatDateTime(getAssignmentDisplayDate(assignment))}
                        </Text>
                        <Text className={styles.assignmentMeta}>
                          {formatRelativeTime(
                            getAssignmentDisplayDate(assignment),
                          ) ?? "Assignment time unavailable"}
                        </Text>
                        <Text>
                          {assignment.notes?.trim() || "No notes provided."}
                        </Text>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}
        </div>

        <div className={styles.sidebarStack}>
          <Card className={styles.sectionCard} variant="borderless">
            <Title level={4} className={styles.sectionTitle}>
              Location snapshot
            </Title>
            <Text className={styles.sectionDescription}>
              Captured coordinates and reverse-geocoded address details used for
              incident response.
            </Text>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Coordinates">
                {buildIncidentCoordinatesLabel(incident)}
              </Descriptions.Item>
              <Descriptions.Item label="Address">
                {buildIncidentAddressLabel(incident, "full")}
              </Descriptions.Item>
              <Descriptions.Item label="Landmark">
                {incident.landmark ?? "N/A"}
              </Descriptions.Item>
            </Descriptions>
            {mapUrl ? (
              <Button
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                style={{ marginTop: 16 }}
              >
                Open in OpenStreetMap
              </Button>
            ) : null}
          </Card>

          {isCitizenReporter ? null : (
            <Card className={styles.sectionCard} variant="borderless">
              <Title level={4} className={styles.sectionTitle}>
                Active context
              </Title>
              <Text className={styles.sectionDescription}>
                The primary related records that operators usually need alongside
                the incident.
              </Text>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Current responder">
                  {getResponderDisplayName(responder)}
                </Descriptions.Item>
                <Descriptions.Item label="Latest assignment">
                  {latestAssignment
                    ? formatDateTime(getAssignmentDisplayDate(latestAssignment))
                    : "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Citizen channel">
                  {citizen?.preferredChannel ?? "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Citizen contact">
                  {citizen?.contactInfo ?? "N/A"}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          <Card className={styles.sectionCard} variant="borderless">
            <Title level={4} className={styles.sectionTitle}>
              Quick actions
            </Title>
            <Text className={styles.sectionDescription}>
              Dispatch from the workspace without leaving the incident context.
            </Text>
            <div className={styles.actionStack}>
              <RoleGuard allowedRoles={CAN_CREATE_INCIDENT} disableOnly>
                <Button onClick={openStatusModal} disabled={!canManageIncident}>
                  Change status
                </Button>
              </RoleGuard>
              <RoleGuard allowedRoles={CAN_CREATE_ASSIGNMENT} disableOnly>
                <Button
                  type="primary"
                  onClick={() => setAssignModalOpen(true)}
                  disabled={!canAssign}
                >
                  Assign responder
                </Button>
              </RoleGuard>
              {isCitizenReporter ? null : (
                <Button onClick={() => router.push("/assignments")}>
                  Open assignments board
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal
        title="Assign responder"
        open={assignModalOpen}
        onCancel={() => setAssignModalOpen(false)}
        onOk={() => void submitAssignment()}
        confirmLoading={createAssignmentMutation.isPending}
      >
        <Form<AssignmentQuickActionValues>
          form={assignForm}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="responderId"
            label="Responder"
            rules={[{ required: true, message: "Responder is required" }]}
          >
            <Select
              options={responderOptions}
              loading={respondersQuery.isLoading}
              placeholder="Select responder"
            />
          </Form.Item>

          <Form.Item name="statusId" label="Assignment Status">
            <Select
              allowClear
              options={statusOptions}
              loading={statusesQuery.isLoading}
              placeholder="Optional status"
            />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea
              rows={4}
              placeholder="Dispatch notes or assignment context"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Change incident status"
        open={statusModalOpen}
        onCancel={() => setStatusModalOpen(false)}
        onOk={() => void submitStatusUpdate()}
        confirmLoading={updateIncidentMutation.isPending}
      >
        <Form<StatusQuickActionValues>
          form={statusForm}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="statusId"
            label="Status"
            rules={[{ required: true, message: "Status is required" }]}
          >
            <Select
              options={statusOptions}
              loading={statusesQuery.isLoading}
              placeholder="Select status"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
