// apps/frontend/__tests__/profile.integration.test.tsx

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import ProfileScreen from "@/app/profile";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockDismissAll = jest.fn();
const mockUpdateProfile = jest.fn();
const mockGetIdToken = jest.fn();
const mockUpdatePassword = jest.fn();
const mockReauthenticate = jest.fn();
const mockSignOut = jest.fn();

// expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
    dismissAll: mockDismissAll,
  }),
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
    signOut: () => mockSignOut(),
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
    mockSignOut.mockResolvedValue(undefined);
  });

  // ── Renders ───────────────────────────────────────────────────────────────

  it("renders the profile screen with name, email and password fields", () => {
    const { getByLabelText } = render(<ProfileScreen />);

    expect(getByLabelText("Edit name, current value: Helen")).toBeTruthy();
    expect(
      getByLabelText("Edit email, current value: helen@example.com")
    ).toBeTruthy();
    expect(getByLabelText("Edit password")).toBeTruthy();
  });

  it("renders the current user name and email as values", () => {
    const { getByText, getByLabelText } = render(<ProfileScreen />);

    expect(getByText("Helen")).toBeTruthy();
    expect(
      getByLabelText("Edit email, current value: helen@example.com")
    ).toBeTruthy();
  });

  // ── Name update ───────────────────────────────────────────────────────────

  it("expands the name field when Name row is pressed", () => {
    const { getByLabelText, queryByPlaceholderText } = render(
      <ProfileScreen />
    );

    expect(queryByPlaceholderText("Enter your name")).toBeNull();
    fireEvent.press(getByLabelText("Edit name, current value: Helen"));
    expect(queryByPlaceholderText("Enter your name")).toBeTruthy();
  });

  it("calls updateProfile with idToken and new name on Update press", async () => {
    mockUpdateProfile.mockResolvedValueOnce({
      uid: "user-123",
      email: "helen@example.com",
      name: "Helen Updated",
    });

    const { getByLabelText, getByPlaceholderText, getByText } = render(
      <ProfileScreen />
    );

    fireEvent.press(getByLabelText("Edit name, current value: Helen"));
    fireEvent.changeText(
      getByPlaceholderText("Enter your name"),
      "Helen Updated"
    );
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

    const { getByLabelText, getByPlaceholderText, getByText } = render(
      <ProfileScreen />
    );

    fireEvent.press(getByLabelText("Edit name, current value: Helen"));
    fireEvent.changeText(
      getByPlaceholderText("Enter your name"),
      "Helen Updated"
    );
    fireEvent.press(getByText("Update"));

    await waitFor(() => {
      expect(
        getByText("Name is updated!", { includeHiddenElements: true })
      ).toBeTruthy();
    });
  });

  it("shows an error message when name update fails", async () => {
    mockUpdateProfile.mockRejectedValueOnce(
      new Error("Failed to update name.")
    );

    const { getByLabelText, getByPlaceholderText, getByText } = render(
      <ProfileScreen />
    );

    fireEvent.press(getByLabelText("Edit name, current value: Helen"));
    fireEvent.changeText(
      getByPlaceholderText("Enter your name"),
      "Helen Updated"
    );
    fireEvent.press(getByText("Update"));

    await waitFor(() => {
      expect(getByText("Failed to update name.")).toBeTruthy();
    });
  });

  it("Update button is disabled when name input is empty", () => {
    const { getByLabelText, getByPlaceholderText, getByText } = render(
      <ProfileScreen />
    );

    fireEvent.press(getByLabelText("Edit name, current value: Helen"));
    fireEvent.changeText(getByPlaceholderText("Enter your name"), "");

    const updateButton = getByText("Update");
    fireEvent.press(updateButton);
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  // ── Email update ──────────────────────────────────────────────────────────

  it("expands the email field when Email row is pressed", () => {
    const { getByLabelText, queryByPlaceholderText } = render(
      <ProfileScreen />
    );

    expect(queryByPlaceholderText("Enter your email")).toBeNull();
    fireEvent.press(
      getByLabelText("Edit email, current value: helen@example.com")
    );
    expect(queryByPlaceholderText("Enter your email")).toBeTruthy();
  });

  it("calls updateProfile with idToken and new email on Update press", async () => {
    mockUpdateProfile.mockResolvedValueOnce({
      uid: "user-123",
      email: "new@example.com",
      name: "Helen",
    });

    const { getByLabelText, getByPlaceholderText, getByText } = render(
      <ProfileScreen />
    );

    fireEvent.press(
      getByLabelText("Edit email, current value: helen@example.com")
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter your email"),
      "new@example.com"
    );
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

    const { getByLabelText, getByPlaceholderText, getByText } = render(
      <ProfileScreen />
    );

    fireEvent.press(
      getByLabelText("Edit email, current value: helen@example.com")
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter your email"),
      "new@example.com"
    );
    fireEvent.press(getByText("Update"));

    await waitFor(() => {
      expect(
        getByText("Email is updated!", { includeHiddenElements: true })
      ).toBeTruthy();
    });
  });

  it("shows an error when email is already in use", async () => {
    mockUpdateProfile.mockRejectedValueOnce(
      new Error("This email is already in use.")
    );

    const { getByLabelText, getByPlaceholderText, getByText } = render(
      <ProfileScreen />
    );

    fireEvent.press(
      getByLabelText("Edit email, current value: helen@example.com")
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter your email"),
      "taken@example.com"
    );
    fireEvent.press(getByText("Update"));

    await waitFor(() => {
      expect(getByText("This email is already in use.")).toBeTruthy();
    });
  });

  it("Update button is disabled when email has no @ sign", () => {
    const { getByLabelText, getByPlaceholderText, getByText } = render(
      <ProfileScreen />
    );

    fireEvent.press(
      getByLabelText("Edit email, current value: helen@example.com")
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter your email"),
      "notanemail"
    );

    fireEvent.press(getByText("Update"));
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  // ── Password update ───────────────────────────────────────────────────────

  it("expands the password field when Password row is pressed", () => {
    const { getByLabelText, queryByPlaceholderText } = render(
      <ProfileScreen />
    );

    expect(queryByPlaceholderText("Enter current password")).toBeNull();
    fireEvent.press(getByLabelText("Edit password"));
    expect(queryByPlaceholderText("Enter current password")).toBeTruthy();
    expect(queryByPlaceholderText("Enter new password")).toBeTruthy();
  });

  it("calls reauthenticate and updatePassword on successful password update", async () => {
    const { getByLabelText, getByPlaceholderText, getByText } = render(
      <ProfileScreen />
    );

    fireEvent.press(getByLabelText("Edit password"));
    fireEvent.changeText(
      getByPlaceholderText("Enter current password"),
      "oldpass123"
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter new password"),
      "newpass123"
    );
    fireEvent.press(getByText("Update"));

    await waitFor(() => {
      expect(mockReauthenticate).toHaveBeenCalled();
      expect(mockUpdatePassword).toHaveBeenCalled();
    });
  });

  it("shows 'Password is updated!' after successful password update", async () => {
    const { getByLabelText, getByPlaceholderText, getByText } = render(
      <ProfileScreen />
    );

    fireEvent.press(getByLabelText("Edit password"));
    fireEvent.changeText(
      getByPlaceholderText("Enter current password"),
      "oldpass123"
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter new password"),
      "newpass123"
    );
    fireEvent.press(getByText("Update"));

    await waitFor(() => {
      expect(
        getByText("Password is updated!", { includeHiddenElements: true })
      ).toBeTruthy();
    });
  });

  it("shows error when new password is shorter than 6 characters", async () => {
    const { getByLabelText, getByPlaceholderText, getByText } = render(
      <ProfileScreen />
    );

    fireEvent.press(getByLabelText("Edit password"));
    fireEvent.changeText(
      getByPlaceholderText("Enter current password"),
      "oldpass123"
    );
    fireEvent.changeText(getByPlaceholderText("Enter new password"), "abc");
    fireEvent.press(getByText("Update"));

    await waitFor(() => {
      expect(
        getByText("New password must be at least 6 characters.", {
          includeHiddenElements: true,
        })
      ).toBeTruthy();
    });

    expect(mockReauthenticate).not.toHaveBeenCalled();
  });

  it("shows error when current password is incorrect", async () => {
    const error: any = new Error("Wrong password");
    error.code = "auth/wrong-password";
    mockReauthenticate.mockRejectedValueOnce(error);

    const { getByLabelText, getByPlaceholderText, getByText } = render(
      <ProfileScreen />
    );

    fireEvent.press(getByLabelText("Edit password"));
    fireEvent.changeText(
      getByPlaceholderText("Enter current password"),
      "wrongpass"
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter new password"),
      "newpass123"
    );
    fireEvent.press(getByText("Update"));

    await waitFor(() => {
      expect(
        getByText("Current password is incorrect.", {
          includeHiddenElements: true,
        })
      ).toBeTruthy();
    });
  });

  it("shows error when current password is invalid credential", async () => {
    const error: any = new Error("Invalid credential");
    error.code = "auth/invalid-credential";
    mockReauthenticate.mockRejectedValueOnce(error);

    const { getByLabelText, getByPlaceholderText, getByText } = render(
      <ProfileScreen />
    );

    fireEvent.press(getByLabelText("Edit password"));
    fireEvent.changeText(
      getByPlaceholderText("Enter current password"),
      "wrongpass"
    );
    fireEvent.changeText(
      getByPlaceholderText("Enter new password"),
      "newpass123"
    );
    fireEvent.press(getByText("Update"));

    await waitFor(() => {
      expect(
        getByText("Current password is incorrect.", {
          includeHiddenElements: true,
        })
      ).toBeTruthy();
    });
  });

  it("Update button is disabled when either password field is empty", () => {
    const { getByLabelText, getByPlaceholderText, getByText } = render(
      <ProfileScreen />
    );

    fireEvent.press(getByLabelText("Edit password"));

    // Only fill new password, leave current empty
    fireEvent.changeText(
      getByPlaceholderText("Enter new password"),
      "newpass123"
    );
    fireEvent.press(getByText("Update"));

    expect(mockReauthenticate).not.toHaveBeenCalled();
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  // ── Logout ────────────────────────────────────────────────────────────────

  it("signs out and redirects to / when Logout is pressed", async () => {
    const { getByText } = render(<ProfileScreen />);

    fireEvent.press(getByText("Logout"));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockDismissAll).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
    expect(mockSetUser).not.toHaveBeenCalled();
  });

  // ── Not logged in ─────────────────────────────────────────────────────────

  it("shows 'Not logged in' message and skips API call when currentUser is null", async () => {
    getMockedAuth().currentUser = null;

    const { getByLabelText, getByPlaceholderText, getByText } = render(
      <ProfileScreen />
    );

    fireEvent.press(getByLabelText("Edit name, current value: Helen"));
    fireEvent.changeText(
      getByPlaceholderText("Enter your name"),
      "Helen Updated"
    );
    fireEvent.press(getByText("Update"));

    await waitFor(() => {
      expect(getByText("Not logged in")).toBeTruthy();
      expect(getByText("Please log in again.")).toBeTruthy();
    });

    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });
});
