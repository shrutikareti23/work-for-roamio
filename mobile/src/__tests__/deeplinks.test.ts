import {
  FALLBACK_URLS,
  airbnbUrl,
  bookingUrl,
  directionsUrl,
  googleFlightsUrl,
  isValidDate,
  phoneUrl,
  reviewUrls,
  skyscannerUrl,
  websiteUrl,
  type FlightSearch,
  type StaySearch,
} from '@/lib/deeplinks';

const flight: FlightSearch = {
  origin: 'ORD',
  destination: 'LIS',
  departDate: '2026-12-10',
  returnDate: '2026-12-15',
  party: { adults: 2 },
};

const stay: StaySearch = {
  destination: 'Lisbon, Portugal',
  checkIn: '2026-12-10',
  checkOut: '2026-12-15',
  party: { adults: 2 },
};

describe('Google Flights', () => {
  it('builds a prefilled round-trip search', () => {
    const link = googleFlightsUrl(flight);
    expect(link.isFallback).toBe(false);
    expect(decodeURIComponent(link.url)).toBe(
      'https://www.google.com/travel/flights?q=Flights to LIS from ORD on 2026-12-10 through 2026-12-15 for 2 adults',
    );
  });

  it('handles one-way trips, children and lowercase codes', () => {
    const link = googleFlightsUrl({
      ...flight,
      origin: 'ord',
      returnDate: undefined,
      party: { adults: 1, childAges: [7] },
    });
    expect(decodeURIComponent(link.url)).toContain(
      'Flights to LIS from ORD on 2026-12-10 one way for 1 adult and 1 child',
    );
  });
});

describe('Skyscanner', () => {
  it('builds a prefilled round-trip search', () => {
    expect(skyscannerUrl(flight)).toEqual({
      url: 'https://www.skyscanner.net/transport/flights/ord/lis/261210/261215/?adultsv2=2&cabinclass=economy&rtn=1',
      isFallback: false,
    });
  });

  it('adds children ages and supports one-way', () => {
    const { url } = skyscannerUrl({
      ...flight,
      returnDate: undefined,
      party: { adults: 2, childAges: [4, 9] },
    });
    expect(url).toBe(
      'https://www.skyscanner.net/transport/flights/ord/lis/261210/?adultsv2=2&cabinclass=economy&rtn=0&childrenv2=4%7C9',
    );
  });
});

describe('flight fallbacks to the plain search page', () => {
  it.each<[string, Partial<FlightSearch>]>([
    ['a city name instead of a code', { origin: 'Chicago' }],
    ['same origin and destination', { destination: 'ORD' }],
    ['an invalid date', { departDate: '2026-02-30' }],
    ['return before departure', { returnDate: '2026-12-01' }],
    ['a date in the past', { departDate: '2026-01-01', today: '2026-11-05' }],
    ['zero adults', { party: { adults: 0 } }],
    ['too many adults', { party: { adults: 12 } }],
    ['an invalid child age', { party: { adults: 1, childAges: [19] } }],
  ])('%s', (_name, change) => {
    expect(googleFlightsUrl({ ...flight, ...change })).toEqual({
      url: FALLBACK_URLS.googleFlights,
      isFallback: true,
    });
    expect(skyscannerUrl({ ...flight, ...change })).toEqual({
      url: FALLBACK_URLS.skyscanner,
      isFallback: true,
    });
  });
});

describe('Booking.com', () => {
  it('builds a prefilled search with dates and guests', () => {
    expect(bookingUrl(stay).url).toBe(
      'https://www.booking.com/searchresults.html?ss=Lisbon%2C+Portugal&checkin=2026-12-10&checkout=2026-12-15&group_adults=2&group_children=0&no_rooms=1',
    );
  });

  it('adds one age per child', () => {
    const { url } = bookingUrl({ ...stay, party: { adults: 2, childAges: [5, 11] } });
    expect(url).toContain('group_children=2');
    expect(url).toContain('&age=5&age=11');
  });

  it('can search for one specific hotel', () => {
    const { url } = bookingUrl({ ...stay, destination: 'Hotel Avenida Palace, Lisbon' });
    expect(url).toContain('ss=Hotel+Avenida+Palace%2C+Lisbon');
  });
});

describe('Airbnb', () => {
  it('builds a prefilled search; under-2s count as infants', () => {
    expect(airbnbUrl({ ...stay, party: { adults: 2, childAges: [1, 6] } }).url).toBe(
      'https://www.airbnb.com/s/Lisbon--Portugal/homes?checkin=2026-12-10&checkout=2026-12-15&adults=2&children=1&infants=1',
    );
  });
});

describe('stay fallbacks', () => {
  it.each<[string, Partial<StaySearch>]>([
    ['empty destination', { destination: '  ' }],
    ['checkout same day as check-in', { checkOut: '2026-12-10' }],
    ['checkout before check-in', { checkOut: '2026-12-09' }],
    ['more rooms than adults', { rooms: 3 }],
    ['past check-in', { checkIn: '2026-01-01', today: '2026-11-05' }],
  ])('%s', (_name, change) => {
    expect(bookingUrl({ ...stay, ...change })).toEqual({
      url: FALLBACK_URLS.booking,
      isFallback: true,
    });
    expect(airbnbUrl({ ...stay, ...change })).toEqual({
      url: FALLBACK_URLS.airbnb,
      isFallback: true,
    });
  });
});

describe('directions', () => {
  const place = { name: 'Café A Brasileira', lat: 38.7107, lon: -9.1424, city: 'Lisbon' };

  it('uses Apple Maps on iPhone', () => {
    expect(directionsUrl(place, 'ios').url).toBe(
      'https://maps.apple.com/?daddr=38.7107%2C-9.1424&q=Caf%C3%A9+A+Brasileira',
    );
  });

  it('uses Google Maps on Android', () => {
    expect(directionsUrl(place, 'android').url).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=38.7107%2C-9.1424',
    );
  });

  it('falls back to a name search when coordinates are bad', () => {
    expect(directionsUrl({ ...place, lat: NaN }, 'android')).toEqual({
      url: 'https://www.google.com/maps/search/?api=1&query=Caf%C3%A9%20A%20Brasileira%2C%20Lisbon',
      isFallback: true,
    });
  });
});

describe('reviews', () => {
  it('links to Google Maps and Yelp searches for the place', () => {
    const r = reviewUrls({ name: 'Tasca do Chico', lat: 38.71, lon: -9.14, city: 'Lisbon' });
    expect(r.googleMaps.url).toBe(
      'https://www.google.com/maps/search/?api=1&query=Tasca%20do%20Chico%2C%20Lisbon',
    );
    expect(r.yelp.url).toBe('https://www.yelp.com/search?find_desc=Tasca+do+Chico&find_loc=Lisbon');
  });
});

describe('phone and website tags', () => {
  it.each([
    ['+351 21 342 4554', 'tel:+351213424554'],
    ['+351 21 342 4554;+351 91 000 0000', 'tel:+351213424554'],
    ['(312) 555-0199', 'tel:3125550199'],
    ['call us', null],
    ['12', null],
    [undefined, null],
  ])('phone %s -> %s', (tag, expected) => {
    expect(phoneUrl(tag)).toBe(expected);
  });

  it.each([
    ['https://example.pt/menu', 'https://example.pt/menu'],
    ['example.pt', 'https://example.pt/'],
    ['http://example.pt', 'http://example.pt/'],
    ['javascript:alert(1)', null],
    ['ftp://example.pt', null],
    ['not a site', null],
    [undefined, null],
  ])('website %s -> %s', (tag, expected) => {
    expect(websiteUrl(tag)).toBe(expected);
  });
});

describe('isValidDate', () => {
  it('rejects impossible dates', () => {
    expect(isValidDate('2028-02-29')).toBe(true);
    expect(isValidDate('2026-02-29')).toBe(false);
  });
});
