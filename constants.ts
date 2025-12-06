
import { VehicleOption, Location, PaymentMethod } from './types';

// Centered on a generic location in India (e.g., Mumbai) for default view
export const DEFAULT_CENTER = { lat: 19.0760, lng: 72.8777 };

export const PAYMENT_METHODS: { id: PaymentMethod; name: string; icon: string; color: string }[] = [
  { id: 'UPI', name: 'UPI', icon: 'fa-mobile-screen-button', color: 'text-teal-600' },
  { id: 'CASH', name: 'Cash', icon: 'fa-money-bill-wave', color: 'text-green-600' },
  { id: 'CARD', name: 'Credit/Debit Card', icon: 'fa-credit-card', color: 'text-blue-600' },
  { id: 'WALLET', name: 'Wallet', icon: 'fa-wallet', color: 'text-purple-600' },
];

// Predefined locations for realistic demos
export const PRESET_LOCATIONS: Record<string, Location> = {
  "Mumbai Airport": { lat: 19.0896, lng: 72.8656, address: "Mumbai Airport" },
  "Gateway of India": { lat: 18.9220, lng: 72.8347, address: "Gateway of India" },
  "Bandra Bandstand": { lat: 19.0427, lng: 72.8194, address: "Bandra Bandstand" },
  "Juhu Beach": { lat: 19.0988, lng: 72.8264, address: "Juhu Beach" },
  "Marine Drive": { lat: 18.9440, lng: 72.8238, address: "Marine Drive" },
  "Andheri Station": { lat: 19.1136, lng: 72.8464, address: "Andheri Station" },
  "Powai Lake": { lat: 19.1296, lng: 72.9105, address: "Powai Lake" },
};

export const VEHICLES: VehicleOption[] = [
  {
    id: 'BIKE',
    name: 'Moto',
    description: 'Fastest way to beat traffic',
    basePrice: 20,
    perKmRate: 8,
    icon: 'fa-motorcycle',
    eta: 3,
  },
  {
    id: 'AUTO',
    name: 'Auto Rickshaw',
    description: 'Budget friendly, open air',
    basePrice: 30,
    perKmRate: 15,
    icon: 'fa-truck-pickup',
    eta: 5,
  },
  {
    id: 'MINI_NON_AC',
    name: 'Mini (Non-AC)',
    description: 'Compact hatch, windows down',
    basePrice: 50,
    perKmRate: 18,
    icon: 'fa-car-side',
    eta: 8,
  },
  {
    id: 'MINI_AC',
    name: 'Mini (AC)',
    description: 'Cool & comfy hatchback',
    basePrice: 70,
    perKmRate: 20,
    icon: 'fa-car',
    eta: 8,
  },
  {
    id: 'SEDAN',
    name: 'Sedan',
    description: 'Spacious & premium ride',
    basePrice: 90,
    perKmRate: 24,
    icon: 'fa-car-alt',
    eta: 12,
  },
  {
    id: 'SUV',
    name: 'SUV',
    description: 'Room for everyone',
    basePrice: 150,
    perKmRate: 35,
    icon: 'fa-shuttle-van',
    eta: 15,
  },
];

export const MOCK_DRIVER = {
  name: "Rajesh Kumar",
  rating: 4.8,
  vehicleNumber: "MH 02 DN 4021",
  phone: "+91 98765 43210",
  photoUrl: "https://picsum.photos/100/100"
};
