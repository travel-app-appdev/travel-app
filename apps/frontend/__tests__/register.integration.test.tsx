import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import RegisterScreen from "@/app/register";

const mockReplace = jest.fn();
const mockCreateUser = jest.fn();
const mockUpdateProfile = jest.fn();

jest.mock("expo-router", () => ({
  Link: ({ children }: any) => children,
  router: {
    replace: (...args: any[]) => mockReplace(...args),
  },
}));

jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: (...args: any[]) => mockCreateUser(...args),
  updateProfile: (...args: any[]) => mockUpdateProfile(...args),
}));

jest.mock("@/src/lib/firebase", () => ({
  auth: {},
}));

jest.mock("@/assets/icons/back.svg", () => "Back");
jest.mock("@/assets/mascots/mascot-hello-pink.svg", () => "MascotHelloPink");
jest.mock("@/assets/visuals/yellow-background.svg", () => "RegisterYellowBg");
jest.mock("@/assets/visuals/flowers-blue.svg", () => "Flowers");

describe("RegisterScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows validation errors for empty submit", async () => {
    const { getByText } = render(<RegisterScreen />);

    fireEvent.press(getByText("LET’S GOOOO"));

    await waitFor(() => {
      expect(getByText("Please enter your name.")).toBeTruthy();
      expect(getByText("Please enter your email.")).toBeTruthy();
      expect(getByText("Please enter your password.")).toBeTruthy();
    });
  });

  it("redirects to landing after successful registration", async () => {
    mockCreateUser.mockResolvedValueOnce({
      user: { uid: "123" },
    });
    mockUpdateProfile.mockResolvedValueOnce(undefined);

    const { getByText, getByTestId } = render(<RegisterScreen />);

    fireEvent.changeText(getByTestId("register-name-input"), "Helen");
    fireEvent.changeText(getByTestId("register-email-input"), "test@test.com");
    fireEvent.changeText(getByTestId("register-password-input"), "123456");

    fireEvent.press(getByText("LET’S GOOOO"));

    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledWith({}, "test@test.com", "123456");
    });

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        { uid: "123" },
        { displayName: "Helen" },
      );
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/landing");
    });
  });
});