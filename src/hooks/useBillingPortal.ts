import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { toast } from 'sonner';

export function useBillingPortal() {
  return useMutation({
    mutationFn: async () => apiFetch<{ url: string }>(
      '/billing/create-portal-session',
      { method: 'POST' }
    ),
    onSuccess: ({ url }) => { window.location.href = url; },
    onError: (e: any) => toast.error(e?.message ?? 'Could not open billing portal'),
  });
}
