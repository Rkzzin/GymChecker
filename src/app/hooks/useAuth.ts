'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export function useAuthGuard() {
	const router = useRouter();

	useEffect(() => {
		const checkSession = async () => {
			const { data: { session } } = await supabase.auth.getSession();
			if (!session) {
				router.push('/');
			}
		};

		checkSession();

		const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
			if (event === 'SIGNED_OUT' || !session) {
				router.push('/');
			}
		});

		return () => {
			subscription.unsubscribe();
		};
	}, [router]);
}