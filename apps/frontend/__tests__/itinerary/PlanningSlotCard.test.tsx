import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { PlanningSlotCard } from "@/src/components/itinerary/PlanningSlotCard";
import type { Activity, TimeSlot } from "@/src/types/itinerary";

jest.mock("@/assets/icons/location-heart.svg", () => "LocationHeart");
jest.mock("@/assets/icons/location-pin.svg", () => "LocationPin");
jest.mock("@/assets/icons/google.svg", () => "GoogleIcon");
jest.mock("@/assets/icons/add.svg", () => "AddIcon");
jest.mock("@/assets/icons/edit.svg", () => "EditIcon");
jest.mock("@/assets/icons/timer.svg", () => "TimerIcon");

const slot: TimeSlot = {
  id: "Breakfast",
  label: "Breakfast",
  startHour: 0,
};

const activity: Activity = {
  id: "activity-123",
  dayId: "2026-06-01",
  slotId: "Breakfast",
  name: "Museum visit",
  address: "Museumplatz 1",
  googleMapsUrl: "https://maps.google.com/museum",
};

const activityWithTime: Activity = {
  ...activity,
  startTime: "08:00",
  endTime: "11:00",
};

describe("PlanningSlotCard", () => {
  it("renders an empty slot as a full-card add button", () => {
    const onAddActivity = jest.fn();
    const onEditActivity = jest.fn();

    const { getByLabelText, getByText, queryByText } = render(
      <PlanningSlotCard
        slot={slot}
        onAddActivity={onAddActivity}
        onEditActivity={onEditActivity}
      />
    );

    expect(getByText("Breakfast", { includeHiddenElements: true })).toBeTruthy();
    expect(getByText("Empty Activity")).toBeTruthy();
    expect(queryByText(/Add\s*activity/i)).toBeNull();

    fireEvent.press(getByLabelText("Add activity at Breakfast"));

    expect(onAddActivity).toHaveBeenCalledWith("Breakfast");
    expect(onEditActivity).not.toHaveBeenCalled();
  });

  it("renders a filled slot with details and keeps the edit button", () => {
    const onAddActivity = jest.fn();
    const onEditActivity = jest.fn();

    const { getByLabelText, getByText, queryByText } = render(
      <PlanningSlotCard
        slot={slot}
        activity={activity}
        onAddActivity={onAddActivity}
        onEditActivity={onEditActivity}
      />
    );

    expect(getByText("Breakfast", { includeHiddenElements: true })).toBeTruthy();
    expect(getByText("Museum visit")).toBeTruthy();
    expect(getByText("Museumplatz 1")).toBeTruthy();
    expect(getByText("https://maps.google.com/museum")).toBeTruthy();
    expect(getByText(/Edit\s*activity/i)).toBeTruthy();
    expect(queryByText("Empty Activity")).toBeNull();

    fireEvent.press(getByLabelText("Edit activity Museum visit at Breakfast"));

    expect(onEditActivity).toHaveBeenCalledWith(activity);
    expect(onAddActivity).not.toHaveBeenCalled();
  });

  it("renders a saved display-only activity time range", () => {
    const { getByText } = render(
      <PlanningSlotCard
        slot={slot}
        activity={activityWithTime}
        onAddActivity={jest.fn()}
        onEditActivity={jest.fn()}
      />
    );

    expect(getByText("08:00 - 11:00")).toBeTruthy();
  });

  it("does not render a time range when only one time exists", () => {
    const { queryByText } = render(
      <PlanningSlotCard
        slot={slot}
        activity={{ ...activity, startTime: "08:00" }}
        onAddActivity={jest.fn()}
        onEditActivity={jest.fn()}
      />
    );

    expect(queryByText("08:00")).toBeNull();
  });
});
