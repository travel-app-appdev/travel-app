import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import RegisterScreen from "@/app/register";

const mockReplace = jest.fn();
const mockHandleRegister = jest.fn();

jest.mock("expo-router", () => ({
  Link: ({ children }: any) => children,
  router: {
    replace: (...args: any[]) => mockReplace(...args),
  },
}));

jest.mock("@/src/services/authService", () => ({
  handleRegister: (...args: any[]) => mockHandleRegister(...args),
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

  it("redirects to home page after successful registration", async () => {
    mockHandleRegister.mockResolvedValueOnce({
      uid: "123",
      email: "test@test.com",
      name: "Helen",
    });

    const { getByText, getByTestId } = render(<RegisterScreen />);

    fireEvent.changeText(getByTestId("register-name-input"), "Helen");
    fireEvent.changeText(getByTestId("register-email-input"), "test@test.com");
    fireEvent.changeText(getByTestId("register-password-input"), "123456");

    fireEvent.press(getByText("LET’S GOOOO"));

    await waitFor(() => {
      expect(mockHandleRegister).toHaveBeenCalledWith(
        "Helen",
        "test@test.com",
        "123456"
      );
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/home");
    });
  });

  it("shows service error message on failed registration", async () => {
    mockHandleRegister.mockRejectedValueOnce(
      new Error("Email is already registered")
    );

    const { getByText, getByTestId } = render(<RegisterScreen />);

    fireEvent.changeText(getByTestId("register-name-input"), "Helen");
    fireEvent.changeText(getByTestId("register-email-input"), "test@test.com");
    fireEvent.changeText(getByTestId("register-password-input"), "123456");

    fireEvent.press(getByText("LET’S GOOOO"));

    await waitFor(() => {
      expect(getByText("Email is already registered")).toBeTruthy();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
