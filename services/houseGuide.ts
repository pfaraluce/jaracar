import { supabase } from './supabase';
import { HouseSettings, HouseDocument, AppGuideSection } from '../types';

export const houseGuideService = {
    // 1. Settings (Schedules, Keys, Instructions)
    async getSettings(): Promise<HouseSettings> {
        const { data, error } = await supabase
            .from('house_settings')
            .select('*')
            .single();

        if (error) throw new Error(error.message);

        return {
            id: data.id,
            schedules: data.schedules,
            houseKeys: data.house_keys,
            instructions: data.instructions,
            tasksMaintenanceMode: data.tasks_maintenance_mode,
            updatedAt: data.updated_at
        };
    },

    async updateSettings(updates: Partial<HouseSettings>): Promise<void> {
        const dbUpdates: any = {};
        if (updates.schedules) dbUpdates.schedules = updates.schedules;
        if (updates.houseKeys) dbUpdates.house_keys = updates.houseKeys;
        if (updates.instructions !== undefined) dbUpdates.instructions = updates.instructions;
        if (updates.tasksMaintenanceMode !== undefined) dbUpdates.tasks_maintenance_mode = updates.tasksMaintenanceMode;

        const { error } = await supabase
            .from('house_settings')
            .update(dbUpdates)
            .eq('id', updates.id);

        if (error) throw new Error(error.message);
    },

    // 2. Documents
    async getDocuments(): Promise<HouseDocument[]> {
        const { data, error } = await supabase
            .from('house_documents')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        return data.map(doc => ({
            id: doc.id,
            fileName: doc.file_name,
            filePath: doc.file_path,
            fileSize: doc.file_size,
            mimeType: doc.mime_type,
            category: doc.category || 'general',
            createdAt: doc.created_at
        }));
    },

    async uploadDocument(file: File, category: 'general' | 'experience' = 'general'): Promise<HouseDocument> {
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const filePath = `house-guides/${fileName}`;

        // 1. Upload to storage bucket 'house-documents'
        const { error: uploadError } = await supabase.storage
            .from('house-documents')
            .upload(filePath, file);

        if (uploadError) throw new Error(uploadError.message);

        // 2. Save metadata to database
        const { data, error: dbError } = await supabase
            .from('house_documents')
            .insert({
                file_name: file.name,
                file_path: filePath,
                file_size: file.size,
                mime_type: file.type,
                category: category
            })
            .select()
            .single();

        if (dbError) {
            // Rollback: delete from storage if DB fails
            await supabase.storage.from('house-documents').remove([filePath]);
            throw new Error(dbError.message);
        }

        return {
            id: data.id,
            fileName: data.file_name,
            filePath: data.file_path,
            fileSize: data.file_size,
            mimeType: data.mime_type,
            category: data.category || 'general',
            createdAt: data.created_at
        };
    },

    async deleteDocument(docId: string, filePath: string): Promise<void> {
        // 1. Delete from storage
        const { error: storageError } = await supabase.storage
            .from('house-documents')
            .remove([filePath]);

        if (storageError) throw new Error(storageError.message);

        // 2. Delete from database
        const { error: dbError } = await supabase
            .from('house_documents')
            .delete()
            .eq('id', docId);

        if (dbError) throw new Error(dbError.message);
    },

    getDocumentUrl(filePath: string): string {
        const { data } = supabase.storage
            .from('house-documents')
            .getPublicUrl(filePath);
        return data.publicUrl;
    },

    // 3. App Guide (Wiki)
    async getGuideSections(): Promise<AppGuideSection[]> {
        const { data, error } = await supabase
            .from('app_guide')
            .select('*')
            .order('order_index', { ascending: true });

        if (error) throw new Error(error.message);

        return data.map(section => ({
            id: section.id,
            title: section.title,
            content: section.content,
            orderIndex: section.order_index,
            createdAt: section.created_at,
            updatedAt: section.updated_at
        }));
    },

    async createOrUpdateGuideSection(section: Partial<AppGuideSection>): Promise<void> {
        if (section.id) {
            const { error } = await supabase
                .from('app_guide')
                .update({
                    title: section.title,
                    content: section.content,
                    order_index: section.orderIndex
                })
                .eq('id', section.id);
            if (error) throw new Error(error.message);
        } else {
            const { error } = await supabase
                .from('app_guide')
                .insert({
                    title: section.title,
                    content: section.content,
                    order_index: section.orderIndex || 0
                });
            if (error) throw new Error(error.message);
        }
    },

    async deleteGuideSection(sectionId: string): Promise<void> {
        const { error } = await supabase
            .from('app_guide')
            .delete()
            .eq('id', sectionId);
        if (error) throw new Error(error.message);
    }
};
