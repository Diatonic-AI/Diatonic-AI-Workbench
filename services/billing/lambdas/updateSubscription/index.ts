import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { logger } from '../../shared/logging';
import { getOrCreateStripeCustomer, getStripeInstance } from '../../shared/stripe';
import { requirePriceId } from '../../shared/pricing';

interface BodyInput { planId: 'basic' | 'pro' | 'extreme' | 'enterprise'; interval: 'monthly' | 'yearly'; }

function parseBody(body?: string | null): BodyInput {
  if (!body) throw new Error('Missing request body');
  const json = JSON.parse(body);
  if (!json.planId || !json.interval) throw new Error('planId & interval required');
  return json;
}

function getAuthContext(event: any) {
  const claims = event.requestContext?.authorizer?.jwt?.claims || {};
  return {
    userId: claims['sub'] || claims['cognito:username'] || 'anonymous',
    tenantId: claims['custom:tenant_id'] || claims['tenant_id'] || 'unknown',
    email: claims['email'] || 'unknown@example.com',
    name: claims['name'] || undefined,
  };
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  logger.info('updateSubscription invoked');
  try {
    const input = parseBody(event.body);
    const auth = getAuthContext(event);
    const customer = await getOrCreateStripeCustomer({
      email: auth.email,
      userId: auth.userId,
      tenantId: auth.tenantId,
      name: auth.name,
    });
    const stripe = await getStripeInstance();
    const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'all', limit: 5 });
  const active = subs.data.find((s: any) => ['active', 'trialing', 'past_due', 'incomplete'].includes(s.status));
    if (!active) {
      return { statusCode: 400, body: JSON.stringify({ message: 'No active subscription to update' }) };
    }
    const priceId = requirePriceId(input.planId, input.interval);
    const item = active.items.data[0];
    await stripe.subscriptionItems.update(item.id, { price: priceId });
    const updated = await stripe.subscriptions.retrieve(active.id);
    return { statusCode: 200, body: JSON.stringify({ subscriptionId: updated.id, priceId }) };
  } catch (error: any) {
    logger.error('updateSubscription failed', { error: error?.message });
    return { statusCode: 500, body: JSON.stringify({ message: error?.message || 'Internal error' }) };
  }
};
