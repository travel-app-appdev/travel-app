// apps/frontend/__tests__/profile.integration.test.tsx
//
// Integration tests for the ProfileScreen component.
// Covers name update, email update, and password update flows —
// success paths, error paths, and validation behaviour.
//
// Pattern follows login.integration.test.tsx and
// tripInformation.integration.test.tsx.

import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import ProfileScreen from "@/app/profile";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockUpdateProfile = jest.fn();
const mockGetIdToken = jest.fn();
const mockUpdatePassword = jest.fn();
const mockReauthenticate = jest.fn();

// expo-router
jest.mock("expo-router", () => ({
    useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

// src/api/auth — updateProfile API call
jest.mock("@/src/api/auth", () => ({
    updateProfile: (...args: any[]) => mockUpdateProfile(...args),
}));

// Firebase auth — inline password operations
jest.mock("firebase/auth", () => ({
    updatePassword: (...args: any[]) => mockUpdatePassword(...args),
    reauthenticateWithCredential: (...args: any[]) => mockReauthenticate(...args),
    EmailAuthProvider: {
        credential: jest.fn().mockReturnValue({ type: "credential" }),
    },
}));

// Firebase lib — auth.currentUser
jest.mock("@/src/lib/firebase", () => ({
    auth: {
        currentUser: {
            getIdToken: () => mockGetIdToken(),
            email: "helen@example.com",
        },
    },
}));

// AuthContext
const mockSetUser = jest.fn();
jest.mock("@/src/context/AuthContext", () => ({
    useAuth: () => ({
        user: { uid: "user-123", email: "helen@example.com", name: "Helen" },
        setUser: mockSetUser,
    }),
}));

// SVG assets
const svgMock = () => null;
jest.mock("@/assets/icons/profile.svg", () => svgMock);
jest.mock("@/assets/icons/id_card.svg", () => svgMock);
jest.mock("@/assets/icons/email.svg", () => svgMock);
jest.mock("@/assets/icons/key_frame.svg", () => svgMock);
jest.mock("@/assets/icons/arrow_up.svg", () => svgMock);
jest.mock("@/assets/icons/arrow_down.svg", () => svgMock);
jest.mock("@/assets/icons/check_mark.svg", () => svgMock);
jest.mock("@/assets/icons/visibility_on.svg", () => svgMock);
jest.mock("@/assets/icons/visibility_off.svg", () => svgMock);
jest.mock("@/assets/icons/exit.svg", () => svgMock);
jest.mock("@/assets/icons/back.svg", () => svgMock);

// BackLink & ActionCard
jest.mock("@/src/components/common/BackLink", () => ({
    BackLink: () => {
        const { View } = require("react-native");
        return <View testID="back-link" />;
    },
}));

jest.mock("@/src/components/common/ActionCard", () => ({
    ActionCard: ({ label, onPress }: { label: string; onPress: () => void }) => {
        const { TouchableOpacity, Text } = require("react-native");
        return (
            <TouchableOpacity onPress={onPress} testID="action-card">
                <Text>{label}</Text>
            </TouchableOpacity>
        );
    },
    ACTION_CARD_HEIGHT: 60,
}));

// ─── Helper to get live firebase mock ─────────────────────────────────────────

function getMockedAuth() {
    return require("@/src/lib/firebase").auth;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ProfileScreen", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        getMockedAuth().currentUser = {
            getIdToken: () => mockGetIdToken(),
            email: "helen@example.com",
        };
        mockGetIdToken.mockResolvedValue("valid-id-token");
        mockUpdatePassword.mockResolvedValue(undefined);
        mockReauthenticate.mockResolvedValue(undefined);
    });

    // ── Renders ───────────────────────────────────────────────────────────────

    it("renders the profile screen with name, email and password fields", () => {
        const { getByText } = render(<ProfileScreen />);

        expect(getByText("Name")).toBeTruthy();
        expect(getByText("Email")).toBeTruthy();
        expect(getByText("Password")).toBeTruthy();
    });

    it("renders the current user name and email as values", () => {
        const { getByText } = render(<ProfileScreen />);

        expect(getByText("Helen")).toBeTruthy();
        expect(getByText("helen@example.com")).toBeTruthy();
    });

    // ── Name update ───────────────────────────────────────────────────────────

    it("expands the name field when Name row is pressed", () => {
        const { getByText, queryByPlaceholderText } = render(<ProfileScreen />);

        expect(queryByPlaceholderText("Enter your name")).toBeNull();
        fireEvent.press(getByText("Name"));
        expect(queryByPlaceholderText("Enter your name")).toBeTruthy();
    });

    it("calls updateProfile with idToken and new name on Update press", async () => {
        mockUpdateProfile.mockResolvedValueOnce({
            uid: "user-123",
            email: "helen@example.com",
            name: "Helen Updated",
        });

        const { getByText, getByPlaceholderText } = render(<ProfileScreen />);

        fireEvent.press(getByText("Name"));
        fireEvent.changeText(getByPlaceholderText("Enter your name"), "Helen Updated");
        fireEvent.press(getByText("Update"));

        await waitFor(() => {
            expect(mockUpdateProfile).toHaveBeenCalledWith({
                idToken: "valid-id-token",
                name: "Helen Updated",
            });
        });
    });

    it("shows 'Name is updated!' after a successful name update", async () => {
        mockUpdateProfile.mockResolvedValueOnce({
            uid: "user-123",
            email: "helen@example.com",
            name: "Helen Updated",
        });

        const { getByText, getByPlaceholderText } = render(<ProfileScreen />);

        fireEvent.press(getByText("Name"));
        fireEvent.changeText(getByPlaceholderText("Enter your name"), "Helen Updated");
        fireEvent.press(getByText("Update"));

        await waitFor(() => {
            expect(getByText("Name is updated!")).toBeTruthy();
        });
    });

    it("shows an error message when name update fails", async () => {
        mockUpdateProfile.mockRejectedValueOnce(new Error("Failed to update name."));

        const { getByText, getByPlaceholderText } = render(<ProfileScreen />);

        fireEvent.press(getByText("Name"));
        fireEvent.changeText(getByPlaceholderText("Enter your name"), "Helen Updated");
        fireEvent.press(getByText("Update"));

        await waitFor(() => {
            expect(getByText("Failed to update name.")).toBeTruthy();
        });
    });

    it("Update button is disabled when name input is empty", () => {
        const { getByText, getByPlaceholderText } = render(<ProfileScreen />);

        fireEvent.press(getByText("Name"));
        fireEvent.changeText(getByPlaceholderText("Enter your name"), "");

        const updateButton = getByText("Update");
        expect(updateButton).toBeTruthy();
        // Button should be disabled — pressing it should not call the API
        fireEvent.press(updateButton);
        expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    // ── Email update ──────────────────────────────────────────────────────────

    it("expands the email field when Email row is pressed", () => {
        const { getByText, queryByPlaceholderText } = render(<ProfileScreen />);

        expect(queryByPlaceholderText("Enter your email")).toBeNull();
        fireEvent.press(getByText("Email"));
        expect(queryByPlaceholderText("Enter your email")).toBeTruthy();
    });

    it("calls updateProfile with idToken and new email on Update press", async () => {
        mockUpdateProfile.mockResolvedValueOnce({
            uid: "user-123",
            email: "new@example.com",
            name: "Helen",
        });

        const { getByText, getByPlaceholderText } = render(<ProfileScreen />);

        fireEvent.press(getByText("Email"));
        fireEvent.changeText(getByPlaceholderText("Enter your email"), "new@example.com");
        fireEvent.press(getByText("Update"));

        await waitFor(() => {
            expect(mockUpdateProfile).toHaveBeenCalledWith({
                idToken: "valid-id-token",
                email: "new@example.com",
            });
        });
    });

    it("shows 'Email is updated!' after a successful email update", async () => {
        mockUpdateProfile.mockResolvedValueOnce({
            uid: "user-123",
            email: "new@example.com",
            name: "Helen",
        });

        const { getByText, getByPlaceholderText } = render(<ProfileScreen />);

        fireEvent.press(getByText("Email"));
        fireEvent.changeText(getByPlaceholderText("Enter your email"), "new@example.com");
        fireEvent.press(getByText("Update"));

        await waitFor(() => {
            expect(getByText("Email is updated!")).toBeTruthy();
        });
    });

    it("shows an error when email is already in use", async () => {
        mockUpdateProfile.mockRejectedValueOnce(
            new Error("This email is already in use.")
        );

        const { getByText, getByPlaceholderText } = render(<ProfileScreen />);

        fireEvent.press(getByText("Email"));
        fireEvent.changeText(getByPlaceholderText("Enter your email"), "taken@example.com");
        fireEvent.press(getByText("Update"));

        await waitFor(() => {
            expect(getByText("This email is already in use.")).toBeTruthy();
        });
    });

    it("Update button is disabled when email has no @ sign", () => {
        const { getByText, getByPlaceholderText } = render(<ProfileScreen />);

        fireEvent.press(getByText("Email"));
        fireEvent.changeText(getByPlaceholderText("Enter your email"), "notanemail");

        fireEvent.press(getByText("Update"));
        expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    // ── Password update ───────────────────────────────────────────────────────

    it("expands the password field when Password row is pressed", () => {
        const { getByText, queryByPlaceholderText } = render(<ProfileScreen />);

        expect(queryByPlaceholderText("Enter current password")).toBeNull();
        fireEvent.press(getByText("Password"));
        expect(queryByPlaceholderText("Enter current password")).toBeTruthy();
        expect(queryByPlaceholderText("Enter new password")).toBeTruthy();
    });

    it("calls reauthenticate and updatePassword on successful password update", async () => {
        const { getByText, getByPlaceholderText } = render(<ProfileScreen />);

        fireEvent.press(getByText("Password"));
        fireEvent.changeText(getByPlaceholderText("Enter current password"), "oldpass123");
        fireEvent.changeText(getByPlaceholderText("Enter new password"), "newpass123");
        fireEvent.press(getByText("Update"));

        await waitFor(() => {
            expect(mockReauthenticate).toHaveBeenCalled();
            expect(mockUpdatePassword).toHaveBeenCalled();
        });
    });

    it("shows 'Password is updated!' after successful password update", async () => {
        const { getByText, getByPlaceholderText } = render(<ProfileScreen />);

        fireEvent.press(getByText("Password"));
        fireEvent.changeText(getByPlaceholderText("Enter current password"), "oldpass123");
        fireEvent.changeText(getByPlaceholderText("Enter new password"), "newpass123");
        fireEvent.press(getByText("Update"));

        await waitFor(() => {
            expect(getByText("Password is updated!")).toBeTruthy();
        });
    });

    it("shows error when new password is shorter than 6 characters", async () => {
        const { getByText, getByPlaceholderText } = render(<ProfileScreen />);

        fireEvent.press(getByText("Password"));
        fireEvent.changeText(getByPlaceholderText("Enter current password"), "oldpass123");
        fireEvent.changeText(getByPlaceholderText("Enter new password"), "abc");
        fireEvent.press(getByText("Update"));

        await waitFor(() => {
            expect(
                getByText("New password must be at least 6 characters.")
            ).toBeTruthy();
        });

        // Should not attempt reauthentication for short password
        expect(mockReauthenticate).not.toHaveBeenCalled();
    });

    it("shows error when current password is incorrect", async () => {
        const error: any = new Error("Wrong password");
        error.code = "auth/wrong-password";
        mockReauthenticate.mockRejectedValueOnce(error);

        const { getByText, getByPlaceholderText } = render(<ProfileScreen />);

        fireEvent.press(getByText("Password"));
        fireEvent.changeText(getByPlaceholderText("Enter current password"), "wrongpass");
        fireEvent.changeText(getByPlaceholderText("Enter new password"), "newpass123");
        fireEvent.press(getByText("Update"));

        await waitFor(() => {
            expect(getByText("Current password is incorrect.")).toBeTruthy();
        });
    });

    it("shows error when current password is invalid credential", async () => {
        const error: any = new Error("Invalid credential");
        error.code = "auth/invalid-credential";
        mockReauthenticate.mockRejectedValueOnce(error);

        const { getByText, getByPlaceholderText } = render(<ProfileScreen />);

        fireEvent.press(getByText("Password"));
        fireEvent.changeText(getByPlaceholderText("Enter current password"), "wrongpass");
        fireEvent.changeText(getByPlaceholderText("Enter new password"), "newpass123");
        fireEvent.press(getByText("Update"));

        await waitFor(() => {
            expect(getByText("Current password is incorrect.")).toBeTruthy();
        });
    });

    it("Update button is disabled when either password field is empty", () => {
        const { getByText, getByPlaceholderText } = render(<ProfileScreen />);

        fireEvent.press(getByText("Password"));

        // Only fill new password, leave current empty
        fireEvent.changeText(getByPlaceholderText("Enter new password"), "newpass123");
        fireEvent.press(getByText("Update"));

        expect(mockReauthenticate).not.toHaveBeenCalled();
        expect(mockUpdatePassword).not.toHaveBeenCalled();
    });

    // ── Logout ────────────────────────────────────────────────────────────────

    it("clears user and redirects to / when Logout is pressed", () => {
        const { getByText } = render(<ProfileScreen />);

        fireEvent.press(getByText("Logout"));

        expect(mockSetUser).toHaveBeenCalledWith(null);
        expect(mockReplace).toHaveBeenCalledWith("/");
    });

    // ── Not logged in ─────────────────────────────────────────────────────────

    it("shows 'Not logged in' alert and skips API call when currentUser is null", async () => {
        getMockedAuth().currentUser = null;

        const { Alert } = require("react-native");
        const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

        const { getByText, getByPlaceholderText } = render(<ProfileScreen />);

        fireEvent.press(getByText("Name"));
        fireEvent.changeText(getByPlaceholderText("Enter your name"), "Helen Updated");
        fireEvent.press(getByText("Update"));

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith(
                "Not logged in",
                "Please log in again."
            );
        });

        expect(mockUpdateProfile).not.toHaveBeenCalled();
    });
});