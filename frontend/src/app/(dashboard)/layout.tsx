'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { authApi, User } from '@/features/auth/api/auth-api';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();

    // 1. Fetch User Profile
    const { data: user, isLoading, error } = useQuery<User>({
        queryKey: ['profile'],
        queryFn: async () => {
             const res = await authApi.getProfile();
             return res.data;
        },
        retry: false, // If fetch fails (401), the Axios interceptor handles it, or middleware caught it.
    });

    // 2. Logout Logic
    const logoutMutation = useMutation({
        mutationFn: authApi.logout,
        onSuccess: () => {
            toast.success('Logged out');
            router.push('/login');
        },
    });

    if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
    
    // Safety check: if query failed but middleware let us through (rare race condition), show error or redirect
    if (error) return <div className="p-10 text-red-500">Failed to load profile. Please refresh or login again.</div>;

    return (
        <div className="flex h-screen w-full bg-slate-50">
            {/* SIDEBAR */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col">
                <div className="p-6 text-xl font-bold">Acme Corp</div>
                <nav className="flex-1 px-4 space-y-2">
                    <Link href="/dashboard" className="block px-4 py-2 hover:bg-slate-800 rounded">
                        Overview
                    </Link>
                    <Link href="/dashboard/settings" className="block px-4 py-2 hover:bg-slate-800 rounded">
                        Settings (security)
                    </Link>
                </nav>
                <div className="p-4 border-t border-slate-800">
                    <div className="text-sm mb-2 text-slate-400">Logged in as: {user?.email}</div>
                    <Button 
                        variant="destructive" 
                        className="w-full" 
                        onClick={() => logoutMutation.mutate()}
                        disabled={logoutMutation.isPending}
                    >
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 overflow-y-auto p-8">
                {children}
            </main>
        </div>
    );
}
