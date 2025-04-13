export interface Itinerary {
  $permissions: any;
  $createdBy(arg0: string, $createdBy: any): unknown;
  $id?: string;
  title: string;
  userId: string;
  start_date: string; // ISO date format
  sharedWith?: string[]; // Array of user IDs who can edit this itinerary
  end_date: string; // ISO date format
  destinations: string[];
  createdAt?: string; // ISO datetime format - matches your database field
}

export interface DayPlan {
  $id?: string;
  itineraries_Id: string; // Changed from itineraries_Id to match your database field
  day: number;
  date: string; // ISO date format
}

export interface Activity {
  $id?: string;
  dayPlansId: string;
  time: string; // Format like "09:00", "14:30", etc.
  title: string;
  type:
    | "Transport"
    | "Accommodation"
    | "Activity"
    | "Food"
    | "Sightseeing"
    | "Tour"
    | "Adventure"
    | "Shopping"
    | "Entertainment"
    | "Wellness"
    | "Cultural"
    | "Nature"
    | "Beach"
    | "Business"
    | "Rest"
    | string;
  notes: string;
}

// You might want to add additional interfaces for your app
export interface ItineraryWithDetails {
  itinerary: Itinerary;
  dayPlans: (DayPlan & { activities: Activity[] })[];
}
