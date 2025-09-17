import { useMutation } from '@tanstack/react-query';
import { getStripe } from '@/lib/stripe-client';
import { apiFetch } from '@/lib/api-client';
import { CheckoutPayloadSchema } from "@/lib/validation/billing"
import type { CheckoutSessionResponse } from "@/types/billing"
import { toast } from 'sonner';

export function useStripeCheckout() {
  return useMutation({
    mutationFn: async (payload: unknown) => {
      const input = CheckoutPayloadSchema.parse(payload);
      const data = await apiFetch<CheckoutSessionResponse>('/billing/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      const stripe = await getStripe();
      if (!stripe) throw new Error('Stripe failed to load');
      const { error } = await stripe.redirectToCheckout({ sessionId: data.id });
      if (error) throw error;
      return data;
    },
    onError: (e: any) => toast.error(e?.message ?? 'Checkout failed'),
  });
}
