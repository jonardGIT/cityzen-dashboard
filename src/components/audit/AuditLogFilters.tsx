"use client";

import {
  Alert,
  Button,
  DatePicker,
  Flex,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useMemo } from "react";
import type { AuditLogListValidationState } from "@/lib/api/auditLogs";
import type { ListQueryResult } from "@/hooks/useListQueryParams";
import type { ListFilter } from "@/lib/api/list-query-params";
import type { AuditLog } from "@/types/api";

const { RangePicker } = DatePicker;
const { Text } = Typography;

function getSingleFilterValue(
  filters: ListFilter[],
  field: string,
): string | undefined {
  const match = filters.find((filter) => filter.field === field);

  if (!match || Array.isArray(match.value)) {
    return undefined;
  }

  return String(match.value);
}

function getDateFilterValue(
  filters: ListFilter[],
  field: string,
): [dayjs.Dayjs | null, dayjs.Dayjs | null] {
  const match = filters.find((filter) => filter.field === field);

  if (!match) {
    return [null, null];
  }

  if (match.operator === "between" && Array.isArray(match.value)) {
    return [
      typeof match.value[0] === "string" ? dayjs(match.value[0]) : null,
      typeof match.value[1] === "string" ? dayjs(match.value[1]) : null,
    ];
  }

  if (!Array.isArray(match.value)) {
    return [
      match.operator === "gte" && typeof match.value === "string"
        ? dayjs(match.value)
        : null,
      match.operator === "lte" && typeof match.value === "string"
        ? dayjs(match.value)
        : null,
    ];
  }

  return [null, null];
}

function getFieldErrors(
  validationState: AuditLogListValidationState | null | undefined,
  field: string,
) {
  return validationState?.filterErrorsByField[field] ?? [];
}

function renderFieldError(
  validationState: AuditLogListValidationState | null | undefined,
  field: string,
) {
  const fieldErrors = getFieldErrors(validationState, field);

  if (fieldErrors.length === 0) {
    return null;
  }

  return <Text type="danger">{fieldErrors.join(" ")}</Text>;
}

function toOptionList(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  ).map((value) => ({ value, label: value }));
}

interface AuditLogFiltersProps {
  rows: AuditLog[];
  state: ListQueryResult;
  loading?: boolean;
  validationState?: AuditLogListValidationState | null;
}

export function AuditLogFilters({
  rows,
  state,
  loading,
  validationState,
}: AuditLogFiltersProps) {
  const outcomeValue = getSingleFilterValue(state.filters, "outcome");
  const actionValue = getSingleFilterValue(state.filters, "action");
  const resourceValue = getSingleFilterValue(state.filters, "resource");
  const actorEmailValue = getSingleFilterValue(state.filters, "actorEmail");
  const actorRoleValue = getSingleFilterValue(state.filters, "actorRole");
  const methodValue = getSingleFilterValue(state.filters, "method");
  const statusCodeValue = getSingleFilterValue(state.filters, "statusCode");
  const targetIdValue = getSingleFilterValue(state.filters, "targetId");
  const requestIdValue = getSingleFilterValue(state.filters, "requestId");
  const timestampRange = getDateFilterValue(state.filters, "timestamp");
  const createdRange: [dayjs.Dayjs | null, dayjs.Dayjs | null] = [
    state.createdFrom ? dayjs(state.createdFrom) : null,
    state.createdTo ? dayjs(state.createdTo) : null,
  ];
  const updatedRange: [dayjs.Dayjs | null, dayjs.Dayjs | null] = [
    state.updatedFrom ? dayjs(state.updatedFrom) : null,
    state.updatedTo ? dayjs(state.updatedTo) : null,
  ];

  const actionOptions = useMemo(
    () => toOptionList(rows.map((row) => row.action)),
    [rows],
  );
  const resourceOptions = useMemo(
    () => toOptionList(rows.map((row) => row.resource)),
    [rows],
  );
  const actorRoleOptions = useMemo(
    () => toOptionList(rows.map((row) => row.actorRole)),
    [rows],
  );

  const setFilter = (
    field: string,
    value: string | number | null,
    operator: ListFilter["operator"],
  ) => {
    if (
      value === null ||
      value === undefined ||
      String(value).trim().length === 0
    ) {
      state.removeFilter(field);
      return;
    }

    state.upsertFilter({
      field,
      operator,
      value: typeof value === "number" ? value : String(value).trim(),
    });
  };

  const clearQuickFilters = () => {
    state.setFilters(
      state.filters.filter(
        (filter) =>
          ![
            "outcome",
            "action",
            "resource",
            "actorEmail",
            "actorRole",
            "method",
            "statusCode",
            "targetId",
            "requestId",
            "timestamp",
          ].includes(filter.field),
      ),
    );
    state.clearDateFilters();
  };

  return (
    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
      {validationState && validationState.generalErrors.length > 0 ? (
        <Alert
          type="error"
          showIcon
          title={validationState.message}
          description={validationState.generalErrors.join(" ")}
        />
      ) : null}

      <Input.Search
        allowClear
        disabled={loading}
        placeholder="Search audit logs by summary, path, actor, request ID, or metadata context"
        defaultValue={state.search}
        onChange={(event) => state.setSearch(event.target.value)}
      />

      <Flex gap={12} wrap="wrap" align="flex-start">
        <Space orientation="vertical" size={4}>
          <Text strong>Outcome</Text>
          <Select
            allowClear
            disabled={loading}
            style={{ width: 160 }}
            placeholder="Outcome"
            value={outcomeValue}
            options={[
              { value: "success", label: "Success" },
              { value: "failure", label: "Failure" },
            ]}
            onChange={(value) => setFilter("outcome", value ?? null, "equals")}
          />
          {renderFieldError(validationState, "outcome")}
        </Space>

        <Space orientation="vertical" size={4}>
          <Text strong>Action</Text>
          <Select
            allowClear
            showSearch
            disabled={loading}
            style={{ width: 180 }}
            placeholder="Action"
            value={actionValue}
            options={actionOptions}
            onChange={(value) => setFilter("action", value ?? null, "equals")}
          />
          {renderFieldError(validationState, "action")}
        </Space>

        <Space orientation="vertical" size={4}>
          <Text strong>Resource</Text>
          <Select
            allowClear
            showSearch
            disabled={loading}
            style={{ width: 180 }}
            placeholder="Resource"
            value={resourceValue}
            options={resourceOptions}
            onChange={(value) => setFilter("resource", value ?? null, "equals")}
          />
          {renderFieldError(validationState, "resource")}
        </Space>

        <Space orientation="vertical" size={4}>
          <Text strong>Actor Email</Text>
          <Input
            allowClear
            disabled={loading}
            placeholder="Actor email"
            style={{ width: 220 }}
            value={actorEmailValue}
            onChange={(event) =>
              setFilter("actorEmail", event.target.value || null, "contains")
            }
          />
          {renderFieldError(validationState, "actorEmail")}
        </Space>

        <Space orientation="vertical" size={4}>
          <Text strong>Actor Role</Text>
          <Select
            allowClear
            showSearch
            disabled={loading}
            style={{ width: 180 }}
            placeholder="Actor role"
            value={actorRoleValue}
            options={actorRoleOptions}
            onChange={(value) =>
              setFilter("actorRole", value ?? null, "equals")
            }
          />
          {renderFieldError(validationState, "actorRole")}
        </Space>

        <Space orientation="vertical" size={4}>
          <Text strong>Method</Text>
          <Select
            allowClear
            disabled={loading}
            style={{ width: 140 }}
            placeholder="Method"
            value={methodValue}
            options={[
              { value: "GET", label: "GET" },
              { value: "POST", label: "POST" },
              { value: "PATCH", label: "PATCH" },
              { value: "PUT", label: "PUT" },
              { value: "DELETE", label: "DELETE" },
            ]}
            onChange={(value) => setFilter("method", value ?? null, "equals")}
          />
          {renderFieldError(validationState, "method")}
        </Space>

        <Space orientation="vertical" size={4}>
          <Text strong>Status Code</Text>
          <InputNumber
            disabled={loading}
            style={{ width: 140 }}
            placeholder="Status code"
            value={statusCodeValue ? Number(statusCodeValue) : undefined}
            onChange={(value) =>
              setFilter(
                "statusCode",
                typeof value === "number" ? value : null,
                "equals",
              )
            }
          />
          {renderFieldError(validationState, "statusCode")}
        </Space>

        <Space orientation="vertical" size={4}>
          <Text strong>Target ID</Text>
          <Input
            allowClear
            disabled={loading}
            style={{ width: 220 }}
            placeholder="Target ID"
            value={targetIdValue}
            onChange={(event) =>
              setFilter("targetId", event.target.value || null, "equals")
            }
          />
          {renderFieldError(validationState, "targetId")}
        </Space>

        <Space orientation="vertical" size={4}>
          <Text strong>Request ID</Text>
          <Input
            allowClear
            disabled={loading}
            style={{ width: 220 }}
            placeholder="Request ID"
            value={requestIdValue}
            onChange={(event) =>
              setFilter("requestId", event.target.value || null, "equals")
            }
          />
          {renderFieldError(validationState, "requestId")}
        </Space>

        <Space orientation="vertical" size={4}>
          <Text strong>Timestamp Range</Text>
          <RangePicker
            allowEmpty={[true, true]}
            disabled={loading}
            value={timestampRange}
            onChange={(dates) => {
              const from = dates?.[0]?.toISOString();
              const to = dates?.[1]?.toISOString();

              if (!from && !to) {
                state.removeFilter("timestamp");
                return;
              }

              state.upsertFilter({
                field: "timestamp",
                operator: from && to ? "between" : from ? "gte" : "lte",
                value: from && to ? [from, to] : (from ?? to ?? ""),
              });
            }}
          />
          {renderFieldError(validationState, "timestamp")}
        </Space>

        <Space orientation="vertical" size={4}>
          <Text strong>Created Range</Text>
          <RangePicker
            allowEmpty={[true, true]}
            disabled={loading}
            value={createdRange}
            onChange={(dates) => {
              state.setCreatedRange(
                dates?.[0]?.toISOString() ?? undefined,
                dates?.[1]?.toISOString() ?? undefined,
              );
            }}
          />
          {renderFieldError(validationState, "createdAt")}
        </Space>

        <Space orientation="vertical" size={4}>
          <Text strong>Updated Range</Text>
          <RangePicker
            allowEmpty={[true, true]}
            disabled={loading}
            value={updatedRange}
            onChange={(dates) => {
              state.setUpdatedRange(
                dates?.[0]?.toISOString() ?? undefined,
                dates?.[1]?.toISOString() ?? undefined,
              );
            }}
          />
          {renderFieldError(validationState, "updatedAt")}
        </Space>
      </Flex>

      <Space wrap>
        <Button disabled={loading} onClick={clearQuickFilters}>
          Reset Filters
        </Button>
        <Text type="secondary">
          Default sort is newest event first. Search is debounced and filters
          stay in the URL.
        </Text>
      </Space>
    </Space>
  );
}
