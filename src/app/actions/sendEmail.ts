"use server";

import nodemailer from "nodemailer";

interface EmailSettings {
  senderEmail: string;
  senderAppPassword: string;
  receiverEmails: string;
}

export async function sendLeadEmail(
  emailSettings: EmailSettings,
  formName: string,
  formData: Record<string, any>
) {
  const { senderEmail, senderAppPassword, receiverEmails } = emailSettings;

  if (!senderEmail || !senderAppPassword) {
    console.warn("Gmail SMTP credentials are not configured for this form! Skipping email notification.");
    return { success: false, error: "SMTP credentials not configured" };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: senderEmail,
        pass: senderAppPassword,
      },
    });

    const formText = Object.entries(formData)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");

    const formHtml = Object.entries(formData)
      .map(([key, value]) => `<li style="margin-bottom: 8px;"><strong>${key}:</strong> ${value}</li>`)
      .join("");

    const toAddresses = receiverEmails
      ? receiverEmails.split(",").map(email => email.trim()).filter(Boolean)
      : [senderEmail];

    const mailOptions = {
      from: senderEmail,
      to: toAddresses.length > 0 ? toAddresses : [senderEmail],
      subject: `New Submission: ${formName}`,
      text: `You have received a new form submission for ${formName}:\n\n${formText}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eaecf0; padding: 20px; border-radius: 8px;">
          <h2 style="color: #026aa2; margin-top: 0;">New Form Submission</h2>
          <p>You have received a new submission for the form <strong>${formName}</strong>.</p>
          <hr style="border: 0; border-top: 1px solid #eaecf0; margin: 20px 0;" />
          <ul style="list-style-type: none; padding: 0;">
            ${formHtml}
          </ul>
          <hr style="border: 0; border-top: 1px solid #eaecf0; margin: 20px 0;" />
          <p style="font-size: 11px; color: #777; margin-bottom: 0;">This is an automated notification from Aero Form Builder.<br/>Developed by RemotizedIT</p>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message };
  }
}
