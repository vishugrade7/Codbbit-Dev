
'use server';

import { razorpay } from '@/lib/razorpay';
import shortid from 'shortid';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import crypto from 'crypto';

export async function isRazorpayConfigured(): Promise<boolean> {
    return !!razorpay;
}

type CreateOrderResponse = {
    orderId?: string;
    razorpayKeyId?: string;
    amount?: number;
    currency?: string;
    error?: string;
};

export async function createRazorpayOrder(amount: number, currency: 'INR' | 'USD'): Promise<CreateOrderResponse> {
    if (!razorpay) {
        return { error: 'Payment processing is not configured on the server. Please contact the site administrator.' };
    }
    
    const payment_capture = 1;
    const amountInSubunits = amount * 100;
    const options = {
        amount: amountInSubunits,
        currency,
        receipt: shortid.generate(),
        payment_capture,
    };

    try {
        const response = await razorpay.orders.create(options);
        return {
            orderId: response.id,
            razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount: response.amount,
            currency: response.currency,
        };
    } catch (error: any) {
        console.error('Error creating Razorpay order:', error);
        return { error: error.message || 'An unknown error occurred.' };
    }
}

type VerifyPaymentResponse = {
    success: boolean;
    error?: string;
};

export async function verifyAndSavePayment(
    paymentData: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
    },
    userId: string,
    expectedAmount: number,
    expectedCurrency: string,
): Promise<VerifyPaymentResponse> {
    if (!userId || !db) {
        return { success: false, error: 'User or database not found.' };
    }
    if (!razorpay) {
        return { success: false, error: 'Payment processing is not configured on the server.' };
    }

    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpaySecret || razorpaySecret.includes('REPLACE_WITH')) {
        console.error("Razorpay secret key is not configured for payment verification. Please check your .env file.");
        return { success: false, error: 'Could not verify payment. Please contact the site administrator.'};
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

    try {
        // Step 1: Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', razorpaySecret)
            .update(body.toString())
            .digest('hex');
        
        if (expectedSignature !== razorpay_signature) {
            return { success: false, error: 'Payment verification failed: Invalid signature.' };
        }

        // Step 2: Fetch payment from Razorpay to verify amount and status
        const payment = await razorpay.payments.fetch(razorpay_payment_id);

        if (payment.status !== 'captured') {
            return { success: false, error: `Payment not successful. Status: ${payment.status}` };
        }

        if (payment.amount !== expectedAmount) {
            return { success: false, error: `Payment amount mismatch. Expected ${expectedAmount}, got ${payment.amount}` };
        }
        
        if (payment.currency !== expectedCurrency) {
            return { success: false, error: `Payment currency mismatch. Expected ${expectedCurrency}, got ${payment.currency}` };
        }

        // Step 3: All checks passed, update user in Firestore
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
            razorpayPaymentId: razorpay_payment_id,
            razorpayOrderId: razorpay_order_id,
            razorpaySubscriptionStatus: 'active',
        });
        return { success: true };

    } catch (error: any) {
        console.error('Error verifying payment:', error);
        return { success: false, error: error.message || 'An unknown error occurred during verification.' };
    }
}
