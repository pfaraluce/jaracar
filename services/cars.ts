import { supabase } from './supabase';
import { Car, CarStatus } from '../types';
import { tasksService } from './tasks';

export const carService = {
    getCars: async (): Promise<Car[]> => {
        const { data, error } = await supabase
            .from('cars')
            .select('*');

        if (error) throw new Error(error.message);

        return data.map((car: any) => ({
            id: car.id,
            name: car.name,
            plate: car.license_plate,
            imageUrl: car.image_url || '',
            status: car.status as CarStatus,
            fuelType: car.fuel_type,
            nextServiceDate: car.next_revision,
            inWorkshop: car.in_workshop || false,
            assignedUserId: car.assigned_user_id
        }));
    },

    addCar: async (car: Omit<Car, 'id'>): Promise<Car> => {
        const { data, error } = await supabase
            .from('cars')
            .insert({
                name: car.name,
                license_plate: car.plate,
                image_url: car.imageUrl,
                status: car.status,
                fuel_type: car.fuelType,
                next_revision: car.nextServiceDate,
                assigned_user_id: car.assignedUserId
            })
            .select()
            .single();

        if (error) throw new Error(error.message);

        const newCar = {
            id: data.id,
            name: data.name,
            plate: data.license_plate,
            imageUrl: data.image_url || '',
            status: data.status as CarStatus,
            fuelType: data.fuel_type,
            nextServiceDate: data.next_revision,
            inWorkshop: data.in_workshop || false,
            assignedUserId: data.assigned_user_id
        };

        // If an encargado is assigned, create a task
        if (newCar.assignedUserId) {
            await tasksService.createTask({
                title: `Encargado del vehículo: ${newCar.name}`,
                description: `Eres el encargado principal de este vehículo. Asegúrate de que pase las revisiones y esté en buen estado.`,
                assignedUserId: newCar.assignedUserId,
                vehicleId: newCar.id,
                type: 'vehicle',
                status: 'open'
            });
        }

        return newCar;
    },

    updateCarStatus: async (id: string, status: CarStatus): Promise<void> => {
        const { error } = await supabase
            .from('cars')
            .update({ status })
            .eq('id', id);

        if (error) throw new Error(error.message);
    },

    updateCar: async (id: string, updates: Partial<Omit<Car, 'id'>>): Promise<Car> => {
        const dbUpdates: any = {};

        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.plate !== undefined) dbUpdates.license_plate = updates.plate;
        if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
        if (updates.status !== undefined) dbUpdates.status = updates.status;
        if (updates.fuelType !== undefined) dbUpdates.fuel_type = updates.fuelType;
        if (updates.nextServiceDate !== undefined) dbUpdates.next_revision = updates.nextServiceDate;
        if (updates.inWorkshop !== undefined) dbUpdates.in_workshop = updates.inWorkshop;
        if (updates.assignedUserId !== undefined) dbUpdates.assigned_user_id = updates.assignedUserId;

        const { data, error } = await supabase
            .from('cars')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);

        const updatedCar = {
            id: data.id,
            name: data.name,
            plate: data.license_plate,
            imageUrl: data.image_url || '',
            status: data.status as CarStatus,
            fuelType: data.fuel_type,
            nextServiceDate: data.next_revision,
            inWorkshop: data.in_workshop || false,
            assignedUserId: data.assigned_user_id
        };

        // If assignedUserId changed, handle tasks
        if (updates.assignedUserId !== undefined) {
            // First, close any existing vehicle tasks for this car
            const existingTasks = await tasksService.getTasks();
            const carTasks = existingTasks.filter(t => t.vehicleId === id && t.type === 'vehicle' && t.status === 'open');
            
            for (const task of carTasks) {
                if (task.assignedUserId !== updates.assignedUserId) {
                    await tasksService.updateTask(task.id, { status: 'completed' });
                }
            }

            // If a new user is assigned, create a new task if one doesn't exist for him
            if (updates.assignedUserId && !carTasks.some(t => t.assignedUserId === updates.assignedUserId)) {
                await tasksService.createTask({
                    title: `Encargado del vehículo: ${updatedCar.name}`,
                    description: `Eres el encargado principal de este vehículo. Asegúrate de que pase las revisiones y esté en buen estado.`,
                    assignedUserId: updates.assignedUserId,
                    vehicleId: id,
                    type: 'vehicle',
                    status: 'open'
                });
            }
        }

        return updatedCar;
    },

    // Upload image to Supabase Storage
    uploadImage: async (file: File): Promise<string> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `cars/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('car-images')
            .upload(filePath, file);

        if (uploadError) throw new Error(uploadError.message);

        const { data } = supabase.storage
            .from('car-images')
            .getPublicUrl(filePath);

        return data.publicUrl;
    },

    deleteCar: async (id: string): Promise<void> => {
        // First, delete all future reservations for this car
        const now = new Date().toISOString();
        await supabase
            .from('reservations')
            .delete()
            .eq('car_id', id)
            .gte('end_time', now);

        // Then delete the car
        const { error } = await supabase
            .from('cars')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
    },

    toggleFavorite: async (carId: string, userId: string): Promise<boolean> => {
        // Check if exists
        const { data } = await supabase
            .from('favorites')
            .select('*')
            .eq('car_id', carId)
            .eq('user_id', userId)
            .eq('car_id', carId)
            .eq('user_id', userId)
            .maybeSingle();

        if (data) {
            await supabase.from('favorites').delete().eq('car_id', carId).eq('user_id', userId);
            return false; // Removed
        } else {
            await supabase.from('favorites').insert({ car_id: carId, user_id: userId });
            return true; // Added
        }
    },

    getFavorites: async (userId: string): Promise<string[]> => {
        const { data, error } = await supabase
            .from('favorites')
            .select('car_id')
            .eq('user_id', userId);

        if (error) throw new Error(error.message);
        return data.map((f: any) => f.car_id);
    }
};
