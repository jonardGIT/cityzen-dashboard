"use client";

import {
  App,
  Alert,
  Button,
  Form,
  type FormInstance,
  Input,
  Modal,
  Popconfirm,
  Result,
  Select,
  Space,
  Typography,
} from "antd";
import { AxiosError } from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FilterToolbar } from "@/components/common/FilterToolbar";
import { ErrorState, LoadingState } from "@/components/common/PageStates";
import {
  SharedTable,
  type SharedTableColumn,
} from "@/components/crud/SharedTable";
import { useAuth } from "@/context/AuthContext";
import {
  useCreateUserMutation,
  useDeleteUserMutation,
  useUserQuery,
  useUpdateUserMutation,
  useUsersCapabilitiesQuery,
  useUsersQuery,
} from "@/features/users/api";
import {
  useBarangayByIdQuery,
  useBarangaysQuery,
  useCitiesMunicipalitiesQuery,
  useCityMunicipalityByIdQuery,
  useProvinceByIdQuery,
  useProvincesQuery,
  useRegionByIdQuery,
  useRegionsQuery,
} from "@/features/users/geography";
import { useListQueryParams } from "@/hooks/useListQueryParams";
import { canAccessUserManagement } from "@/lib/auth/navigation";
import { canManageRole, getAssignableRoles } from "@/lib/auth/permissions";
import {
  getRoleLabel,
  normalizeRole,
  permissionListIncludes,
} from "@/lib/auth/roles";
import { mapValidationErrorsToForm } from "@/lib/forms/mapValidationErrors";
import type { ApiErrorPayload, JurisdictionType, User } from "@/types/api";
import { Role, type UserCapabilities } from "@/types/auth";

const { Title, Text } = Typography;
const PASSWORD_MIN_LENGTH = 12;
const USER_CREATE_PERMISSION_HINTS = [
  "user:manage:global",
  "user:manage:national",
  "user:manage:region",
  "user:manage:province",
  "user:manage:city",
  "user:manage:barangay",
  "user:create:region",
  "user:create:province",
  "user:create:city",
  "user:create:barangay",
] as const;

type JurisdictionFormValues = {
  jurisdictionType?: JurisdictionType;
  jurisdictionId?: string;
  regionId?: string;
  provinceId?: string;
  cityMunicipalityId?: string;
};

interface CreateUserFormValues extends JurisdictionFormValues {
  name: string;
  email: string;
  password: string;
  role: Role;
}

interface EditUserFormValues extends JurisdictionFormValues {
  name: string;
  email: string;
  password?: string;
  role: Role;
}

type UserTableRow = User & {
  jurisdictionSummary: string;
};

const JURISDICTION_LABELS = new Map<JurisdictionType, string>([
  ["region", "Region"],
  ["province", "Province"],
  ["city", "City/Municipality"],
  ["barangay", "Barangay"],
]);

function normalizeJurisdictionType(
  value?: string | null,
): JurisdictionType | undefined {
  if (value === "municipality") {
    return "city";
  }

  if (
    value === "region" ||
    value === "province" ||
    value === "city" ||
    value === "barangay"
  ) {
    return value;
  }

  return undefined;
}

function normalizeUserJurisdiction(user?: User | null): User | null {
  if (!user) {
    return null;
  }

  const normalizedType = normalizeJurisdictionType(user.jurisdictionType);

  if (!normalizedType || normalizedType === user.jurisdictionType) {
    return user;
  }

  return {
    ...user,
    jurisdictionType: normalizedType,
  };
}

function getJurisdictionLabel(type?: string | null): string {
  const normalizedType = normalizeJurisdictionType(type);

  if (!normalizedType) {
    return "Unbound";
  }

  return JURISDICTION_LABELS.get(normalizedType) ?? normalizedType;
}

function formatJurisdictionSummary(
  user?: Pick<User, "jurisdictionType" | "jurisdictionId"> | null,
): string {
  if (!user?.jurisdictionType && !user?.jurisdictionId) {
    return "No LGU jurisdiction assigned";
  }

  if (!user?.jurisdictionType || !user?.jurisdictionId) {
    return "Incomplete LGU jurisdiction assignment";
  }

  return `${getJurisdictionLabel(user.jurisdictionType)} scope · ${user.jurisdictionId}`;
}

function getAllowedJurisdictionTypes(role?: Role): JurisdictionType[] {
  switch (role) {
    case Role.REGIONAL_DIRECTOR:
      return ["region"];
    case Role.PROVINCIAL_ADMIN:
      return ["province"];
    case Role.CITY_ADMIN:
      return ["city"];
    case Role.CITY_CONTENT_EDITOR:
    case Role.DISPATCHER:
    case Role.RESPONDER:
    case Role.CITIZEN_REPORTER:
      return ["city", "barangay"];
    default:
      return [];
  }
}

function buildCreatePayload(values: CreateUserFormValues) {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    password: values.password.trim(),
    role: values.role,
    ...(values.jurisdictionType && values.jurisdictionId
      ? {
          jurisdictionType: values.jurisdictionType,
          jurisdictionId: values.jurisdictionId,
        }
      : {}),
  };
}

function buildUpdatePayload(values: EditUserFormValues) {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    role: values.role,
    ...(values.password?.trim() ? { password: values.password.trim() } : {}),
    ...(values.jurisdictionType && values.jurisdictionId
      ? {
          jurisdictionType: values.jurisdictionType,
          jurisdictionId: values.jurisdictionId,
        }
      : {}),
  };
}

function applyInlineUserFormMessage(
  form: FormInstance,
  message?: string,
): boolean {
  if (!message) {
    return false;
  }

  if (
    message.includes(
      "jurisdictionType and jurisdictionId must be provided together",
    )
  ) {
    form.setFields([
      {
        name: "jurisdictionType",
        errors: ["Select a jurisdiction level."],
      },
      {
        name: "jurisdictionId",
        errors: ["Select the matching jurisdiction."],
      },
    ]);
    return true;
  }

  if (message.includes("jurisdictionId must reference an active")) {
    form.setFields([
      {
        name: "jurisdictionId",
        errors: [message],
      },
    ]);
    return true;
  }

  if (message.includes("jurisdictionType must be one of")) {
    form.setFields([
      {
        name: "jurisdictionType",
        errors: [message],
      },
    ]);
    return true;
  }

  if (message.toLowerCase().includes("password")) {
    form.setFields([
      {
        name: "password",
        errors: [message],
      },
    ]);
    return true;
  }

  return false;
}

function getScopeSummary(
  capabilities?: UserCapabilities | null,
): string | null {
  if (!capabilities) {
    return null;
  }

  if (capabilities.scope.length > 0) {
    return capabilities.scope.join(", ");
  }

  return null;
}

function formatReadableList(items: string[]): string {
  if (items.length <= 1) {
    return items[0] ?? "";
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function canCreateUsersFromCapabilities(
  capabilities?: UserCapabilities | null,
): boolean {
  if (!capabilities) {
    return false;
  }

  if (Object.prototype.hasOwnProperty.call(capabilities, "canCreateUser")) {
    return Boolean(capabilities.canCreateUser);
  }

  return permissionListIncludes(
    capabilities.permissions,
    USER_CREATE_PERMISSION_HINTS,
  );
}

interface JurisdictionFieldsProps<T extends JurisdictionFormValues> {
  form: FormInstance<T>;
  actorRole?: Role;
  actorUser?: User | null;
  disabled?: boolean;
  mode: "create" | "edit";
}

function JurisdictionFields<T extends JurisdictionFormValues>({
  form,
  actorRole,
  actorUser,
  disabled,
  mode,
}: JurisdictionFieldsProps<T>) {
  type SetFieldsValueArg = Parameters<typeof form.setFieldsValue>[0];
  type GetFieldValueArg = Parameters<typeof form.getFieldValue>[0];

  const setJurisdictionFieldsValue = useCallback(
    (values: SetFieldsValueArg) => {
      form.setFieldsValue(values);
    },
    [form],
  );

  const getJurisdictionFieldValue = <K extends keyof JurisdictionFormValues>(
    field: K,
  ) => form.getFieldValue(field as GetFieldValueArg) as T[K] | undefined;

  const targetRole = Form.useWatch("role", form) as Role | undefined;
  const jurisdictionType = Form.useWatch("jurisdictionType", form) as
    | JurisdictionType
    | undefined;
  const jurisdictionId = Form.useWatch("jurisdictionId", form) as
    | string
    | undefined;
  const regionId = Form.useWatch("regionId", form) as string | undefined;
  const provinceId = Form.useWatch("provinceId", form) as string | undefined;
  const cityMunicipalityId = Form.useWatch("cityMunicipalityId", form) as
    | string
    | undefined;

  const allowedJurisdictionTypes = useMemo(
    () => getAllowedJurisdictionTypes(targetRole),
    [targetRole],
  );
  const requiresJurisdictionPair =
    mode === "create" && allowedJurisdictionTypes.length > 0;
  const isCityAdmin = actorRole === Role.CITY_ADMIN;
  const actorCityId =
    actorUser?.jurisdictionType === "city"
      ? (actorUser.jurisdictionId ?? undefined)
      : undefined;
  const cityAdminScopeLocked = isCityAdmin && Boolean(actorCityId);
  const allowEmptyJurisdiction =
    mode === "create" && !isCityAdmin && !requiresJurisdictionPair;

  const actorCityQuery = useCityMunicipalityByIdQuery(
    actorCityId,
    cityAdminScopeLocked,
  );
  const actorProvinceId = actorCityQuery.data?.provinceId;
  const actorProvinceQuery = useProvinceByIdQuery(
    actorProvinceId,
    cityAdminScopeLocked && Boolean(actorProvinceId),
  );
  const actorRegionId = actorProvinceQuery.data?.regionId;
  useRegionByIdQuery(
    actorRegionId,
    cityAdminScopeLocked && Boolean(actorRegionId),
  );

  const currentBarangayQuery = useBarangayByIdQuery(
    !cityAdminScopeLocked && jurisdictionType === "barangay"
      ? jurisdictionId
      : undefined,
    Boolean(
      !cityAdminScopeLocked &&
      jurisdictionType === "barangay" &&
      jurisdictionId,
    ),
  );
  const derivedCityId = cityAdminScopeLocked
    ? actorCityId
    : jurisdictionType === "city"
      ? jurisdictionId
      : currentBarangayQuery.data?.cityMunicipalityId;
  const currentCityQuery = useCityMunicipalityByIdQuery(
    derivedCityId,
    Boolean(!cityAdminScopeLocked && derivedCityId),
  );
  const derivedProvinceId = cityAdminScopeLocked
    ? actorProvinceId
    : jurisdictionType === "province"
      ? jurisdictionId
      : currentCityQuery.data?.provinceId;
  const currentProvinceQuery = useProvinceByIdQuery(
    derivedProvinceId,
    Boolean(!cityAdminScopeLocked && derivedProvinceId),
  );
  const derivedRegionId = cityAdminScopeLocked
    ? actorRegionId
    : jurisdictionType === "region"
      ? jurisdictionId
      : currentProvinceQuery.data?.regionId;
  useRegionByIdQuery(
    derivedRegionId,
    Boolean(!cityAdminScopeLocked && derivedRegionId),
  );

  const effectiveRegionId = regionId ?? derivedRegionId;
  const effectiveProvinceId = provinceId ?? derivedProvinceId;
  const effectiveCityId = cityMunicipalityId ?? derivedCityId;

  const regionsQuery = useRegionsQuery(
    undefined,
    allowedJurisdictionTypes.length > 0,
  );
  const provincesQuery = useProvincesQuery(
    { regionId: effectiveRegionId },
    Boolean(
      effectiveRegionId &&
      (jurisdictionType === "province" ||
        jurisdictionType === "city" ||
        jurisdictionType === "barangay"),
    ),
  );
  const citiesQuery = useCitiesMunicipalitiesQuery(
    { provinceId: effectiveProvinceId },
    Boolean(
      effectiveProvinceId &&
      (jurisdictionType === "city" || jurisdictionType === "barangay"),
    ),
  );
  const barangaysQuery = useBarangaysQuery(
    { cityMunicipalityId: effectiveCityId },
    Boolean(effectiveCityId && jurisdictionType === "barangay"),
  );

  useEffect(() => {
    if (
      !jurisdictionType ||
      allowedJurisdictionTypes.includes(jurisdictionType)
    ) {
      return;
    }

    setJurisdictionFieldsValue({
      jurisdictionType: undefined,
      jurisdictionId: undefined,
      regionId: undefined,
      provinceId: undefined,
      cityMunicipalityId: undefined,
    } as SetFieldsValueArg);
  }, [allowedJurisdictionTypes, jurisdictionType, setJurisdictionFieldsValue]);

  useEffect(() => {
    if (
      !cityAdminScopeLocked ||
      !allowedJurisdictionTypes.includes("city") ||
      !actorCityId
    ) {
      return;
    }

    const nextValues: JurisdictionFormValues = {};

    if (!jurisdictionType) {
      nextValues.jurisdictionType = "city" as T["jurisdictionType"];
    }

    if (actorRegionId && regionId !== actorRegionId) {
      nextValues.regionId = actorRegionId as T["regionId"];
    }

    if (actorProvinceId && provinceId !== actorProvinceId) {
      nextValues.provinceId = actorProvinceId as T["provinceId"];
    }

    if (cityMunicipalityId !== actorCityId) {
      nextValues.cityMunicipalityId = actorCityId as T["cityMunicipalityId"];
    }

    if (
      (jurisdictionType ?? "city") === "city" &&
      jurisdictionId !== actorCityId
    ) {
      nextValues.jurisdictionId = actorCityId;
    }

    if (Object.keys(nextValues).length > 0) {
      setJurisdictionFieldsValue(nextValues as SetFieldsValueArg);
    }
  }, [
    actorCityId,
    actorProvinceId,
    actorRegionId,
    allowedJurisdictionTypes,
    cityAdminScopeLocked,
    cityMunicipalityId,
    jurisdictionId,
    jurisdictionType,
    provinceId,
    regionId,
    setJurisdictionFieldsValue,
  ]);

  useEffect(() => {
    if (cityAdminScopeLocked) {
      return;
    }

    const nextValues: JurisdictionFormValues = {};

    if (jurisdictionType === "region" && jurisdictionId && !regionId) {
      nextValues.regionId = jurisdictionId as T["regionId"];
    }

    if (derivedRegionId && !regionId) {
      nextValues.regionId = derivedRegionId as T["regionId"];
    }

    if (derivedProvinceId && !provinceId) {
      nextValues.provinceId = derivedProvinceId as T["provinceId"];
    }

    if (derivedCityId && !cityMunicipalityId) {
      nextValues.cityMunicipalityId = derivedCityId as T["cityMunicipalityId"];
    }

    if (Object.keys(nextValues).length > 0) {
      setJurisdictionFieldsValue(nextValues as SetFieldsValueArg);
    }
  }, [
    cityAdminScopeLocked,
    cityMunicipalityId,
    derivedCityId,
    derivedProvinceId,
    derivedRegionId,
    jurisdictionId,
    jurisdictionType,
    provinceId,
    regionId,
    setJurisdictionFieldsValue,
  ]);

  const typeOptions = allowedJurisdictionTypes.map((value) => ({
    value,
    label: JURISDICTION_LABELS.get(value) ?? value,
  }));
  const regionOptions = (regionsQuery.data?.data ?? []).map((region) => ({
    value: region.id,
    label: region.name ?? region.code ?? region.id,
  }));
  const provinceOptions = (provincesQuery.data?.data ?? []).map((province) => ({
    value: province.id,
    label: province.name ?? province.code ?? province.id,
  }));
  const cityOptions = (citiesQuery.data?.data ?? [])
    .filter((city) => city.type == null || city.type === "CITY")
    .map((city) => ({
      value: city.id,
      label: city.name ?? city.code ?? city.id,
    }));
  const barangayOptions = (barangaysQuery.data?.data ?? []).map((barangay) => ({
    value: barangay.id,
    label: barangay.name ?? barangay.code ?? barangay.id,
  }));

  return (
    <Space vertical style={{ width: "100%" }} size={0}>
      <Form.Item
        name="jurisdictionType"
        label="Jurisdiction level"
        rules={[
          {
            validator: async (_, value) => {
              const currentJurisdictionId =
                getJurisdictionFieldValue("jurisdictionId");

              if (
                requiresJurisdictionPair &&
                !value &&
                !currentJurisdictionId
              ) {
                throw new Error("Select a jurisdiction level.");
              }

              if (currentJurisdictionId && !value) {
                throw new Error("Select a jurisdiction level.");
              }
            },
          },
        ]}
        extra={
          allowEmptyJurisdiction
            ? "Leave both jurisdiction fields empty only when the account should remain unbound."
            : "Jurisdiction changes must be submitted as a complete LGU pair."
        }
      >
        <Select
          allowClear={allowEmptyJurisdiction}
          disabled={disabled || allowedJurisdictionTypes.length === 0}
          options={typeOptions}
          placeholder="Select a jurisdiction level"
          onChange={() => {
            setJurisdictionFieldsValue({
              jurisdictionId: undefined,
              regionId: undefined,
              provinceId: undefined,
              cityMunicipalityId: undefined,
            } as SetFieldsValueArg);
          }}
        />
      </Form.Item>

      {isCityAdmin && actorCityId ? (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          title="City and municipal admins can only manage users inside their own city or municipality."
        />
      ) : null}

      {jurisdictionType === "province" ||
      jurisdictionType === "city" ||
      jurisdictionType === "barangay" ? (
        <Form.Item
          name="regionId"
          label="Region"
          rules={[{ required: true, message: "Select a region." }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            disabled={
              disabled || cityAdminScopeLocked || regionOptions.length === 0
            }
            loading={regionsQuery.isFetching}
            options={regionOptions}
            placeholder="Select a region"
            onChange={() => {
              setJurisdictionFieldsValue({
                provinceId: undefined,
                cityMunicipalityId: undefined,
                jurisdictionId: undefined,
              } as SetFieldsValueArg);
            }}
          />
        </Form.Item>
      ) : null}

      {jurisdictionType === "city" || jurisdictionType === "barangay" ? (
        <Form.Item
          name="provinceId"
          label="Province"
          rules={[{ required: true, message: "Select a province." }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            disabled={disabled || cityAdminScopeLocked || !effectiveRegionId}
            loading={provincesQuery.isFetching}
            options={provinceOptions}
            placeholder="Select a province"
            onChange={() => {
              setJurisdictionFieldsValue({
                cityMunicipalityId: undefined,
                jurisdictionId: undefined,
              } as SetFieldsValueArg);
            }}
          />
        </Form.Item>
      ) : null}

      {jurisdictionType === "barangay" ? (
        <Form.Item
          name="cityMunicipalityId"
          label="City/Municipality"
          rules={[
            { required: true, message: "Select a city or municipality." },
          ]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            disabled={disabled || cityAdminScopeLocked || !effectiveProvinceId}
            loading={citiesQuery.isFetching}
            options={cityOptions}
            placeholder="Select a city or municipality"
            onChange={() => {
              setJurisdictionFieldsValue({
                jurisdictionId: undefined,
              } as SetFieldsValueArg);
            }}
          />
        </Form.Item>
      ) : null}

      {jurisdictionType === "region" ? (
        <Form.Item
          name="jurisdictionId"
          label="Region"
          rules={[
            {
              validator: async (_, value) => {
                if (getJurisdictionFieldValue("jurisdictionType") && !value) {
                  throw new Error("Select a region.");
                }
              },
            },
          ]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            disabled={disabled}
            loading={regionsQuery.isFetching}
            options={regionOptions}
            placeholder="Select a region"
          />
        </Form.Item>
      ) : null}

      {jurisdictionType === "province" ? (
        <Form.Item
          name="jurisdictionId"
          label="Province"
          rules={[
            {
              validator: async (_, value) => {
                if (!getJurisdictionFieldValue("jurisdictionType")) {
                  return;
                }

                if (!value) {
                  throw new Error("Select a province.");
                }
              },
            },
          ]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            disabled={disabled || !effectiveRegionId}
            loading={provincesQuery.isFetching}
            options={provinceOptions}
            placeholder="Select a province"
          />
        </Form.Item>
      ) : null}

      {jurisdictionType === "city" ? (
        <Form.Item
          name="jurisdictionId"
          label="City/Municipality"
          rules={[
            {
              validator: async (_, value) => {
                if (!getJurisdictionFieldValue("jurisdictionType")) {
                  return;
                }

                if (!value) {
                  throw new Error("Select a city or municipality.");
                }
              },
            },
          ]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            disabled={disabled || cityAdminScopeLocked || !effectiveProvinceId}
            loading={citiesQuery.isFetching}
            options={cityOptions}
            placeholder="Select a city or municipality"
          />
        </Form.Item>
      ) : null}

      {jurisdictionType === "barangay" ? (
        <Form.Item
          name="jurisdictionId"
          label="Barangay"
          rules={[
            {
              validator: async (_, value) => {
                if (!getJurisdictionFieldValue("jurisdictionType")) {
                  return;
                }

                if (!value) {
                  throw new Error("Select a barangay.");
                }
              },
            },
          ]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            disabled={disabled || !effectiveCityId}
            loading={barangaysQuery.isFetching}
            options={barangayOptions}
            placeholder="Select a barangay"
          />
        </Form.Item>
      ) : null}
    </Space>
  );
}

export default function UsersPage() {
  const { message } = App.useApp();
  const { capabilities, isAuthenticated, user } = useAuth();
  const canManage = canAccessUserManagement({
    role: user?.role,
    capabilities,
    isAuthenticated,
  });
  const listQuery = useListQueryParams();
  const usersQuery = useUsersQuery(listQuery, canManage);
  const capabilitiesQuery = useUsersCapabilitiesQuery(isAuthenticated);
  const currentUserDetailQuery = useUserQuery(
    user?.id,
    canManage && Boolean(user?.id),
  );
  const createMutation = useCreateUserMutation();
  const updateMutation = useUpdateUserMutation();
  const deleteMutation = useDeleteUserMutation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [createForm] = Form.useForm<CreateUserFormValues>();
  const [editForm] = Form.useForm<EditUserFormValues>();

  const assignableRoles = useMemo(() => {
    if (!user) {
      return [] as Role[];
    }

    return getAssignableRoles(user.role);
  }, [user]);

  const rows = useMemo(
    () => usersQuery.data?.data ?? [],
    [usersQuery.data?.data],
  );
  const normalizedCurrentActor = useMemo(
    () => normalizeUserJurisdiction(currentUserDetailQuery.data ?? null),
    [currentUserDetailQuery.data],
  );
  const tableRows = useMemo<Array<UserTableRow>>(
    () =>
      rows.map((row) => {
        const normalizedRow = normalizeUserJurisdiction(row) ?? row;

        return {
          ...normalizedRow,
          jurisdictionSummary: formatJurisdictionSummary(normalizedRow),
        };
      }),
    [rows],
  );
  const paginationMeta = usersQuery.data?.pagination;
  const isEditingSelf = Boolean(
    editingUser && String(editingUser.id) === String(user?.id),
  );
  const currentActor = normalizedCurrentActor;
  const currentScopeSummary = getScopeSummary(capabilitiesQuery.data);
  const manageableRolesSummary = useMemo(() => {
    if (assignableRoles.length === 0) {
      return null;
    }

    return `You can create and manage ${formatReadableList(assignableRoles.map((role) => getRoleLabel(role)))} accounts within your LGU scope.`;
  }, [assignableRoles]);
  const roleOptions = new Map(
    Object.values(Role).map((role) => [role, getRoleLabel(role)]),
  );
  const jurisdictionTypeOptions = new Map(
    Array.from(JURISDICTION_LABELS.entries()),
  );

  const columns: Array<SharedTableColumn<UserTableRow>> = [
    { key: "email", title: "Email", filterKind: "text" },
    { key: "name", title: "Name", filterKind: "text" },
    {
      key: "role",
      title: "Role",
      filterKind: "select",
      selectOptions: roleOptions,
      render: (value) => {
        const normalized = normalizeRole(String(value ?? ""));
        return normalized ? getRoleLabel(normalized) : String(value ?? "-");
      },
    },
    {
      key: "jurisdictionType",
      title: "Scope Level",
      filterKind: "select",
      selectOptions: jurisdictionTypeOptions,
      render: (value) => getJurisdictionLabel(String(value ?? "")),
    },
    {
      key: "jurisdictionSummary",
      title: "Jurisdiction",
      filterKind: "text",
    },
    { key: "createdAt", title: "Created", filterKind: "date", sortable: true },
    { key: "updatedAt", title: "Updated", filterKind: "date", sortable: true },
  ];

  const canCreateUsers =
    canManage &&
    assignableRoles.length > 0 &&
    canCreateUsersFromCapabilities(capabilitiesQuery.data);

  const canEditRow = (row: User): boolean => {
    const targetRole = normalizeRole(row.role);

    if (!capabilitiesQuery.data?.canUpdateUser) {
      return false;
    }

    if (!canManage || !user) {
      return false;
    }

    if (String(row.id) === String(user.id)) {
      return false;
    }

    if (!targetRole) {
      return false;
    }

    return canManageRole(user.role, targetRole);
  };

  const canDeleteRow = (row: User): boolean => {
    const targetRole = normalizeRole(row.role);

    if (!capabilitiesQuery.data?.canDeleteUser) {
      return false;
    }

    if (!canManage || !user) {
      return false;
    }

    if (String(row.id) === String(user.id)) {
      return false;
    }

    if (!targetRole) {
      return false;
    }

    return canManageRole(user.role, targetRole);
  };

  const openCreateModal = () => {
    if (!canCreateUsers) {
      return;
    }

    createForm.resetFields();
    createForm.setFieldsValue({
      role: assignableRoles[0],
    });
    setIsCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!canCreateUsers) {
      message.error(
        "Permission denied: You cannot create users in the current LGU scope.",
      );
      setIsCreateOpen(false);
      return;
    }

    try {
      const values = await createForm.validateFields();
      await createMutation.mutateAsync(buildCreatePayload(values));
      message.success("User created");
      createForm.resetFields();
      setIsCreateOpen(false);
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorPayload>;

      if (axiosError.response?.status === 401) {
        message.error("Authentication required. Sign in again and retry.");
        return;
      }

      if (axiosError.response?.status === 403) {
        message.error(
          "Permission denied: You cannot create that user inside the selected LGU scope.",
        );
        return;
      }

      if (axiosError.response?.status === 409) {
        message.error("Conflict: A user with this email already exists.");
        return;
      }

      const mapped = mapValidationErrorsToForm(createForm, error);
      const inlineMessageMapped = applyInlineUserFormMessage(
        createForm,
        axiosError.response?.data?.message,
      );
      if (
        !mapped &&
        !inlineMessageMapped &&
        axiosError.response?.data?.message
      ) {
        message.error(axiosError.response.data.message);
      }
    }
  };

  const openEditModal = (row: User) => {
    const normalizedRow = normalizeUserJurisdiction(row) ?? row;

    setEditingUser(normalizedRow);
    setIsEditOpen(true);
    editForm.setFieldsValue({
      name: normalizedRow.name ?? "",
      email: normalizedRow.email ?? "",
      role: (normalizeRole(normalizedRow.role)
        ? normalizeRole(normalizedRow.role)
        : assignableRoles[0]) as Role,
      password: undefined,
      jurisdictionType: normalizeJurisdictionType(
        normalizedRow.jurisdictionType,
      ),
      jurisdictionId: normalizedRow.jurisdictionId ?? undefined,
      regionId: undefined,
      provinceId: undefined,
      cityMunicipalityId: undefined,
    });
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
    setEditingUser(null);
    editForm.resetFields();
  };

  const submitEdit = async () => {
    if (!editingUser || !user) {
      return;
    }

    try {
      const values = await editForm.validateFields();

      if (
        String(editingUser.id) === String(user.id) &&
        values.role !== user.role
      ) {
        message.error("You cannot change your own role.");
        return;
      }

      await updateMutation.mutateAsync({
        userId: editingUser.id,
        payload: buildUpdatePayload(values),
      });
      message.success("User updated");
      closeEditModal();
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorPayload>;

      if (axiosError.response?.status === 401) {
        message.error("Authentication required. Sign in again and retry.");
        return;
      }

      if (axiosError.response?.status === 403) {
        message.error("Permission denied: You cannot update this user.");
        return;
      }

      if (axiosError.response?.status === 404) {
        message.error(
          "User not found or no longer available in your LGU scope.",
        );
        return;
      }

      if (axiosError.response?.status === 409) {
        message.error("Conflict: Unable to update user. Please try again.");
        return;
      }

      const mapped = mapValidationErrorsToForm(editForm, error);
      const inlineMessageMapped = applyInlineUserFormMessage(
        editForm,
        axiosError.response?.data?.message,
      );
      if (
        !mapped &&
        !inlineMessageMapped &&
        axiosError.response?.data?.message
      ) {
        message.error(axiosError.response.data.message);
      }
    }
  };

  const submitDelete = async (row: User) => {
    try {
      await deleteMutation.mutateAsync(row.id);
      message.success("User deleted");
      if (editingUser && String(editingUser.id) === String(row.id)) {
        closeEditModal();
      }
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorPayload>;

      if (axiosError.response?.status === 401) {
        message.error("Authentication required. Sign in again and retry.");
        return;
      }

      if (axiosError.response?.status === 403) {
        message.error("Permission denied: You cannot delete this user.");
        return;
      }

      if (axiosError.response?.status === 404) {
        message.error(
          "User not found or already unavailable in your LGU scope.",
        );
        return;
      }

      if (axiosError.response?.status === 409) {
        message.error("Conflict: Unable to delete user. Please try again.");
        return;
      }

      if (axiosError.response?.data?.message) {
        message.error(axiosError.response.data.message);
        return;
      }
    }
  };

  if (!canManage) {
    return (
      <Result
        status="403"
        title="Forbidden"
        subTitle="Your authenticated account does not have access to LGU-scoped user management."
      />
    );
  }

  if (usersQuery.isLoading) {
    return <LoadingState />;
  }

  if (usersQuery.error) {
    const axiosError = usersQuery.error as AxiosError<ApiErrorPayload>;

    if (axiosError.response?.status === 401) {
      return (
        <Result
          status="warning"
          title="Authentication Required"
          subTitle="Authentication or API key forwarding failed for the user-management request. Sign in again and verify the dashboard proxy configuration."
        />
      );
    }

    if (axiosError.response?.status === 403) {
      return (
        <Result
          status="403"
          title="Forbidden"
          subTitle="Your authenticated account does not have access to the user-management scope."
        />
      );
    }

    return <ErrorState message={String(usersQuery.error)} />;
  }

  return (
    <Space vertical size={16} style={{ width: "100%" }}>
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Space vertical size={0}>
          <Title level={3} style={{ margin: 0 }}>
            Staff & User Management
          </Title>
          <Text type="secondary">
            Manage staff and user accounts inside your LGU scope. Role
            assignments, edits, deletes, and jurisdiction bindings follow
            backend capability and hierarchy rules.
          </Text>
        </Space>
        {canCreateUsers ? (
          <Button type="primary" onClick={openCreateModal}>
            Create User
          </Button>
        ) : null}
      </Space>

      <SharedTable<UserTableRow>
        rows={tableRows}
        columns={columns}
        storageKey="users-shared-table"
        loading={usersQuery.isFetching}
        page={listQuery.page}
        pageSize={listQuery.pageSize}
        paginationMeta={paginationMeta}
        onPageChange={listQuery.setPage}
        onPageSizeChange={listQuery.setPageSize}
        globalSearch={listQuery.search}
        onGlobalSearchChange={listQuery.setSearch}
        globalSearchPlaceholder="Search users in your LGU scope"
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
          <Space vertical style={{ width: "100%" }}>
            {currentActor ? (
              <Alert
                type="info"
                showIcon
                title="Current admin scope"
                description={[
                  currentScopeSummary
                    ? `Capability scope: ${currentScopeSummary}.`
                    : null,
                  `Jurisdiction: ${formatJurisdictionSummary(currentActor)}.`,
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            ) : null}
            {manageableRolesSummary ? (
              <Alert
                type="info"
                showIcon
                title="Staff roles you can manage"
                description={manageableRolesSummary}
              />
            ) : null}
            {capabilitiesQuery.data &&
            (!capabilitiesQuery.data.canUpdateUser ||
              !capabilitiesQuery.data.canDeleteUser) ? (
              <Alert
                type="info"
                showIcon
                title="User management capabilities are limited by the connected backend."
                description={[
                  !capabilitiesQuery.data.canUpdateUser
                    ? "Edit is not available."
                    : null,
                  !capabilitiesQuery.data.canDeleteUser
                    ? "Delete is not available."
                    : null,
                  capabilitiesQuery.data.scope.length > 0
                    ? `Current scope: ${capabilitiesQuery.data.scope.join(", ")}.`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            ) : null}
            <FilterToolbar
              state={listQuery}
              setters={listQuery}
              loading={Boolean(usersQuery.isFetching)}
            />
          </Space>
        }
        actionColumn={{
          render: (record) =>
            canEditRow(record) || canDeleteRow(record) ? (
              <Space>
                {canEditRow(record) ? (
                  <Button size="small" onClick={() => openEditModal(record)}>
                    Edit
                  </Button>
                ) : null}
                {canDeleteRow(record) ? (
                  <Popconfirm
                    title="Delete user"
                    description="This action cannot be undone."
                    okText="Delete"
                    okButtonProps={{
                      danger: true,
                      loading: deleteMutation.isPending,
                    }}
                    onConfirm={() => void submitDelete(record)}
                  >
                    <Button size="small" danger>
                      Delete
                    </Button>
                  </Popconfirm>
                ) : null}
              </Space>
            ) : (
              <Text type="secondary">No access</Text>
            ),
        }}
      />

      <Modal
        title="Create User"
        open={isCreateOpen}
        onCancel={() => setIsCreateOpen(false)}
        onOk={() => void submitCreate()}
        confirmLoading={createMutation.isPending}
      >
        <Form<CreateUserFormValues>
          form={createForm}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true }, { type: "email" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: "Password is required" },
              {
                min: PASSWORD_MIN_LENGTH,
                message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
              },
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select
              options={assignableRoles.map((role) => ({
                value: role,
                label: getRoleLabel(role),
              }))}
            />
          </Form.Item>
          <JurisdictionFields
            form={createForm}
            actorRole={user?.role}
            actorUser={currentActor}
            mode="create"
          />
        </Form>
      </Modal>

      <Modal
        title="Edit User"
        open={isEditOpen}
        onCancel={closeEditModal}
        onOk={() => void submitEdit()}
        confirmLoading={updateMutation.isPending}
      >
        <Form<EditUserFormValues>
          form={editForm}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true }, { type: "email" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select
              disabled={isEditingSelf}
              options={assignableRoles.map((role) => ({
                value: role,
                label: getRoleLabel(role),
              }))}
            />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            extra="Leave blank to keep the current password."
            rules={[
              {
                min: PASSWORD_MIN_LENGTH,
                message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
              },
            ]}
          >
            <Input.Password placeholder="Leave blank to keep the current password" />
          </Form.Item>
          <JurisdictionFields
            form={editForm}
            actorRole={user?.role}
            actorUser={currentActor}
            mode="edit"
          />
        </Form>
      </Modal>
    </Space>
  );
}
