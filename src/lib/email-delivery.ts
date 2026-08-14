export interface EmailMessage {
  from: string;
  to: string[];
  subject: string;
  html: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

interface EmailSendApi {
  send(message: EmailMessage): Promise<{
    data: { id?: string } | null;
    error: { message?: string } | null;
  }>;
}

export async function deliverEmail(
  emailApi: EmailSendApi,
  message: EmailMessage,
): Promise<EmailDeliveryResult> {
  const { data, error } = await emailApi.send(message);

  if (error) {
    return { success: false, error: error.message || "Email provider rejected the request" };
  }

  return { success: true, messageId: data?.id };
}
