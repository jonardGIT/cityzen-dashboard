"use client";

import { cloneElement } from "react";
import { Tooltip } from "antd";
import { useAuth } from "@/context/AuthContext";
import type { Role } from "@/types/auth";

interface RoleGuardProps {
  allowedRoles: Role[];
  children: React.ReactElement<{ disabled?: boolean }>;
  disableOnly?: boolean;
  reason?: string;
}

export function RoleGuard({
  allowedRoles,
  children,
  disableOnly = false,
  reason = "You do not have permission for this action.",
}: RoleGuardProps) {
  const { hasRole } = useAuth();
  const allowed = hasRole(...allowedRoles);

  if (allowed) {
    return children;
  }

  if (disableOnly) {
    const disabledChild = cloneElement(children, { disabled: true });

    return (
      <Tooltip title={reason}>
        {disabledChild}
      </Tooltip>
    );
  }

  return null;
}
