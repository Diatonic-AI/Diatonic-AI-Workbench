import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { SubscriptionRecord } from '../../services/billing/types/billing';

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: async () => apiFetch<SubscriptionRecord>('/billing/subscription'),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
