export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  KITCHEN = 'KITCHEN',
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
  birthday?: string;
  initials?: string;
  hasDiet?: boolean;
  dietNumber?: number;
  dietName?: string;
  dietNotes?: string;
  roomId?: string;
  bedId?: string;
  roomName?: string;
  bedNumber?: number;
  roomTotalBeds?: number; // Total beds in the assigned room
}

export interface DietFile {
  id: string;
  userId: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
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
  assignedUserId?: string; // Nuevo: Encargado del vehículo
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
  bagTime?: string; // Optional: "HH:mm" for pickup
  status: 'pending' | 'confirmed' | 'cancelled' | 'template';
}

export interface MaintenanceTicket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  reporterId: string;
  reporterName?: string;
  reporterAvatar?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  assignedUserAvatar?: string;
  location?: string;
  imageUrl?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedUserId: string;
  assignedUserName?: string;
  assignedUserAvatar?: string;
  vehicleId?: string;
  vehicleName?: string;
  type: 'general' | 'vehicle';
  status: 'open' | 'completed';
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  totalBeds: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoomBed {
  id: string;
  roomId: string;
  bedNumber: number;
  assignedUserId?: string;
  assignedUserName?: string;
  assignedUserAvatar?: string;
  roomName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserAbsence {
  id: string;
  userId: string;
  userName?: string;
  startDate: string; // ISO Date YYYY-MM-DD
  endDate: string; // ISO Date YYYY-MM-DD
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ViewState = 'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD' | 'RESET_PASSWORD' | 'INVITE_SIGNUP' | 'DASHBOARD';

export interface ScheduleItem {
  time: string;
  endTime?: string;
  activity: string;
  notes?: string;
}

export interface HouseSchedules {
  weekdays: ScheduleItem[];
  saturdays: ScheduleItem[];
  sundays: ScheduleItem[];
}

export interface HouseKey {
  id: string;
  name: string;
  description: string;
  location?: string;
}

export interface HouseSettings {
  id: string;
  schedules: HouseSchedules;
  houseKeys: HouseKey[];
  instructions: string;
  tasksMaintenanceMode?: boolean;
  updatedAt: string;
}

export interface HouseDocument {
  id: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
  mimeType?: string;
  category: 'general' | 'experience';
  createdAt: string;
}

export interface AppGuideSection {
  id: string;
  title: string;
  content: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
}

export interface KitchenConfig {
  id: string;
  weekly_schedule: Record<string, string>; // Legacy support
  schedule_weekdays?: string;
  schedule_saturday?: string;
  schedule_sunday_holiday?: string;
  overrides?: Record<string, string>; // YYYY-MM-DD -> HH:mm
}


export interface UserAdminMessage {
    id: string;
    user_id: string;
    sender_id: string;
    receiver_id?: string | null;
    content: string;
    parent_id: string | null;
    is_read: boolean;
    is_completed: boolean;
    is_global?: boolean;
    created_at: string;
    updated_at: string;
    sender?: {
        full_name: string;
        avatar_url: string;
    };
    receiver?: {
        full_name: string;
        avatar_url: string;
    };
}
