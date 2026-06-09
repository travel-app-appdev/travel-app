jest.mock("../services/notificationService", () => ({
  sendPushNotifications: jest.fn(),
}));

jest.setTimeout(30000);

import admin from "../config/firebase";
import {
  advanceTripStateIfNeeded,
  finishPlanningForMember,
  finishVotingForAdmin,
  transitionPlanningToNextState,
  transitionVotingToFinalIfNeeded,
} from "../services/tripsService";
import { TripState } from "../types/trip";

const hasRequiredEmulators =
  Boolean(process.env.FIRESTORE_EMULATOR_HOST) &&
  Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
const describeIfEmulator = hasRequiredEmulators ? describe : describe.skip;

const db = admin.firestore();
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const SLOT_ID = "2026-06-10_Morning Activity";
const PASSWORD = "Password123!";

let idCounter = 0;

function uniqueId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

function isoFromNow(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

function dateFromNow(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);
}

async function clearCollection(
  collection: FirebaseFirestore.CollectionReference,
): Promise<void> {
  while (true) {
    const snapshot = await collection.limit(100).get();
    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function clearFirestore(): Promise<void> {
  const collections = await db.listCollections();
  await Promise.all(collections.map(clearCollection));
}

async function createIdToken(uid: string): Promise<string> {
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!authHost) {
    throw new Error("FIREBASE_AUTH_EMULATOR_HOST is required");
  }

  const email = `${uid}@example.test`;
  await admin.auth().createUser({ uid, email, password: PASSWORD });

  const response = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: PASSWORD,
        returnSecureToken: true,
      }),
    },
  );
  const data = (await response.json()) as {
    idToken?: string;
    error?: { message?: string };
  };

  if (!response.ok || !data.idToken) {
    throw new Error(
      `Could not create emulator ID token: ${
        data.error?.message ?? response.statusText
      }`,
    );
  }

  return data.idToken;
}

async function seedTripWithMembers(input: {
  tripId: string;
  adminUserId: string;
  memberUserId?: string;
  state: TripState;
  planningEndAt: string;
  votingEndAt: string;
  adminPlanningDone?: boolean;
  memberPlanningDone?: boolean;
}): Promise<void> {
  const batch = db.batch();
  const tripRef = db.collection("trips").doc(input.tripId);

  batch.set(tripRef, {
    admin_user_id: input.adminUserId,
    title: "Timer test trip",
    destination: "Vienna",
    start_date: dateFromNow(10),
    end_date: dateFromNow(12),
    state: input.state,
    planning_started_at: admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - DAY_MS),
    ),
    planning_end_at: input.planningEndAt,
    voting_end_at: input.votingEndAt,
  });

  batch.set(db.collection("trip_members").doc(`${input.tripId}_admin`), {
    user_id: input.adminUserId,
    user_name: "Admin User",
    trip_id: input.tripId,
    role: "admin",
    invite_status: "accepted",
    planning_done: input.adminPlanningDone ?? false,
  });

  if (input.memberUserId) {
    batch.set(db.collection("trip_members").doc(`${input.tripId}_member`), {
      user_id: input.memberUserId,
      user_name: "Member User",
      trip_id: input.tripId,
      role: "member",
      invite_status: "accepted",
      planning_done: input.memberPlanningDone ?? false,
    });
  }

  await batch.commit();
}

async function seedCollidingActivities(
  tripId: string,
  slotId = SLOT_ID,
): Promise<{
  slotId: string;
  firstActivityId: string;
  secondActivityId: string;
}> {
  const firstActivityId = `${tripId}-activity-a`;
  const secondActivityId = `${tripId}-activity-b`;
  const batch = db.batch();

  batch.set(db.collection("activities").doc(firstActivityId), {
    trip_id: tripId,
    user_id: "admin-user",
    name: "Museum",
    source_type: "manual",
    created_at: admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 2 * HOUR_MS),
    ),
  });
  batch.set(db.collection("activities").doc(secondActivityId), {
    trip_id: tripId,
    user_id: "member-user",
    name: "Walking tour",
    source_type: "manual",
    created_at: admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - HOUR_MS),
    ),
  });
  batch.set(db.collection("timeslot_activities").doc(`${tripId}-link-a`), {
    slot_id: slotId,
    activity_id: firstActivityId,
    status: "candidate",
  });
  batch.set(db.collection("timeslot_activities").doc(`${tripId}-link-b`), {
    slot_id: slotId,
    activity_id: secondActivityId,
    status: "candidate",
  });

  await batch.commit();

  return { slotId, firstActivityId, secondActivityId };
}

async function seedVote(input: {
  tripId: string;
  slotId: string;
  userId: string;
  activityId: string;
}): Promise<void> {
  await db
    .collection("activity_votes")
    .doc(`${input.tripId}_${input.slotId}_${input.userId}`)
    .set({
      trip_id: input.tripId,
      slot_id: input.slotId,
      user_id: input.userId,
      activity_id: input.activityId,
      updated_at: admin.firestore.Timestamp.now(),
    });
}

async function getTripState(tripId: string): Promise<TripState | undefined> {
  const snapshot = await db.collection("trips").doc(tripId).get();
  return snapshot.data()?.state;
}

async function getFinalSlot(
  tripId: string,
  slotId: string,
): Promise<FirebaseFirestore.DocumentData | undefined> {
  const snapshot = await db
    .collection("final_itinerary_slots")
    .doc(`${tripId}_${slotId}`)
    .get();

  return snapshot.data();
}

describeIfEmulator("trip timer transitions in Firebase emulator", () => {
  beforeEach(async () => {
    await clearFirestore();
  });

  it("moves Planning to Voting when the planning timer has ended and activities need voting", async () => {
    const tripId = uniqueId("planning-timer");
    const adminUserId = uniqueId("admin");
    const memberUserId = uniqueId("member");

    await seedTripWithMembers({
      tripId,
      adminUserId,
      memberUserId,
      state: "Planning",
      planningEndAt: isoFromNow(-HOUR_MS),
      votingEndAt: isoFromNow(HOUR_MS),
    });
    await seedCollidingActivities(tripId);

    await expect(transitionPlanningToNextState(tripId)).resolves.toEqual(
      expect.objectContaining({
        trip_id: tripId,
        state: "Voting",
      }),
    );
    await expect(getTripState(tripId)).resolves.toBe("Voting");
  });

  it("moves Planning to Voting early when all members finish planning before the timer ends", async () => {
    const tripId = uniqueId("early-planning");
    const adminUserId = uniqueId("admin");
    const memberUserId = uniqueId("member");
    const memberToken = await createIdToken(memberUserId);

    await seedTripWithMembers({
      tripId,
      adminUserId,
      memberUserId,
      state: "Planning",
      planningEndAt: isoFromNow(HOUR_MS),
      votingEndAt: isoFromNow(2 * HOUR_MS),
      adminPlanningDone: true,
      memberPlanningDone: false,
    });
    await seedCollidingActivities(tripId);

    await expect(finishPlanningForMember(tripId, memberToken)).resolves.toEqual(
      expect.objectContaining({
        allDone: true,
        tripState: "Voting",
        completedMembers: 2,
        totalMembers: 2,
        planningDone: true,
      }),
    );
    await expect(getTripState(tripId)).resolves.toBe("Voting");
  });

  it("moves Voting to Final when the voting timer has ended", async () => {
    const tripId = uniqueId("voting-timer");
    const adminUserId = uniqueId("admin");
    const memberUserId = uniqueId("member");

    await seedTripWithMembers({
      tripId,
      adminUserId,
      memberUserId,
      state: "Voting",
      planningEndAt: isoFromNow(-2 * HOUR_MS),
      votingEndAt: isoFromNow(-HOUR_MS),
    });
    const { slotId, secondActivityId } = await seedCollidingActivities(tripId);
    await seedVote({
      tripId,
      slotId,
      userId: adminUserId,
      activityId: secondActivityId,
    });

    await expect(transitionVotingToFinalIfNeeded(tripId)).resolves.toEqual(
      expect.objectContaining({
        trip_id: tripId,
        state: "Final",
      }),
    );
    await expect(getTripState(tripId)).resolves.toBe("Final");
    await expect(getFinalSlot(tripId, slotId)).resolves.toEqual(
      expect.objectContaining({
        activity_id: secondActivityId,
        vote_count: 1,
      }),
    );
  });

  it("moves Voting to Final early when the admin ends voting before the timer ends", async () => {
    const tripId = uniqueId("early-voting");
    const adminUserId = uniqueId("admin");
    const memberUserId = uniqueId("member");
    const adminToken = await createIdToken(adminUserId);

    await seedTripWithMembers({
      tripId,
      adminUserId,
      memberUserId,
      state: "Voting",
      planningEndAt: isoFromNow(-HOUR_MS),
      votingEndAt: isoFromNow(HOUR_MS),
    });
    const { slotId, secondActivityId } = await seedCollidingActivities(tripId);
    await seedVote({
      tripId,
      slotId,
      userId: memberUserId,
      activityId: secondActivityId,
    });

    await expect(finishVotingForAdmin(tripId, adminToken)).resolves.toEqual({
      tripState: "Final",
    });
    await expect(getTripState(tripId)).resolves.toBe("Final");
    await expect(getFinalSlot(tripId, slotId)).resolves.toEqual(
      expect.objectContaining({
        activity_id: secondActivityId,
        vote_count: 1,
      }),
    );
  });

  it("keeps Final trips in Final when state repair runs", async () => {
    const tripId = uniqueId("final-state");
    const adminUserId = uniqueId("admin");
    const memberUserId = uniqueId("member");

    await seedTripWithMembers({
      tripId,
      adminUserId,
      memberUserId,
      state: "Final",
      planningEndAt: isoFromNow(-2 * HOUR_MS),
      votingEndAt: isoFromNow(-HOUR_MS),
    });

    await expect(advanceTripStateIfNeeded(tripId)).resolves.toEqual(
      expect.objectContaining({
        trip_id: tripId,
        state: "Final",
      }),
    );
    await expect(getTripState(tripId)).resolves.toBe("Final");
  });
});
