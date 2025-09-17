import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { logger } from '../../shared/logging';
import { getOrCreateStripeCustomer, createCheckoutSession } from '../../shared/stripe';
import { requirePriceId } from '../../shared/pricing';

interface BodyInput {
  planId: 'free' | 'basic' | 'pro' | 'extreme' | 'enterprise';
  interval: 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
  trialPeriodDays?: number;
  allowPromotionCodes?: boolean;
  automaticTax?: boolean;
  metadata?: Record<string, string>;
}

function parseBody(body?: string | null): BodyInput {
  if (!body) throw new Error('Missing request body');
  let json: any;
  try { json = JSON.parse(body); } catch { throw new Error('Invalid JSON body'); }
  const required = ['planId', 'interval', 'successUrl', 'cancelUrl'];
  for (const f of required) if (!json[f]) throw new Error(`Missing field: ${f}`);
  return json as BodyInput;
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
  logger.info('createCheckoutSession invoked');
  try {
    const input = parseBody(event.body);
    const auth = getAuthContext(event);

    if (input.planId === 'free') {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Free plan does not require checkout' })
      };
    }

    const priceId = requirePriceId(input.planId, input.interval);
    const customer = await getOrCreateStripeCustomer({
      email: auth.email,
      userId: auth.userId,
      tenantId: auth.tenantId,
      name: auth.name,
    });

    const session = await createCheckoutSession({
      customerId: customer.id,
      priceId,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      userId: auth.userId,
      tenantId: auth.tenantId,
      trialPeriodDays: input.trialPeriodDays,
      allowPromotionCodes: input.allowPromotionCodes,
      automaticTax: input.automaticTax,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        id: session.id,
        url: session.url,
        customerId: customer.id,
        priceId,
        mode: session.mode,
        status: session.status,
      })
    };
  } catch (error: any) {
    logger.error('createCheckoutSession failed', { error: error?.message });
    return { statusCode: 500, body: JSON.stringify({ message: error?.message || 'Internal error' }) };
  }
};
