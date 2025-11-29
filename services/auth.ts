import { supabase } from './supabase';
const role = email.toLowerCase() === 'pfaraluce@gmail.com' ? UserRole.ADMIN : UserRole.USER;

// Try to get profile data
const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, role, status')
    .eq('id', user.id)
    .single();

if (profileError) {
    console.error('Error fetching profile:', profileError);
}

const isAdminEmail = email.toLowerCase() === 'pfaraluce@gmail.com';

return {
    id: user.id,
    email: email,
    import { supabase } from './supabase';
    const role = email.toLowerCase() === 'pfaraluce@gmail.com' ? UserRole.ADMIN : UserRole.USER;

    // Try to get profile data
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, role, status')
        .eq('id', user.id)
        .single();

    if(profileError) {
        console.error('Error fetching profile:', profileError);
    }

const isAdminEmail = email.toLowerCase() === 'pfaraluce@gmail.com';

    return {
        id: user.id,
        email: email,
        name: profile?.full_name || user.user_metadata.name || email.split('@')[0] || 'User',
        role: profile?.role || (isAdminEmail ? UserRole.ADMIN : UserRole.USER),
        status: isAdminEmail ? 'APPROVED' : (profile?.status || 'PENDING')
    };
},

    resetPassword: async (email: string): Promise<void> => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin, // Redirect back to app
        });
        if (error) throw new Error(error.message);
    }
};
