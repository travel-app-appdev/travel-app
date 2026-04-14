// src/__tests__/createTrip.integration.test.ts
import request from "supertest";
import admin from "../config/firebase";
import app from "../index";

describe.skip("Integration: create trip and fetch my trips", () => {
    const testUserId = "integration-user-1";

    beforeAll(async () => {
        // Ensure admin SDK talks to Firestore emulator
        process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "demo-project";
        process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "localhost:8080";

        const db = admin.firestore();

        // Clean collections before running the test
        const collections = ["trips", "trip_members"];
        for (const col of collections) {
            const snap = await db.collection(col).get();
            const batch = db.batch();
            snap.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
        }
    });

    it("creates a trip and returns it via /trips/my", async () => {
        // 1) Call backend to create a trip (test-only route)
        const createRes = await request(app)
            .post("/trips/test-create")
            .send({
                userId: testUserId,
                title: "Integration Trip",
                destination: "Vienna",
                start_date: "2026-06-01",
                end_date: "2026-06-05",
            })
            .expect(201);

        expect(createRes.body).toMatchObject({
            title: "Integration Trip",
            destination: "Vienna",
            start_date: "2026-06-01",
            end_date: "2026-06-05",
            state: "Planning",
            role: "admin",
        });

        const createdTripId = createRes.body.trip_id;
        expect(createdTripId).toBeDefined();

        // 2) Call backend to fetch that user's trips
        const myTripsRes = await request(app)
            .get("/trips/my")
            .query({ userId: testUserId })
            .expect(200);

        const trips = myTripsRes.body as any[];
        const found = trips.find((t) => t.trip_id === createdTripId);

        expect(found).toBeDefined();
        expect(found).toMatchObject({
            trip_id: createdTripId,
            title: "Integration Trip",
            destination: "Vienna",
            start_date: "2026-06-01",
            end_date: "2026-06-05",
            state: "Planning",
            role: "admin",
        });

        // 3) Direct Firestore checks
        const db = admin.firestore();

        const tripDoc = await db.collection("trips").doc(createdTripId).get();
        expect(tripDoc.exists).toBe(true);
        expect(tripDoc.data()).toMatchObject({
            admin_user_id: testUserId,
            title: "Integration Trip",
            destination: "Vienna",
            start_date: "2026-06-01",
            end_date: "2026-06-05",
            state: "Planning",
        });

        const membersSnap = await db
            .collection("trip_members")
            .where("trip_id", "==", createdTripId)
            .where("user_id", "==", testUserId)
            .get();

        expect(membersSnap.empty).toBe(false);
        expect(membersSnap.docs[0].data()).toMatchObject({
            user_id: testUserId,
            trip_id: createdTripId,
            role: "admin",
            invite_status: "accepted",
        });
    });
});