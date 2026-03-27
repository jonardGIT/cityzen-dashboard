"use client";

import { Result, Spin } from "antd";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import type { Role } from "@/types/auth";

interface AuthGateProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function AuthGate({ children, allowedRoles }: AuthGateProps) {
  const { isAuthenticated, isRestoring, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isRestoring && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isRestoring, router]);

  if (isRestoring) {
    return <Spin fullscreen description="Restoring session..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="You do not have permission to view this page."
      />
    );
  }

  return <>{children}</>;
}
