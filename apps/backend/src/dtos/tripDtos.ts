export type GetMyTripsQueryDto = {
    userId: string;
};

export type CreateTripRequestDto = {
    idToken: string;
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
    planningEndAt: string;
    votingEndAt: string;
};

export type CreateTripWithoutAuthRequestDto = {
    userId: string;
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
    planningEndAt: string;
    votingEndAt: string;
};