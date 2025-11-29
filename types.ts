export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}

export enum CarStatus {
  AVAILABLE = 'available',
  BOOKED = 'booked',
  MAINTENANCE = 'maintenance', // Yellow: Needs attention but driveable or scheduled soon
  WORKSHOP = 'unavailable', // Mapeado a 'unavailable' en DB
}

export interface Car {
  id: string;
  name: string; // Marca y modelo combinado (ej. "Toyota Corolla")
  plate: string; // license_plate en DB
  imageUrl: string;
  status: CarStatus;
  fuelType: 'gasoline' | 'diesel' | 'electric';
  nextServiceDate?: string; // next_revision en DB
  inWorkshop: boolean; // in_workshop en DB - deshabilita reservas
}

export interface Reservation {
  id: string;
  carId: string;
  userId: string;
  userName: string;
  startTime: string; // ISO
  endTime: string; // ISO
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

export interface ActivityLog {
  id: string;
  carId: string;
  userId: string;
  userName: string;
  action: 'RESERVE' | 'CANCEL' | 'COMMENT' | 'RETURN';
  timestamp: string;
  details?: string;
}

export type ViewState = 'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD' | 'DASHBOARD';
