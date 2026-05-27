import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { Platform } from "react-native";

import { TripCard } from "@/src/components/common/TripCard";

const originalPlatformOS = Platform.OS;

function renderPlanningTripCard() {
  const onPress = jest.fn();
  const onStatusPress = jest.fn();

  const result = render(
    <TripCard
      tripId="trip-1"
      title="Summer Trip"
      destination="Vienna"
      startDate="Jun 1"
      endDate="Jun 5"
      status="planning"
      members={[]}
      cardColor="#F7CE46"
      role="admin"
      onPress={onPress}
      onStatusPress={onStatusPress}
    />
  );

  return { ...result, onPress, onStatusPress };
}

describe("TripCard accessibility", () => {
  beforeEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "web",
    });
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => originalPlatformOS,
    });
    jest.clearAllMocks();
  });

  it("makes the nested status badge focusable and activatable by click on web", () => {
    const { getByLabelText, onPress, onStatusPress } = renderPlanningTripCard();
    const badge = getByLabelText("Planning phase");

    expect(badge.props.tabIndex).toBe(0);

    const clickEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    };
    fireEvent(badge, "click", clickEvent);

    expect(clickEvent.preventDefault).toHaveBeenCalled();
    expect(clickEvent.stopPropagation).toHaveBeenCalled();
    expect(onStatusPress).toHaveBeenCalledWith("planning");
    expect(onPress).not.toHaveBeenCalled();
  });

  it("activates the nested status badge by Enter on web", () => {
    const { getByLabelText, onPress, onStatusPress } = renderPlanningTripCard();
    const badge = getByLabelText("Planning phase");

    const keyEvent = {
      key: "Enter",
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    };
    fireEvent(badge, "keyDown", keyEvent);

    expect(keyEvent.preventDefault).toHaveBeenCalled();
    expect(keyEvent.stopPropagation).toHaveBeenCalled();
    expect(onStatusPress).toHaveBeenCalledWith("planning");
    expect(onPress).not.toHaveBeenCalled();
  });

  it("does not navigate on responder grant before the click finishes", () => {
    const { getByLabelText, onStatusPress } = renderPlanningTripCard();
    const badge = getByLabelText("Planning phase");
    const event = { stopPropagation: jest.fn() };

    fireEvent(badge, "responderGrant", event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(onStatusPress).not.toHaveBeenCalled();
  });
});
