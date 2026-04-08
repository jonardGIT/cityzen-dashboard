import { act, fireEvent, render, screen } from "@testing-library/react";
import { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";
import { Role } from "@/types/auth";

const { useAuthMock, useRouterMock, useSearchParamsMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: useRouterMock,
  useSearchParams: useSearchParamsMock,
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: useAuthMock,
}));

describe("LoginPage", () => {
  beforeEach(() => {
    useRouterMock.mockReturnValue({ replace: vi.fn() });
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
  });

  it("prompts for MFA and retries login with the submitted MFA code", async () => {
    const loginMock = vi
      .fn()
      .mockResolvedValueOnce({ mfaRequired: true })
      .mockResolvedValueOnce({
        mfaRequired: false,
        auth: {
          token: "access-token",
          refreshToken: "refresh-token",
          tokenType: "Bearer",
          sessionId: "session-1",
          expiresAt: "2026-04-05T00:00:00.000Z",
          refreshExpiresAt: "2026-04-06T00:00:00.000Z",
          user: {
            id: "user-1",
            email: "dispatcher@example.com",
            name: "Dispatch Lead",
            role: Role.DISPATCHER,
            mfaEnabled: true,
          },
        },
      });
    const replaceMock = vi.fn();

    useAuthMock.mockReturnValue({ login: loginMock });
    useRouterMock.mockReturnValue({ replace: replaceMock });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "dispatcher@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123!" },
    });

    await act(async () => {
      fireEvent.submit(
        screen.getByRole("button", { name: "Sign In" }).closest("form")!,
      );
    });

    expect(
      await screen.findByLabelText("Authentication code"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Login Failed")).not.toBeInTheDocument();
    expect(
      screen.getByText("Step 2 of 2: Verify your sign-in"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Confirm your sign-in with your authenticator code."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Verify And Sign In" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Use A Different Account" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Authentication code"), {
      target: { value: "123456" },
    });

    await act(async () => {
      fireEvent.submit(
        screen
          .getByRole("button", { name: "Verify And Sign In" })
          .closest("form")!,
      );
    });

    expect(loginMock).toHaveBeenNthCalledWith(
      1,
      "dispatcher@example.com",
      "Password123!",
      undefined,
    );
    expect(loginMock).toHaveBeenNthCalledWith(
      2,
      "dispatcher@example.com",
      "Password123!",
      "123456",
    );
    expect(replaceMock).toHaveBeenCalledWith("/dashboard");
  });

  it("lets the user exit the MFA step and return to the base sign-in state", async () => {
    const loginMock = vi.fn().mockResolvedValueOnce({ mfaRequired: true });

    useAuthMock.mockReturnValue({ login: loginMock });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "dispatcher@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123!" },
    });

    await act(async () => {
      fireEvent.submit(
        screen.getByRole("button", { name: "Sign In" }).closest("form")!,
      );
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Use A Different Account" }),
    );

    expect(
      screen.queryByLabelText("Authentication code"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Step 2 of 2: Verify your sign-in"),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("shows a verification-specific error when the MFA code is rejected", async () => {
    const loginError = new AxiosError("Request failed");
    loginError.response = {
      data: { message: "Invalid MFA code." },
      status: 401,
      statusText: "Unauthorized",
      headers: {},
      config: { headers: {} as never },
    };

    const loginMock = vi
      .fn()
      .mockResolvedValueOnce({ mfaRequired: true })
      .mockRejectedValueOnce(loginError);

    useAuthMock.mockReturnValue({ login: loginMock });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "dispatcher@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123!" },
    });

    await act(async () => {
      fireEvent.submit(
        screen.getByRole("button", { name: "Sign In" }).closest("form")!,
      );
    });

    fireEvent.change(screen.getByLabelText("Authentication code"), {
      target: { value: "123456" },
    });

    await act(async () => {
      fireEvent.submit(
        screen
          .getByRole("button", { name: "Verify And Sign In" })
          .closest("form")!,
      );
    });

    expect(screen.getByText("Verification Failed")).toBeInTheDocument();
    expect(screen.getByText("Invalid MFA code.")).toBeInTheDocument();
    expect(screen.queryByText("Login Failed")).not.toBeInTheDocument();
  });

  it("shows server-driven reauthentication reasons", () => {
    useAuthMock.mockReturnValue({ login: vi.fn() });
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("reason=mfa-updated"),
    );

    render(<LoginPage />);

    expect(screen.getByText("Sign-in required")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Security settings changed and all active sessions were closed. Sign in again.",
      ),
    ).toBeInTheDocument();
  });

  it("redirects citizen self-service accounts to the incident dashboard", async () => {
    const loginMock = vi.fn().mockResolvedValueOnce({
      mfaRequired: false,
      auth: {
        token: "access-token",
        refreshToken: "refresh-token",
        tokenType: "Bearer",
        sessionId: "session-1",
        expiresAt: "2026-04-05T00:00:00.000Z",
        refreshExpiresAt: "2026-04-06T00:00:00.000Z",
        user: {
          id: "user-1",
          email: "citizen@example.com",
          name: "Citizen Reporter",
          role: Role.CITIZEN_REPORTER,
          mfaEnabled: false,
        },
      },
    });
    const replaceMock = vi.fn();

    useAuthMock.mockReturnValue({ login: loginMock });
    useRouterMock.mockReturnValue({ replace: replaceMock });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "citizen@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123!" },
    });

    await act(async () => {
      fireEvent.submit(
        screen.getByRole("button", { name: "Sign In" }).closest("form")!,
      );
    });

    expect(replaceMock).toHaveBeenCalledWith("/dashboard/incidents");
  });

  it("redirects privileged users with required MFA enrollment to account security", async () => {
    const loginMock = vi.fn().mockResolvedValueOnce({
      mfaRequired: false,
      auth: {
        token: "access-token",
        refreshToken: "refresh-token",
        tokenType: "Bearer",
        sessionId: "session-1",
        expiresAt: "2026-04-05T00:00:00.000Z",
        refreshExpiresAt: "2026-04-06T00:00:00.000Z",
        mfaEnrollmentRequired: true,
        user: {
          id: "user-1",
          email: "admin@example.com",
          name: "System Admin",
          role: Role.SYSTEM_ADMIN,
          mfaEnabled: false,
        },
      },
    });
    const replaceMock = vi.fn();

    useAuthMock.mockReturnValue({ login: loginMock });
    useRouterMock.mockReturnValue({ replace: replaceMock });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123!" },
    });

    await act(async () => {
      fireEvent.submit(
        screen.getByRole("button", { name: "Sign In" }).closest("form")!,
      );
    });

    expect(replaceMock).toHaveBeenCalledWith("/profile");
  });

  it("shows backend error messages when sign-in fails", async () => {
    const loginError = new AxiosError("Request failed");
    loginError.response = {
      data: { message: "Invalid email or password." },
      status: 401,
      statusText: "Unauthorized",
      headers: {},
      config: { headers: {} as never },
    };

    useAuthMock.mockReturnValue({
      login: vi.fn().mockRejectedValueOnce(loginError),
    });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "dispatcher@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong-password" },
    });

    await act(async () => {
      fireEvent.submit(
        screen.getByRole("button", { name: "Sign In" }).closest("form")!,
      );
    });

    expect(screen.getByText("Login Failed")).toBeInTheDocument();
    expect(screen.getByText("Invalid email or password.")).toBeInTheDocument();
  });
});
