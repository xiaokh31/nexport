import { requireEmailRuntimeConfig } from "@/config/env/server";
import { EnvironmentConfigurationError } from "@/config/env/shared";
import {
  deliverEmail,
  type EmailDeliveryResult,
} from "@/lib/email-delivery";

export { emailTemplates } from "@/lib/email-template";

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  from,
}: SendEmailOptions): Promise<EmailDeliveryResult> {
  try {
    const emailConfig = requireEmailRuntimeConfig();
    const { Resend } = await import("resend");
    const resend = new Resend(emailConfig.apiKey);

    return deliverEmail(
      { send: (message) => resend.emails.send(message) },
      {
        from: from || emailConfig.from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      },
    );
  } catch (error: unknown) {
    if (error instanceof EnvironmentConfigurationError) {
      console.warn(error.message);
      return { success: false, error: "Email service not configured" };
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error sending email:", error);
    return { success: false, error: errorMessage };
  }
}
