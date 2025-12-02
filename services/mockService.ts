import { Car, CarStatus, Reservation, User, UserRole, ActivityLog } from '../types';
import { addHours, addDays, subHours, isWithinInterval, parseISO } from 'date-fns';

// --- MOCK DATA ---

const MOCK_USERS: User[] = [
  { id: '1', email: 'alex@jara.com', name: 'Alex Director', role: UserRole.ADMIN, status: 'APPROVED', avatarUrl: 'https://picsum.photos/id/64/100/100' },
  { id: '2', email: 'sarah@jara.com', name: 'Sarah Engineer', role: UserRole.USER, status: 'APPROVED', avatarUrl: 'https://picsum.photos/id/65/100/100' },
];

const MOCK_CARS: Car[] = [
  {
    id: 'c1',
    name: 'Tesla Model 3',
    plate: 'JARA-001',
    imageUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&q=80&w=800',
    status: CarStatus.AVAILABLE,
    fuelType: 'electric',
    inWorkshop: false
  },
  {
    id: 'c2',
    name: 'Peugeot 3008',
    plate: 'JARA-002',
    imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800',
    status: CarStatus.AVAILABLE,
    fuelType: 'diesel',
    inWorkshop: false
  },
  {
    id: 'c3',
    name: 'Toyota Corolla',
    plate: 'JARA-003',
    imageUrl: 'https://images.unsplash.com/photo-1623869634636-9b5003ef76e2?auto=format&fit=crop&q=80&w=800',
    status: CarStatus.MAINTENANCE,
    nextServiceDate: addDays(new Date(), 2).toISOString(),
    fuelType: 'gasoline',
    inWorkshop: false
  },
  {
    id: 'c4',
    name: 'Ford Transit',
    plate: 'JARA-004',
    imageUrl: 'https://images.unsplash.com/photo-1596898160538-232185d97f6c?auto=format&fit=crop&q=80&w=800',
    status: CarStatus.WORKSHOP,
    fuelType: 'diesel',
    inWorkshop: true
  }
];

// Seed some reservations
const now = new Date();
const MOCK_RESERVATIONS: Reservation[] = [
  {
    id: 'r1',
    carId: 'c2',
    userId: '2',
    userName: 'Sarah Engineer',
    startTime: subHours(now, 1).toISOString(),
    endTime: addHours(now, 2).toISOString(), // Ends in 2 hours
    status: 'ACTIVE'
  },
  {
    id: 'r2',
    carId: 'c1',
    userId: '1',
    userName: 'Alex Director',
    startTime: addHours(now, 4).toISOString(), // Starts in 4 hours
    endTime: addHours(now, 8).toISOString(),
    status: 'ACTIVE'
  }
];

const MOCK_ACTIVITY: ActivityLog[] = [
  {
    id: 'a1',
    carId: 'c2',
    userId: '2',
    userName: 'Sarah Engineer',
    action: 'RESERVE',
    timestamp: subHours(now, 1).toISOString(),
    details: 'Booking for client meeting'
  },
  {
    id: 'a2',
    carId: 'c1',
    userId: '1',
    userName: 'Alex Director',
    action: 'RETURN',
    timestamp: subDays(now, 1).toISOString(),
    details: 'Parked in spot 42'
  }
];

function subDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - amount);
  return result;
}

// --- SERVICE LAYER ---

export const authService = {
  login: async (email: string, password: string): Promise<User> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email.includes('jara')) resolve(MOCK_USERS[0]);
        else reject(new Error('Invalid credentials'));
      }, 800);
    });
  },
  signup: async (email: string, name: string, password: string): Promise<User> => {
    // Mock signup
    return new Promise((resolve) => setTimeout(() => resolve({
      id: Math.random().toString(),
      email,
      name,
      role: UserRole.USER,
      status: 'PENDING'
    }), 800));
  }
};

export const dataService = {
  getCars: async () => MOCK_CARS,

  getReservations: async (carId?: string) => {
    if (carId) return MOCK_RESERVATIONS.filter(r => r.carId === carId && r.status !== 'CANCELLED');
    return MOCK_RESERVATIONS.filter(r => r.status !== 'CANCELLED');
  },

  getActivity: async (carId: string) => {
    return MOCK_ACTIVITY.filter(a => a.carId === carId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  createReservation: async (res: Omit<Reservation, 'id' | 'status' | 'userName'>) => {
    const newRes: Reservation = {
      ...res,
      id: Math.random().toString(),
      status: 'ACTIVE',
      userName: MOCK_USERS.find(u => u.id === res.userId)?.name || 'Unknown'
    };
    MOCK_RESERVATIONS.push(newRes);

    // Log activity
    MOCK_ACTIVITY.unshift({
      id: Math.random().toString(),
      carId: res.carId,
      userId: res.userId,
      userName: newRes.userName,
      action: 'RESERVE',
      timestamp: new Date().toISOString(),
      details: res.notes
    });

    return newRes;
  },

  cancelReservation: async (reservationId: string, userId: string) => {
    const idx = MOCK_RESERVATIONS.findIndex(r => r.id === reservationId);
    if (idx >= 0) {
      MOCK_RESERVATIONS[idx].status = 'CANCELLED';
      MOCK_ACTIVITY.unshift({
        id: Math.random().toString(),
        carId: MOCK_RESERVATIONS[idx].carId,
        userId: userId,
        userName: 'User', // Simplified
        action: 'CANCEL',
        timestamp: new Date().toISOString(),
      });
    }
  },

  addCar: async (car: Omit<Car, 'id'>) => {
    const newCar = { ...car, id: Math.random().toString() };
    MOCK_CARS.push(newCar);
    return newCar;
  }
};
