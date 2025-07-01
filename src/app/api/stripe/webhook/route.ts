import { stripe } from '@/lib/stripe';
import type Stripe from 'stripe';
import { headers } from 'next/headers';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

const relevantEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

export async function POST(request: Request) {
  const body = await request.text();
  const sig = headers().get('Stripe-Signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Stripe webhook secret is not set.');
    return new Response('Webhook secret not configured.', { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (relevantEvents.has(event.type)) {
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = session.metadata?.firebaseUID;
                const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

                if (userId && db) {
                    const userDocRef = doc(db, 'users', userId);
                    await updateDoc(userDocRef, {
                        stripeSubscriptionId: subscription.id,
                        stripeSubscriptionStatus: subscription.status,
                        stripeCustomerId: subscription.customer,
                    });
                }
                break;
            }
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
                const userId = customer.metadata.firebaseUID;

                 if (userId && db) {
                    const userDocRef = doc(db, 'users', userId);
                    await updateDoc(userDocRef, {
                        stripeSubscriptionId: subscription.id,
                        stripeSubscriptionStatus: subscription.status,
                    });
                }
                break;
            }
            default:
                throw new Error('Unhandled relevant event!');
        }
    } catch (error) {
        console.error('Webhook handler failed.', error);
        return new Response('Webhook handler failed. View logs.', { status: 400 });
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
