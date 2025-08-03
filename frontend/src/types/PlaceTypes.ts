export interface Location {
  lat: number;
  lng: number;
}

export interface Review {
  author_name: string;
  author_url: string;
  language: string;
  profile_photo_url: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
}

export interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface PlaceDetails {
  address_components: AddressComponent[];
  business_status: string;
  editorial_summary?: {
    language: string;
    overview: string;
  };
  formatted_address: string;
  geometry: {
    location: Location;
    viewport: {
      northeast: Location;
      southwest: Location;
    };
  };
  name: string;
  place_id: string;
  rating: number;
  reviews: Review[];
  types: string[];
  url: string;
  user_ratings_total: number;
}

export interface NeighborhoodPlace {
  location: Location;
  name: string;
}

export interface NeighborhoodData {
  parks: {
    count: number;
    places: NeighborhoodPlace[];
  };
  restaurants: {
    count: number;
    places: NeighborhoodPlace[];
  };
  supermarkets: {
    count: number;
    places: NeighborhoodPlace[];
  };
  transit_stations: {
    count: number;
    places: NeighborhoodPlace[];
  };
}

export type LocationType = 'parks' | 'restaurants' | 'supermarkets' | 'transit_stations';

export interface MapFilters {
  parks: boolean;
  restaurants: boolean;
  supermarkets: boolean;
  transit_stations: boolean;
}