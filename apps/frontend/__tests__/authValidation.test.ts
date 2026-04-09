import { validateLogin, validateRegister } from "@/src/lib/authValidation";

describe("validateLogin", () => {
  it("returns error for empty email", () => {
    expect(validateLogin({ email: "", password: "123456" })).toEqual({
      email: "Please enter your email.",
    });
  });

  it("returns error for invalid email", () => {
    expect(validateLogin({ email: "abc", password: "123456" })).toEqual({
      email: "Please enter a valid email address.",
    });
  });

  it("returns error for empty password", () => {
    expect(validateLogin({ email: "test@test.com", password: "" })).toEqual({
      password: "Please enter your password.",
    });
  });

  it("returns no errors for valid input", () => {
    expect(
      validateLogin({ email: "test@test.com", password: "123456" }),
    ).toEqual({});
  });
});

describe("validateRegister", () => {
  it("returns error for empty name", () => {
    expect(
      validateRegister({
        name: "",
        email: "test@test.com",
        password: "123456",
      }),
    ).toEqual({
      name: "Please enter your name.",
    });
  });

  it("returns error for short password", () => {
    expect(
      validateRegister({
        name: "Helen",
        email: "test@test.com",
        password: "123",
      }),
    ).toEqual({
      password: "Password must be at least 6 characters.",
    });
  });

  it("returns no errors for valid input", () => {
    expect(
      validateRegister({
        name: "Helen",
        email: "test@test.com",
        password: "123456",
      }),
    ).toEqual({});
  });
});
