import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubscriptionRequest {
  action: 'create-checkout' | 'create-portal' | 'check-subscription' | 'cancel' | 'upgrade' | 'usage-report';
  tier?: 'pro' | 'enterprise';
  teamId?: string;
}

const STRIPE_PRICES = {
  pro: 'price_pro_monthly',  // Replace with actual Stripe price IDs
  enterprise: 'price_enterprise_monthly'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const request: SubscriptionRequest = await req.json();

    switch (request.action) {
      case 'create-checkout':
        return await createCheckoutSession(stripe, supabaseClient, user, request);
      case 'create-portal':
        return await createPortalSession(stripe, supabaseClient, user, request);
      case 'check-subscription':
        return await checkSubscription(supabaseClient, user.id, request.teamId);
      case 'cancel':
        return await cancelSubscription(stripe, supabaseClient, user.id, request.teamId);
      case 'usage-report':
        return await getUsageReport(supabaseClient, user.id, request.teamId);
      default:
        throw new Error('Invalid action');
    }

  } catch (error: any) {
    console.error('Subscription error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function createCheckoutSession(stripe: Stripe, supabaseClient: any, user: any, request: SubscriptionRequest) {
  const { tier, teamId } = request;
  
  if (!tier || !STRIPE_PRICES[tier]) {
    throw new Error('Invalid subscription tier');
  }

  // Check if customer exists
  const customers = await stripe.customers.list({
    email: user.email,
    limit: 1,
  });

  let customerId;
  if (customers.data.length > 0) {
    customerId = customers.data[0].id;
  } else {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.user_metadata?.full_name,
    });
    customerId = customer.id;
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price: STRIPE_PRICES[tier],
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${req.headers.get('origin')}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${req.headers.get('origin')}/billing/cancel`,
    metadata: {
      userId: user.id,
      teamId: teamId || '',
      tier,
    },
  });

  return new Response(
    JSON.stringify({ url: session.url }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function createPortalSession(stripe: Stripe, supabaseClient: any, user: any, request: SubscriptionRequest) {
  // Get customer ID from subscription
  const { data: subscription } = await supabaseClient
    .from('subscriptions')
    .select('stripe_customer_id')
    .or(`user_id.eq.${user.id}${request.teamId ? `,team_id.eq.${request.teamId}` : ''}`)
    .eq('status', 'active')
    .single();

  if (!subscription) {
    throw new Error('No active subscription found');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${req.headers.get('origin')}/billing`,
  });

  return new Response(
    JSON.stringify({ url: session.url }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function checkSubscription(supabaseClient: any, userId: string, teamId?: string) {
  let query = supabaseClient
    .from('subscriptions')
    .select('*');

  if (teamId) {
    query = query.eq('team_id', teamId);
  } else {
    query = query.eq('user_id', userId);
  }

  const { data: subscription } = await query
    .eq('status', 'active')
    .single();

  return new Response(
    JSON.stringify({
      hasSubscription: !!subscription,
      subscription: subscription || null,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function cancelSubscription(stripe: Stripe, supabaseClient: any, userId: string, teamId?: string) {
  // Get subscription
  let query = supabaseClient
    .from('subscriptions')
    .select('stripe_subscription_id');

  if (teamId) {
    query = query.eq('team_id', teamId);
  } else {
    query = query.eq('user_id', userId);
  }

  const { data: subscription } = await query
    .eq('status', 'active')
    .single();

  if (!subscription) {
    throw new Error('No active subscription found');
  }

  // Cancel in Stripe
  await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  // Update local record
  await supabaseClient
    .from('subscriptions')
    .update({
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.stripe_subscription_id);

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getUsageReport(supabaseClient: any, userId: string, teamId?: string) {
  const startDate = new Date();
  startDate.setDate(1); // Start of current month

  let query = supabaseClient
    .from('usage_logs')
    .select('resource_type, quantity, cost_cents, created_at')
    .gte('created_at', startDate.toISOString());

  if (teamId) {
    query = query.eq('team_id', teamId);
  } else {
    query = query.eq('user_id', userId);
  }

  const { data: usage } = await query.order('created_at', { ascending: false });

  // Aggregate usage by resource type
  const aggregated = (usage || []).reduce((acc: any, item: any) => {
    if (!acc[item.resource_type]) {
      acc[item.resource_type] = { quantity: 0, cost_cents: 0 };
    }
    acc[item.resource_type].quantity += item.quantity;
    acc[item.resource_type].cost_cents += item.cost_cents;
    return acc;
  }, {});

  const totalCost = Object.values(aggregated).reduce((sum: number, item: any) => sum + item.cost_cents, 0);

  return new Response(
    JSON.stringify({
      usage: aggregated,
      totalCostCents: totalCost,
      totalCostUSD: totalCost / 100,
      period: {
        start: startDate.toISOString(),
        end: new Date().toISOString(),
      },
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}