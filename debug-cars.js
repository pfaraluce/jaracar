// Debug script to check if cars are being created in Supabase
import { carService } from './services/cars.js';

async function debugCars() {
    try {
        console.log('Fetching cars from Supabase...');
        const cars = await carService.getCars();
        console.log(`Found ${cars.length} cars:`);
        console.table(cars);
    } catch (error) {
        console.error('Error fetching cars:', error);
    }
}

debugCars();
