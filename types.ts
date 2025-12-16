export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export interface PermissionLevel {
  view: boolean;
  admin: boolean;
}

export interface UserPermissions {
  vehicles?: PermissionLevel;
  meals?: PermissionLevel;
  maintenance?: PermissionLevel;
  calendar?: PermissionLevel;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  avatarUrl?: string;
  permissions?: UserPermissions;
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
  userAvatar?: string;
  isForGuest?: boolean; // Indicates if reservation is for an external guest
  guestName?: string; // Name of the guest driver
}

export interface ActivityLog {
  id: string;
  carId: string;
  userId: string;
  userName: string;
  action: 'RESERVE' | 'CANCEL' | 'COMMENT' | 'RETURN';
  timestamp: string;
  details?: string;
  userAvatar?: string;
}

export interface MealTemplate {
  id: string;
  userId: string;
  dayOfWeek: number; // 1=Monday, 7=Sunday
  mealType: 'breakfast' | 'lunch' | 'dinner';
  option: string;
  isBag: boolean;
}

export interface MealOrder {
  id: string;
  userId: string;
  date: string; // ISO Date YYYY-MM-DD
  mealType: 'breakfast' | 'lunch' | 'dinner';
  option: string;
  isBag: boolean;
  status: 'pending' | 'confirmed' | 'cancelled';
}

export interface MaintenanceTicket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  reporterId: string;
  location?: string;
  imageUrl?: string;
  createdAt: string;
}

export type ViewState = 'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD' | 'RESET_PASSWORD' | 'INVITE_SIGNUP' | 'DASHBOARD';
