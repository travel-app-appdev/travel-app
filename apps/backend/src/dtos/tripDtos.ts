// apps/backend/src/dtos/tripDtos.ts
export type GetMyTripsQueryDto = {
    userId: string;
};

export type CreateTripRequestDto = {
    idToken: string;
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
};

export type CreateTripWithoutAuthRequestDto = {
    userId: string;
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
};