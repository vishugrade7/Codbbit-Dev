'use server';

import { z } from 'zod';

const contactFormSchema = z.object({
  type: z.enum(['Support', 'Feedback']),
  supportType: z.string().optional(),
  feedbackType: z.string().optional(),
  feedbackPage: z.string().optional(),
  subject: z.string().min(1, 'Subject is required.'),
  message: z.string().min(10, 'Message must be at least 10 characters long.'),
  // We'll represent the attachment as a boolean, since we don't process the file itself
  hasAttachment: z.boolean().optional(),
});

export async function submitContactForm(data: z.infer<typeof contactFormSchema>) {
  const validation = contactFormSchema.safeParse(data);

  if (!validation.success) {
    return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
  }

  const { type, subject, message, supportType, feedbackType, feedbackPage, hasAttachment } = validation.data;
  const to = "support@codbbit.com, codbbit@gmail.com";

  console.log('--- Simulating Email Submission ---');
  console.log(`To: ${to}`);
  console.log(`Type: ${type}`);

  if (type === 'Support' && supportType) {
    console.log(`Support Type: ${supportType}`);
  }
  if (type === 'Feedback') {
      if (feedbackType) console.log(`Feedback Type: ${feedbackType}`);
      if (feedbackPage) console.log(`On Page: ${feedbackPage}`);
  }

  console.log(`Subject: ${subject}`);
  console.log(`Message: ${message}`);
  if (hasAttachment) {
      console.log('Attachment: Included');
  }
  console.log('------------------------------------');
  
  // In a real app, this would use an email service. For now, we simulate success.
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

  return { success: true, message: `${type} request submitted successfully!` };
}
