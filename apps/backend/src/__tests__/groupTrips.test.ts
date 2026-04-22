import { groupTripsByDate } from '../__helpers__/groupTrips';

describe('groupTripsByDate', () => {
    const trips = [
        {
            trip_id: 'trip1',
            title: 'Vienna Trip',
            destination: 'Vienna',
            start_date: '2026-04-10',
            end_date: '2026-04-15',
            state: 'Planning',
            role: 'admin',
        },
        {
            trip_id: 'trip2',
            title: 'Paris Trip',
            destination: 'Paris',
            start_date: '2026-03-01',
            end_date: '2026-03-05',
            state: 'Final',
            role: 'member',
        },
    ];

    it('should group future/current trips into upcomingOrCurrent', () => {
        const result = groupTripsByDate(trips, new Date('2026-04-07'));

        expect(result.upcomingOrCurrent).toHaveLength(1);
        expect(result.upcomingOrCurrent[0].trip_id).toBe('trip1');
    });

    it('should group ended trips into past', () => {
        const result = groupTripsByDate(trips, new Date('2026-04-07'));

        expect(result.past).toHaveLength(1);
        expect(result.past[0].trip_id).toBe('trip2');
    });
});