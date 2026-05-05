import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import RegisterScreen from "@/app/register";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockHandleRegister = jest.fn();
const mockSetUser = jest.fn();

const mockRouter = {
  replace: mockReplace,
  push: mockPush,
  back: mockBack,
};

jest.mock("@/src/context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    setUser: mockSetUser,
    setIdToken: jest.fn(),
    isAuthenticated: false,
    loading: false,
    logout: jest.fn(),
  }),
}));

jest.mock("expo-router", () => ({
  Link: ({ children }: any) => children,
  router: mockRouter,
  useRouter: () => mockRouter,
}));

jest.mock("@/src/services/authServices", () => ({
  handleRegister: (...args: any[]) => mockHandleRegister(...args),
}));

jest.mock("@/assets/icons/back.svg", () => "Back");
jest.mock("@/assets/mascots/mascot-hello-pink.svg", () => "MascotHelloPink");
jest.mock("@/assets/visuals/pink-background.svg", () => "PinkBackground");
jest.mock("@/assets/visuals/flowers-blue.svg", () => "Flowers");

describe("RegisterScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows validation errors for empty submit", async () => {
    const { getByText } = render(<RegisterScreen />);

    fireEvent.press(getByText("LET'S GOOOO"));

    await waitFor(() => {
      expect(getByText("Please enter your name.")).toBeTruthy();
      expect(getByText("Please enter your email.")).toBeTruthy();
      expect(getByText("Please enter your password.")).toBeTruthy();
    });
  });

  it("updates auth state after successful registration", async () => {
    mockHandleRegister.mockResolvedValueOnce({
      uid: "123",
      email: "test@test.com",
      name: "Helen",
      idToken: "valid-id-token",
    });

    const { getByText, getByTestId } = render(<RegisterScreen />);

    fireEvent.changeText(getByTestId("register-name-input"), "Helen");
    fireEvent.changeText(getByTestId("register-email-input"), "test@test.com");
    fireEvent.changeText(getByTestId("register-password-input"), "123456");

    fireEvent.press(getByText("LET'S GOOOO"));

    await waitFor(() => {
      expect(mockHandleRegister).toHaveBeenCalledWith(
        "Helen",
        "test@test.com",
        "123456"
      );
    });

    expect(mockSetUser).toHaveBeenCalledWith({
      uid: "123",
      email: "test@test.com",
      name: "Helen",
      idToken: "valid-id-token",
    });
  });

  it("shows service error message on failed registration", async () => {
    mockHandleRegister.mockRejectedValueOnce(
      new Error("This email is already registered. Try logging in instead.")
    );

    const { getByText, getByTestId } = render(<RegisterScreen />);

    fireEvent.changeText(getByTestId("register-name-input"), "Helen");
    fireEvent.changeText(getByTestId("register-email-input"), "test@test.com");
    fireEvent.changeText(getByTestId("register-password-input"), "123456");

    fireEvent.press(getByText("LET'S GOOOO"));

    await waitFor(() => {
      expect(
        getByText("This email is already registered. Try logging in instead.")
      ).toBeTruthy();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
