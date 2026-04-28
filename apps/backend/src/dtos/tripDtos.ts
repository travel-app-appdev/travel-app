export type GetMyTripsQueryDto = {
    userId: string;
};

export type CreateTripRequestDto = {
    idToken: string;
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
    planning_end_at: string;
    voting_end_at: string;
};

export type CreateTripWithoutAuthRequestDto = {
    userId: string;
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
    planning_end_at: string;
    voting_end_at: string;
};