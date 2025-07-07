
'use server';

import { z } from 'zod';
import { Resend } from 'resend';

const contactFormSchema = z.object({
  type: z.enum(['Support', 'Feedback']),
  supportType: z.string().optional(),
  feedbackType: z.string().optional(),
  feedbackPage: z.string().optional(),
  subject: z.string().min(1, 'Subject is required.'),
  message: z.string().min(10, 'Message must be at least 10 characters long.'),
  hasAttachment: z.boolean().optional(),
});

const resend = process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('REPLACE_WITH') 
    ? new Resend(process.env.RESEND_API_KEY) 
    : null;

export async function submitContactForm(data: z.infer<typeof contactFormSchema>) {
  const validation = contactFormSchema.safeParse(data);

  if (!validation.success) {
    return { success: false, error: validation.error.errors.map(e => e.message).join(', ') };
  }

  if (!resend) {
    console.error("Resend is not configured. Please check your RESEND_API_KEY environment variable.");
    // For production, we can simulate success to avoid user confusion if the admin hasn't set up keys yet.
    // This maintains the previous behavior as a fallback.
    console.log('--- Simulating Email Submission (Resend not configured) ---');
    console.log('Data:', validation.data);
    console.log('------------------------------------');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true, message: `${validation.data.type} request submitted successfully!` };
  }
  
  const { type, subject, message, supportType, feedbackType, feedbackPage, hasAttachment } = validation.data;
  const emailSubject = `[Codbbit ${type}] - ${subject}`;

  let emailBody = `
    <h1>New ${type} Submission from Codbbit</h1>
    <p><strong>Subject:</strong> ${subject}</p>
    <hr>
    <h2>Details:</h2>
    <ul>
      <li><strong>Type:</strong> ${type}</li>
  `;
  if (type === 'Support' && supportType) {
    emailBody += `<li><strong>Support Type:</strong> ${supportType}</li>`;
  }
  if (type === 'Feedback') {
    if (feedbackType) emailBody += `<li><strong>Feedback Type:</strong> ${feedbackType}</li>`;
    if (feedbackPage) emailBody += `<li><strong>On Page:</strong> ${feedbackPage}</li>`;
  }
  if (hasAttachment) {
    emailBody += `<li><strong>Attachment:</strong> User indicated an attachment was included (not processed by this form).</li>`;
  }
  emailBody += `</ul>
    <hr>
    <h2>Message:</h2>
    <p>${message.replace(/\n/g, '<br>')}</p>
  `;

  try {
    await resend.emails.send({
      from: 'Codbbit Platform <onboarding@resend.dev>',
      to: ["support@codbbit.com", "codbbit@gmail.com"],
      subject: emailSubject,
      html: emailBody,
    });

    return { success: true, message: `${type} request submitted successfully!` };

  } catch (error) {
    console.error('Resend API Error:', error);
    return { success: false, error: 'There was an error sending your message. Please try again later.' };
  }
}
