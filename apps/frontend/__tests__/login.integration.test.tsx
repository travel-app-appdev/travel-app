import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import LoginScreen from "@/app/login";

const mockReplace = jest.fn();
const mockSignIn = jest.fn();

jest.mock("expo-router", () => ({
  Link: ({ children }: any) => children,
  router: {
    replace: (...args: any[]) => mockReplace(...args),
  },
}));

jest.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: (...args: any[]) => mockSignIn(...args),
}));

jest.mock("@/src/lib/firebase", () => ({
  auth: {},
}));

jest.mock("@/assets/icons/back.svg", () => "Back");
jest.mock(
  "@/assets/mascots/mascot-hello-seablue.svg",
  () => "MascotHelloSeaBlue",
);
jest.mock("@/assets/visuals/blue-background.svg", () => "BlueBackground");

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows validation errors for empty submit", async () => {
    const { getByText } = render(<LoginScreen />);

    fireEvent.press(getByText("LET'S GOOOO"));

    await waitFor(() => {
      expect(getByText("Please enter your email.")).toBeTruthy();
      expect(getByText("Please enter your password.")).toBeTruthy();
    });
  });

  it("redirects to landing after successful login", async () => {
    mockSignIn.mockResolvedValueOnce({ user: { uid: "123" } });

    const { getByText, getByTestId } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId("login-email-input"), "test@test.com");
    fireEvent.changeText(getByTestId("login-password-input"), "123456");

    fireEvent.press(getByText("LET'S GOOOO"));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({}, "test@test.com", "123456");
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/landing");
    });
  });
});
