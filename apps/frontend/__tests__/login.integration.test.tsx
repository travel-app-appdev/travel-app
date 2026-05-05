import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import LoginScreen from "@/app/login";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockHandleLogin = jest.fn();
const mockSetUser = jest.fn();
const mockSetIdToken = jest.fn();

const mockRouter = {
  replace: mockReplace,
  push: mockPush,
  back: mockBack,
};

jest.mock("@/src/context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    setUser: mockSetUser,
    setIdToken: mockSetIdToken,
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
  handleLogin: (...args: any[]) => mockHandleLogin(...args),
}));

jest.mock("@/assets/icons/back.svg", () => "Back");
jest.mock(
  "@/assets/mascots/mascot-hello-seablue.svg",
  () => "MascotHelloSeaBlue"
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

  it("updates auth state after successful login", async () => {
    mockHandleLogin.mockResolvedValueOnce({
      uid: "123",
      email: "test@test.com",
      name: "Helen",
      idToken: "valid-id-token",
    });

    const { getByText, getByTestId } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId("login-email-input"), "test@test.com");
    fireEvent.changeText(getByTestId("login-password-input"), "123456");

    fireEvent.press(getByText("LET'S GOOOO"));

    await waitFor(() => {
      expect(mockHandleLogin).toHaveBeenCalledWith("test@test.com", "123456");
    });

    expect(mockSetUser).toHaveBeenCalledWith({
      uid: "123",
      email: "test@test.com",
      name: "Helen",
      idToken: "valid-id-token",
    });
    expect(mockSetIdToken).toHaveBeenCalledWith("valid-id-token");
  });

  it("shows service error message on failed login", async () => {
    mockHandleLogin.mockRejectedValueOnce(
      new Error("Incorrect email or password.")
    );

    const { getByText, getByTestId } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId("login-email-input"), "test@test.com");
    fireEvent.changeText(getByTestId("login-password-input"), "wrongpass");

    fireEvent.press(getByText("LET'S GOOOO"));

    await waitFor(() => {
      expect(getByText("Incorrect email or password.")).toBeTruthy();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
