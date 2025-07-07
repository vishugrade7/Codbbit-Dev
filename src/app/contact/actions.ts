'use server';

import { z } from 'zod';

const contactFormSchema = z.object({
  type: z.enum(['Support', 'Feedback']),
  subject: z.string().min(1, 'Subject is required.'),
  message: z.string().min(10, 'Message must be at least 10 characters long.'),
});

export async function submitContactForm(data: z.infer<typeof contactFormSchema>) {
  const validation = contactFormSchema.safeParse(data);

  if (!validation.success) {
    return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
  }

  const { type, subject, message } = validation.data;
  const to = "support@codbbit.com, codbbit@gmail.com";

  console.log('--- Simulating Email Submission ---');
  console.log(`To: ${to}`);
  console.log(`Type: ${type}`);
  console.log(`Subject: ${subject}`);
  console.log(`Message: ${message}`);
  console.log('------------------------------------');
  
  // In a real app, this would use an email service. For now, we simulate success.
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

  return { success: true, message: `${type} request submitted successfully!` };
}
