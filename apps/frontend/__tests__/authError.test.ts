import { getFirebaseAuthMessage } from "@/src/lib/authErrors";

describe("getFirebaseAuthMessage", () => {
  it("maps email already in use", () => {
    expect(
      getFirebaseAuthMessage({ code: "auth/email-already-in-use" }),
    ).toBe("This email is already registered.");
  });

  it("maps invalid credential", () => {
    expect(
      getFirebaseAuthMessage({ code: "auth/invalid-credential" }),
    ).toBe("Incorrect email or password.");
  });

  it("falls back to generic message", () => {
    expect(getFirebaseAuthMessage({ code: "unknown" })).toBe(
      "Something went wrong. Please try again.",
    );
  });
});