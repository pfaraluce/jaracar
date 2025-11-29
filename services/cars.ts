import { supabase } from './supabase';
import { Car, CarStatus } from '../types';

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
            inWorkshop: car.in_workshop || false
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
                next_revision: car.nextServiceDate
            })
            .select()
            .single();

        if (error) throw new Error(error.message);

        return {
            id: data.id,
            name: data.name,
            plate: data.license_plate,
            imageUrl: data.image_url || '',
            status: data.status as CarStatus,
            fuelType: data.fuel_type,
            nextServiceDate: data.next_revision,
            inWorkshop: data.in_workshop || false
        };
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

        const { data, error } = await supabase
            .from('cars')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);

        return {
            id: data.id,
            name: data.name,
            plate: data.license_plate,
            imageUrl: data.image_url || '',
            status: data.status as CarStatus,
            fuelType: data.fuel_type,
            nextServiceDate: data.next_revision,
            inWorkshop: data.in_workshop || false
        };
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
            .single();

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
