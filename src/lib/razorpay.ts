import Razorpay from 'razorpay';

let razorpayInstance: Razorpay | null = null;

if (
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID &&
    !process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID.includes('REPLACE_WITH') &&
    process.env.RAZORPAY_KEY_SECRET &&
    !process.env.RAZORPAY_KEY_SECRET.includes('REPLACE_WITH')
) {
    razorpayInstance = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
} else {
    if (typeof window === 'undefined') {
        console.warn("Razorpay keys are not set or are placeholders. Razorpay functionality is disabled.");
    }
}

export const razorpay = razorpayInstance;
