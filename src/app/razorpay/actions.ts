
'use server';

import { razorpay } from '@/lib/razorpay';
import shortid from 'shortid';
import { doc, getDoc, runTransaction, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import crypto from 'crypto';
import { getPricingSettings } from '../upload-problem/actions';
import { Voucher } from '@/types';

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

export async function createRazorpayOrder(
    planId: 'monthly' | 'biannually' | 'annually',
    currencyCode: 'INR' | 'USD',
    userId: string,
    voucherCode?: string
): Promise<CreateOrderResponse> {
    if (!razorpay) {
        return { error: 'Payment processing is not configured on the server. Please contact the site administrator.' };
    }
    
    try {
        const pricingSettings = await getPricingSettings();
        if (!pricingSettings) {
            throw new Error("Pricing information is not configured.");
        }
        
        const prices = currencyCode === 'INR' ? pricingSettings.inr : pricingSettings.usd;
        let amount = prices[planId].total;

        // Voucher logic
        if (voucherCode) {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (!userDoc.exists()) throw new Error('User not found.');
            const userData = userDoc.data();

            const vouchersRef = collection(db, 'vouchers');
            const q = query(vouchersRef, where('code', '==', voucherCode.toUpperCase()));
            const voucherSnapshot = await getDocs(q);

            if (voucherSnapshot.empty) {
                return { error: 'Invalid voucher code.' };
            }
            const voucherDoc = voucherSnapshot.docs[0];
            const voucher = { id: voucherDoc.id, ...voucherDoc.data() } as Voucher;

            if (!voucher.isActive) return { error: 'This voucher is no longer active.' };
            if (voucher.expiresAt && voucher.expiresAt.toDate() < new Date()) return { error: 'This voucher has expired.' };
            if (voucher.oneTimeUse && userData.usedVouchers?.includes(voucher.id)) return { error: 'You have already used this voucher.' };
            if (voucher.oneTimeUse && voucher.usedBy && voucher.usedBy.length > 0) return { error: 'This voucher has already been redeemed.' };
            
            if (voucher.type === 'fixed') {
                amount = Math.max(0, amount - voucher.value);
            } else if (voucher.type === 'percentage') {
                amount = amount * (1 - voucher.value / 100);
            }
        }
        
        const amountInSubunits = Math.round(amount * 100);
        if (amountInSubunits <= 0 && voucherCode) {
             return { error: 'The final amount after discount is zero. Cannot create order.' };
        }
        if(amountInSubunits <=0) {
            return { error: "Price cannot be zero. Contact administrator" };
        }

        const options = {
            amount: amountInSubunits,
            currency: currencyCode,
            receipt: shortid.generate(),
            payment_capture: 1,
            notes: {
                userId,
                planId,
                ...(voucherCode && { voucherCode })
            }
        };

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
    planId: 'monthly' | 'biannually' | 'annually',
    voucherCode?: string | null
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

        // Step 3: All checks passed, update user in Firestore using a transaction
        await runTransaction(db, async (transaction) => {
            const userDocRef = doc(db, 'users', userId);
            
            // Mark voucher as used if applicable
            if (voucherCode) {
                const vouchersRef = collection(db, 'vouchers');
                const q = query(vouchersRef, where('code', '==', voucherCode.toUpperCase()));
                const voucherSnapshot = await getDocs(q);
                if (!voucherSnapshot.empty) {
                    const voucherDoc = voucherSnapshot.docs[0];
                    if (voucherDoc.data().oneTimeUse) {
                        transaction.update(voucherDoc.ref, {
                            usedBy: arrayUnion(userId)
                        });
                        transaction.update(userDocRef, {
                            usedVouchers: arrayUnion(voucherDoc.id)
                        });
                    }
                }
            }
            
            const endDate = new Date();
            if (planId === 'monthly') {
                endDate.setMonth(endDate.getMonth() + 1);
            } else if (planId === 'biannually') {
                endDate.setMonth(endDate.getMonth() + 6);
            } else if (planId === 'annually') {
                endDate.setFullYear(endDate.getFullYear() + 1);
            }

            transaction.update(userDocRef, {
                razorpayPaymentId: razorpay_payment_id,
                razorpayOrderId: razorpay_order_id,
                razorpaySubscriptionStatus: 'active',
                subscriptionEndDate: endDate,
                subscriptionPeriod: planId,
            });
        });

        return { success: true };

    } catch (error: any) {
        console.error('Error verifying payment:', error);
        return { success: false, error: error.message || 'An unknown error occurred during verification.' };
    }
}

export async function cancelSubscription(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!userId || !db) {
        return { success: false, error: 'User or database not found.' };
    }

    try {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
            razorpaySubscriptionStatus: 'cancelled',
            // Set end date to now to immediately expire
            subscriptionEndDate: new Date(),
        });
        return { success: true };
    } catch (error: any) {
        console.error('Error cancelling subscription:', error);
        return { success: false, error: error.message || 'An unknown error occurred during cancellation.' };
    }
}
