
export type VehicleType = 'BIKE' | 'AUTO' | 'MINI_NON_AC' | 'MINI_AC' | 'SEDAN' | 'SUV';

export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'WALLET';

export interface VehicleOption {
  id: VehicleType;
  name: string;
  description: string;
  basePrice: number;
  perKmRate: number; // Added specific rate for each vehicle
  icon: string;
  eta: number; // in minutes
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface Driver {
  name: string;
  rating: number;
  vehicleNumber: string;
  phone: string;
  photoUrl: string;
}

export enum AppStep {
  LOGIN = 'LOGIN',
  LOCATION_SELECT = 'LOCATION_SELECT',
  VEHICLE_SELECT = 'VEHICLE_SELECT',
  BOOKING = 'BOOKING',
  TRACKING = 'TRACKING',
  HISTORY = 'HISTORY',
}

export interface RideDetails {
  pickup: Location;
  dropoff: Location;
  vehicle: VehicleOption | null;
  scheduledTime: Date | null;
  price: number;
  paymentMethod: PaymentMethod;
  driver?: Driver;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'driver';
  text: string;
  timestamp: Date;
}

export interface RideHistoryItem {
  id: string;
  date: string;
  pickup: string;
  dropoff: string;
  vehicle: string;
  price: number;
  paymentMethod: PaymentMethod;
  status: 'COMPLETED' | 'CANCELLED';
}
