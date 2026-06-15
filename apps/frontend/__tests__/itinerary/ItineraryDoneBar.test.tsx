import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { ItineraryDoneBar } from "@/src/components/itinerary/ItineraryDoneBar";

jest.mock("@/assets/icons/check_mark.svg", () => {
  const { View } = require("react-native");
  function MockCheckIcon(props: any) {
    return <View {...props} />;
  }
  return MockCheckIcon;
});

jest.mock("@/assets/icons/info.svg", () => {
  const { View } = require("react-native");
  function MockInfoIcon(props: any) {
    return <View {...props} />;
  }
  return MockInfoIcon;
});

jest.mock("@/src/components/common/AppText", () => ({
  AppText: ({ children }: { children: React.ReactNode }) => {
    const { Text } = require("react-native");
    return <Text>{children}</Text>;
  },
}));

function renderDoneBar(checked: boolean) {
  return render(
    <ItineraryDoneBar
      label="Submit Voting"
      checked={checked}
      accentColor="#E582FB"
      shadowColor="#E582FB"
      shadow="0px -10px 16px rgba(229, 130, 251, 0.18)"
      accessibilityLabel="Submit voting"
      accessibilityCheckedLabel="Voting is being submitted"
      infoAccessibilityLabel="Show voting information"
      onPress={jest.fn()}
      onInfoPress={jest.fn()}
    />
  );
}

describe("ItineraryDoneBar", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("renders the unchecked square when unchecked", () => {
    const { getByTestId, queryByTestId } = renderDoneBar(false);

    expect(getByTestId("done-bar-unchecked-icon")).toBeTruthy();
    expect(queryByTestId("done-bar-checked-icon")).toBeNull();
  });

  it("renders the check icon when checked", () => {
    const { getByTestId, queryByTestId } = renderDoneBar(true);

    expect(getByTestId("done-bar-checked-icon")).toBeTruthy();
    expect(queryByTestId("done-bar-unchecked-icon")).toBeNull();
  });

  it("can dock to the bottom edge with only the top corners rounded", () => {
    const { getByTestId } = render(
      <ItineraryDoneBar
        label="Planning done"
        checked={true}
        docked
        accentColor="#F7CE46"
        shadowColor="#F77646"
        shadow="0px -10px 16px rgba(255, 107, 53, 0.15)"
        accessibilityLabel="Mark planning as done"
        accessibilityCheckedLabel="Mark planning as not done"
        infoAccessibilityLabel="Show planning done info"
        onPress={jest.fn()}
        onInfoPress={jest.fn()}
      />
    );

    const wrapperStyle = StyleSheet.flatten(
      getByTestId("done-bar-wrapper").props.style
    );
    const footerStyle = StyleSheet.flatten(
      getByTestId("done-bar-footer").props.style
    );

    expect(wrapperStyle.left).toBe(0);
    expect(wrapperStyle.right).toBe(0);
    expect(wrapperStyle.bottom).toBe(0);
    expect(footerStyle.borderTopLeftRadius).toBe(23);
    expect(footerStyle.borderTopRightRadius).toBe(23);
    expect(footerStyle.borderBottomLeftRadius).toBe(0);
    expect(footerStyle.borderBottomRightRadius).toBe(0);
  });

  it("uses checkbox semantics by default for planning completion", () => {
    const { getByTestId } = render(
      <ItineraryDoneBar
        label="Planning done"
        checked={true}
        accentColor="#F7CE46"
        shadowColor="#F77646"
        shadow="0px -10px 16px rgba(255, 107, 53, 0.15)"
        accessibilityLabel="Mark planning as done"
        accessibilityCheckedLabel="Mark planning as not done"
        infoAccessibilityLabel="Show planning done info"
        onPress={jest.fn()}
        onInfoPress={jest.fn()}
      />
    );

    expect(getByTestId("done-bar-submit-button").props.accessibilityRole).toBe(
      "checkbox"
    );
    expect(
      getByTestId("done-bar-submit-button").props.accessibilityState.checked
    ).toBe(true);
  });

  it("can use button semantics for submit actions", () => {
    const { getByTestId } = render(
      <ItineraryDoneBar
        label="Submit Voting"
        checked={false}
        accentColor="#E582FB"
        shadowColor="#E582FB"
        shadow="0px -10px 16px rgba(229, 130, 251, 0.18)"
        accessibilityRole="button"
        accessibilityLabel="End voting for everyone"
        accessibilityCheckedLabel="Voting is being submitted"
        infoAccessibilityLabel="Show voting done info"
        onPress={jest.fn()}
        onInfoPress={jest.fn()}
      />
    );

    expect(getByTestId("done-bar-submit-button").props.accessibilityRole).toBe(
      "button"
    );
  });

  it("fires the submit action", async () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ItineraryDoneBar
        label="Planning done"
        checked={false}
        accentColor="#F7CE46"
        shadowColor="#F77646"
        shadow="0px -10px 16px rgba(255, 107, 53, 0.15)"
        accessibilityLabel="Mark planning as done"
        accessibilityCheckedLabel="Mark planning as not done"
        infoAccessibilityLabel="Show planning done info"
        onPress={onPress}
        onInfoPress={jest.fn()}
      />
    );

    fireEvent.press(getByTestId("done-bar-submit-button"));
    await Promise.resolve();

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("fires the info action", async () => {
    const onInfoPress = jest.fn();
    const { getByTestId } = render(
      <ItineraryDoneBar
        label="Planning done"
        checked={false}
        accentColor="#F7CE46"
        shadowColor="#F77646"
        shadow="0px -10px 16px rgba(255, 107, 53, 0.15)"
        accessibilityLabel="Mark planning as done"
        accessibilityCheckedLabel="Mark planning as not done"
        infoAccessibilityLabel="Show planning done info"
        onPress={jest.fn()}
        onInfoPress={onInfoPress}
      />
    );

    fireEvent.press(getByTestId("done-bar-info-button"));
    await Promise.resolve();

    expect(onInfoPress).toHaveBeenCalledTimes(1);
  });
});
