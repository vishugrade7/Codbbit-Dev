'use server';

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import type { User } from '@/types';

type CreateCheckoutSessionResponse = {
    sessionId?: string;
    error?: string;
};

export async function createCheckoutSession(priceId: string, userId: string): Promise<CreateCheckoutSessionResponse> {
    if (!userId) {
        return { error: 'User must be logged in.' };
    }

    const host = headers().get('origin') || 'http://localhost:9002';
    const successUrl = `${host}/profile`;
    const cancelUrl = `${host}/pricing`;
    
    try {
        const userDocRef = doc(db, "users", userId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            return { error: 'User not found.' };
        }
        
        const userData = userDoc.data() as User;
        let customerId = userData.stripeCustomerId;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: userData.email,
                name: userData.name,
                metadata: {
                    firebaseUID: userId,
                },
            });
            customerId = customer.id;
            await updateDoc(userDocRef, { stripeCustomerId: customerId });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer: customerId,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                firebaseUID: userId,
            }
        });

        if (!session.id) {
            return { error: 'Could not create Stripe session.' };
        }

        return { sessionId: session.id };

    } catch (error: any) {
        console.error('Error creating checkout session:', error);
        return { error: error.message || 'An unknown error occurred.' };
    }
}
