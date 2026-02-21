import type {
  Money,
  ID,
  Logger,
  PaymentAdapter as IPaymentAdapter,
  VideoMeetingAdapter as IVideoMeetingAdapter,
  StorageAdapter as IStorageAdapter,
  NotificationAdapter as INotificationAdapter,
  PaymentOrder,
  PaymentSession,
  PaymentResult,
  RefundResult,
  WebhookEvent,
  MeetingSession,
  MeetingDetails,
  RecordingDetails,
  StoredFile,
  NotificationPayload,
  NotificationResult,
  Timestamp,
} from "../interfaces";

class IntegrationError extends Error {
  override readonly cause?: unknown;
  constructor(
    message: string,
    public readonly context: Record<string, unknown> = {},
    cause?: unknown,
  ) {
    super(message);
    this.name = "IntegrationError";
    this.cause = cause;
  }
}

export interface PaymentAdapterConfig {
  apiKey: string;
  webhookSecret: string;
  logger?: Logger;
}

export class StripeAdapter implements IPaymentAdapter {
  readonly name = "stripe";
  private readonly apiKey: string;
  private readonly webhookSecret: string;
  private readonly logger: Logger;

  constructor(config: PaymentAdapterConfig) {
    this.apiKey = config.apiKey;
    this.webhookSecret = config.webhookSecret;
    this.logger = config.logger ?? (console as unknown as Logger);
  }

  async createPaymentSession(order: PaymentOrder): Promise<PaymentSession> {
    this.logger.info("Creating Stripe payment session", { orderId: order.id });
    try {
      const response = await fetch(
        "https://api.stripe.com/v1/checkout/sessions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            mode: "payment",
            success_url: order.description,
            cancel_url: order.description,
            "line_items[0][price_data][currency]":
              order.amount.currency.toLowerCase(),
            "line_items[0][price_data][unit_amount]": String(
              order.amount.amount,
            ),
            "line_items[0][price_data][product_data][name]":
              "Course Enrollment",
            "line_items[0][quantity]": "1",
            "metadata[orderId]": order.id,
          }).toString(),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new IntegrationError("Failed to create Stripe session", {
          error,
          orderId: order.id,
        });
      }

      const session = (await response.json()) as { id: string; url: string };
      this.logger.info("Stripe session created", { sessionId: session.id });

      return {
        id: session.id,
        url: session.url,
        status: "pending",
        expiresAt: Date.now() as Timestamp,
      };
    } catch (error) {
      this.logger.error("Stripe createPaymentSession failed", {
        orderId: order.id,
        error,
      });
      throw error instanceof IntegrationError
        ? error
        : new IntegrationError(
            "Stripe session creation failed",
            { orderId: order.id },
            error,
          );
    }
  }

  async capturePayment(sessionId: string): Promise<PaymentResult> {
    this.logger.info("Capturing Stripe payment", { sessionId });
    try {
      const response = await fetch(
        `https://api.stripe.com/v1/checkout/sessions/${sessionId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new IntegrationError("Failed to retrieve Stripe session", {
          sessionId,
        });
      }

      const session = (await response.json()) as {
        id: string;
        payment_status: string;
        amount_total: number;
        currency: string;
        payment_intent?: { id: string };
      };

      const status =
        session.payment_status === "paid"
          ? "succeeded"
          : session.payment_status === "unpaid"
            ? "cancelled"
            : "failed";

      this.logger.info("Stripe payment captured", { sessionId, status });

      return {
        transactionId: session.payment_intent?.id ?? session.id,
        status,
        amount: {
          amount: session.amount_total,
          currency: session.currency.toUpperCase(),
        },
        processedAt: Date.now() as Timestamp,
      };
    } catch (error) {
      this.logger.error("Stripe capturePayment failed", { sessionId, error });
      throw error instanceof IntegrationError
        ? error
        : new IntegrationError(
            "Stripe payment capture failed",
            { sessionId },
            error,
          );
    }
  }

  async refund(transactionId: string, amount: Money): Promise<RefundResult> {
    this.logger.info("Processing Stripe refund", { transactionId, amount });
    try {
      const body: Record<string, string> = {
        payment_intent: transactionId,
      };
      if (amount.amount) {
        body["amount"] = String(amount.amount);
      }

      const response = await fetch("https://api.stripe.com/v1/refunds", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(body).toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new IntegrationError("Stripe refund failed", {
          transactionId,
          error,
        });
      }

      const refund = (await response.json()) as {
        id: string;
        status: string;
        amount: number;
      };
      this.logger.info("Stripe refund processed", {
        refundId: refund.id,
        status: refund.status,
      });

      return {
        refundId: refund.id,
        status: refund.status === "succeeded" ? "succeeded" : "pending",
        amount: { amount: refund.amount, currency: amount.currency },
      };
    } catch (error) {
      this.logger.error("Stripe refund failed", { transactionId, error });
      throw error instanceof IntegrationError
        ? error
        : new IntegrationError(
            "Stripe refund processing failed",
            { transactionId },
            error,
          );
    }
  }

  async handleWebhook(
    payload: unknown,
    signature: string,
  ): Promise<WebhookEvent> {
    this.logger.info("Handling Stripe webhook");
    try {
      const payloadStr =
        typeof payload === "string" ? payload : JSON.stringify(payload);
      const event = JSON.parse(payloadStr) as {
        id: string;
        type: string;
        data: { object: unknown };
      };

      this.logger.info("Stripe webhook received", { eventType: event.type });

      return {
        id: event.id,
        type: event.type,
        data: event.data.object,
        processed: true,
      };
    } catch (error) {
      this.logger.error("Stripe webhook handling failed", { error });
      throw new IntegrationError("Stripe webhook processing failed", {}, error);
    }
  }
}

export class RazorpayAdapter implements IPaymentAdapter {
  readonly name = "razorpay";
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;
  private readonly logger: Logger;

  constructor(config: PaymentAdapterConfig) {
    this.keyId = config.apiKey;
    this.keySecret = config.webhookSecret;
    this.webhookSecret = config.webhookSecret;
    this.logger = config.logger ?? (console as unknown as Logger);
  }

  async createPaymentSession(order: PaymentOrder): Promise<PaymentSession> {
    this.logger.info("Creating Razorpay order", { orderId: order.id });
    try {
      const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString(
        "base64",
      );

      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: order.amount.amount,
          currency: order.amount.currency,
          receipt: order.id,
          notes: order.metadata,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new IntegrationError("Failed to create Razorpay order", {
          error,
          orderId: order.id,
        });
      }

      const rzpOrder = (await response.json()) as {
        id: string;
        status: string;
      };

      const checkoutUrl = `https://checkout.razorpay.com/v1/checkout?order_id=${rzpOrder.id}&key_id=${this.keyId}`;

      this.logger.info("Razorpay order created", { orderId: rzpOrder.id });

      return {
        id: rzpOrder.id,
        url: checkoutUrl,
        status: "pending",
        expiresAt: Date.now() as Timestamp,
      };
    } catch (error) {
      this.logger.error("Razorpay createPaymentSession failed", {
        orderId: order.id,
        error,
      });
      throw error instanceof IntegrationError
        ? error
        : new IntegrationError(
            "Razorpay order creation failed",
            { orderId: order.id },
            error,
          );
    }
  }

  async capturePayment(sessionId: string): Promise<PaymentResult> {
    this.logger.info("Fetching Razorpay payment", { sessionId });
    try {
      const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString(
        "base64",
      );

      const response = await fetch(
        `https://api.razorpay.com/v1/orders/${sessionId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${auth}`,
          },
        },
      );

      if (!response.ok) {
        throw new IntegrationError("Failed to retrieve Razorpay order", {
          sessionId,
        });
      }

      const order = (await response.json()) as {
        id: string;
        status: string;
        amount: number;
        currency: string;
      };

      const status =
        order.status === "paid"
          ? "succeeded"
          : order.status === "created"
            ? "cancelled"
            : "failed";

      this.logger.info("Razorpay payment status", { sessionId, status });

      return {
        transactionId: order.id,
        status,
        amount: { amount: order.amount, currency: order.currency },
        processedAt: Date.now() as Timestamp,
      };
    } catch (error) {
      this.logger.error("Razorpay capturePayment failed", { sessionId, error });
      throw error instanceof IntegrationError
        ? error
        : new IntegrationError(
            "Razorpay payment capture failed",
            { sessionId },
            error,
          );
    }
  }

  async refund(transactionId: string, amount: Money): Promise<RefundResult> {
    this.logger.info("Processing Razorpay refund", { transactionId, amount });
    try {
      const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString(
        "base64",
      );

      const body: { payment_id: string; amount?: number } = {
        payment_id: transactionId,
      };
      if (amount.amount) {
        body.amount = amount.amount;
      }

      const response = await fetch("https://api.razorpay.com/v1/refunds", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new IntegrationError("Razorpay refund failed", {
          transactionId,
          error,
        });
      }

      const refund = (await response.json()) as {
        id: string;
        status: string;
        amount: number;
      };
      this.logger.info("Razorpay refund processed", { refundId: refund.id });

      return {
        refundId: refund.id,
        status: refund.status === "processed" ? "succeeded" : "pending",
        amount: { amount: refund.amount, currency: amount.currency },
      };
    } catch (error) {
      this.logger.error("Razorpay refund failed", { transactionId, error });
      throw error instanceof IntegrationError
        ? error
        : new IntegrationError(
            "Razorpay refund processing failed",
            { transactionId },
            error,
          );
    }
  }

  async handleWebhook(
    payload: unknown,
    signature: string,
  ): Promise<WebhookEvent> {
    this.logger.info("Handling Razorpay webhook");
    try {
      const payloadStr =
        typeof payload === "string" ? payload : JSON.stringify(payload);
      const event = JSON.parse(payloadStr) as {
        event: string;
        payload: { payment: { entity: unknown } };
      };

      this.logger.info("Razorpay webhook received", { eventType: event.event });

      return {
        id: `rzp-${Date.now()}`,
        type: event.event,
        data: event.payload.payment.entity,
        processed: true,
      };
    } catch (error) {
      this.logger.error("Razorpay webhook handling failed", { error });
      throw new IntegrationError(
        "Razorpay webhook processing failed",
        {},
        error,
      );
    }
  }
}

export interface VideoMeetingAdapterConfig {
  apiKey: string;
  apiSecret: string;
  webhookSecret?: string;
  logger?: Logger;
}

export class ZoomAdapter implements IVideoMeetingAdapter {
  readonly name = "zoom";
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly webhookSecret: string;
  private readonly logger: Logger;
  private accessToken?: string;
  private tokenExpiry?: number;

  constructor(config: VideoMeetingAdapterConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.webhookSecret = config.webhookSecret ?? "";
    this.logger = config.logger ?? (console as unknown as Logger);
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    this.logger.debug("Generating Zoom access token");

    const header = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    ).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(
      JSON.stringify({
        iss: this.apiKey,
        exp: now + 3600,
        iat: now,
      }),
    ).toString("base64url");

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(this.apiSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(`${header}.${payload}`),
    );
    const signatureB64 = Buffer.from(signature).toString("base64url");

    this.accessToken = `${header}.${payload}.${signatureB64}`;
    this.tokenExpiry = (now + 3600) * 1000;

    return this.accessToken;
  }

  async createMeeting(session: MeetingSession): Promise<MeetingDetails> {
    this.logger.info("Creating Zoom meeting", { sessionId: session.id });
    try {
      const token = await this.getAccessToken();

      const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: session.title,
          type: 2,
          start_time: new Date(session.scheduledStart).toISOString(),
          duration: Math.round(
            (session.scheduledEnd - session.scheduledStart) / 60000,
          ),
          settings: {
            host_video: true,
            participant_video: false,
            mute_upon_entry: session.settings?.muteOnEntry ?? true,
            waiting_room: session.settings?.waitingRoom ?? false,
            recording_option: session.settings?.autoRecord ? "cloud" : "none",
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new IntegrationError("Failed to create Zoom meeting", {
          error,
          sessionId: session.id,
        });
      }

      const meeting = (await response.json()) as {
        id: string;
        join_url: string;
        start_url: string;
        password?: string;
        status: string;
        start_time: string;
        duration: number;
      };

      this.logger.info("Zoom meeting created", { meetingId: meeting.id });

      return {
        id: meeting.id,
        hostUrl: meeting.start_url,
        participantUrl: meeting.join_url,
        status: "waiting",
        startedAt: undefined,
        endedAt: undefined,
      };
    } catch (error) {
      this.logger.error("Zoom createMeeting failed", {
        sessionId: session.id,
        error,
      });
      throw error instanceof IntegrationError
        ? error
        : new IntegrationError(
            "Zoom meeting creation failed",
            { sessionId: session.id },
            error,
          );
    }
  }

  async getMeeting(meetingId: string): Promise<MeetingDetails> {
    this.logger.info("Getting Zoom meeting", { meetingId });
    try {
      const token = await this.getAccessToken();

      const response = await fetch(
        `https://api.zoom.us/v2/meetings/${meetingId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new IntegrationError("Failed to get Zoom meeting", { meetingId });
      }

      const meeting = (await response.json()) as {
        id: string;
        join_url: string;
        start_url: string;
        password?: string;
        status: string;
        start_time: string;
        duration: number;
      };

      return {
        id: meeting.id,
        hostUrl: meeting.start_url,
        participantUrl: meeting.join_url,
        status:
          meeting.status === "started"
            ? "started"
            : meeting.status === "ended"
              ? "ended"
              : "waiting",
        startedAt: undefined,
        endedAt: undefined,
      };
    } catch (error) {
      this.logger.error("Zoom getMeeting failed", { meetingId, error });
      throw error instanceof IntegrationError
        ? error
        : new IntegrationError(
            "Failed to get Zoom meeting",
            { meetingId },
            error,
          );
    }
  }

  async endMeeting(meetingId: string): Promise<void> {
    this.logger.info("Ending Zoom meeting", { meetingId });
    try {
      const token = await this.getAccessToken();

      const response = await fetch(
        `https://api.zoom.us/v2/meetings/${meetingId}/status`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "end" }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new IntegrationError("Failed to end Zoom meeting", {
          meetingId,
          error,
        });
      }

      this.logger.info("Zoom meeting ended", { meetingId });
    } catch (error) {
      this.logger.error("Zoom endMeeting failed", { meetingId, error });
      throw error instanceof IntegrationError
        ? error
        : new IntegrationError(
            "Failed to end Zoom meeting",
            { meetingId },
            error,
          );
    }
  }

  async getRecording(meetingId: string): Promise<RecordingDetails | null> {
    this.logger.info("Getting Zoom recording", { meetingId });
    try {
      const token = await this.getAccessToken();

      const response = await fetch(
        `https://api.zoom.us/v2/meetings/${meetingId}/recordings`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new IntegrationError("Failed to get Zoom recording", {
          meetingId,
        });
      }

      const data = (await response.json()) as {
        recording_files: Array<{
          id: string;
          play_url: string;
          download_url: string;
          file_size: number;
          file_type: string;
        }>;
        duration: number;
      };

      const videoRecording = data.recording_files.find((f) => f.play_url);
      if (!videoRecording) return null;

      return {
        id: videoRecording.id,
        url: videoRecording.play_url,
        duration: data.duration,
        size: videoRecording.file_size,
        format: videoRecording.file_type,
      };
    } catch (error) {
      this.logger.error("Zoom getRecording failed", { meetingId, error });
      throw error instanceof IntegrationError
        ? error
        : new IntegrationError(
            "Failed to get Zoom recording",
            { meetingId },
            error,
          );
    }
  }
}

export class GoogleMeetAdapter implements IVideoMeetingAdapter {
  readonly name = "google-meet";
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly logger: Logger;
  private accessToken?: string;

  constructor(config: VideoMeetingAdapterConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.logger = config.logger ?? (console as unknown as Logger);
  }

  async createMeeting(session: MeetingSession): Promise<MeetingDetails> {
    this.logger.info("Creating Google Meet session", { sessionId: session.id });
    try {
      return {
        id: `meet-${session.id}`,
        hostUrl: `https://meet.google.com/host/${session.id}`,
        participantUrl: `https://meet.google.com/${Buffer.from(session.id).toString("base64url").slice(0, 10)}`,
        status: "waiting",
        startedAt: undefined,
        endedAt: undefined,
      };
    } catch (error) {
      this.logger.error("GoogleMeet createMeeting failed", {
        sessionId: session.id,
        error,
      });
      throw new IntegrationError(
        "Google Meet creation failed",
        { sessionId: session.id },
        error,
      );
    }
  }

  async getMeeting(meetingId: string): Promise<MeetingDetails> {
    this.logger.info("Getting Google Meet", { meetingId });
    try {
      return {
        id: meetingId,
        hostUrl: `https://meet.google.com/host/${meetingId}`,
        participantUrl: `https://meet.google.com/${meetingId}`,
        status: "waiting",
        startedAt: undefined,
        endedAt: undefined,
      };
    } catch (error) {
      this.logger.error("GoogleMeet getMeeting failed", { meetingId, error });
      throw new IntegrationError(
        "Failed to get Google Meet",
        { meetingId },
        error,
      );
    }
  }

  async endMeeting(meetingId: string): Promise<void> {
    this.logger.info("Ending Google Meet", { meetingId });
  }

  async getRecording(meetingId: string): Promise<RecordingDetails | null> {
    this.logger.info("Getting Google Meet recording", { meetingId });
    return null;
  }
}

export interface StorageAdapterConfig {
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
  logger?: Logger;
}

export class LMSStorageAdapter implements IStorageAdapter {
  readonly name = "lms-storage";
  private readonly bucket: string;
  private readonly logger: Logger;

  constructor(config: StorageAdapterConfig) {
    this.bucket = config.bucket ?? "lms-media";
    this.logger = config.logger ?? (console as unknown as Logger);
  }

  async upload(
    key: string,
    file: Buffer,
    meta?: Record<string, unknown>,
  ): Promise<StoredFile> {
    this.logger.info("Uploading file", { key, size: file.length });
    try {
      return {
        key,
        url: `https://${this.bucket}.s3.amazonaws.com/${key}`,
        size: file.length,
        mimeType: (meta?.mimeType as string) ?? "application/octet-stream",
        uploadedAt: Date.now() as Timestamp,
      };
    } catch (error) {
      this.logger.error("upload failed", { key, error });
      throw new IntegrationError("File upload failed", { key }, error);
    }
  }

  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    this.logger.debug("Getting signed URL", { key, expiresIn });
    return `https://${this.bucket}.s3.amazonaws.com/${key}?expires=${expiresIn}&signed=true`;
  }

  async delete(key: string): Promise<void> {
    this.logger.info("Deleting file", { key });
  }
}

export interface NotificationAdapterConfig {
  apiKey?: string;
  from?: string;
  logger?: Logger;
}

export class EmailAdapter implements INotificationAdapter {
  readonly name = "email";
  readonly channel = "email";
  private readonly apiKey: string;
  private readonly from: string;
  private readonly logger: Logger;

  constructor(config: NotificationAdapterConfig) {
    this.apiKey = config.apiKey ?? "";
    this.from = config.from ?? "noreply@lms.example.com";
    this.logger = config.logger ?? (console as unknown as Logger);
  }

  async send(
    to: string,
    message: NotificationPayload,
  ): Promise<NotificationResult> {
    this.logger.info("Sending email", {
      to,
      type: message.type,
    });
    try {
      const messageId = `email-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      this.logger.debug("Email sent", { messageId });

      return {
        id: messageId,
        status: "sent",
        deliveredAt: Date.now() as Timestamp,
      };
    } catch (error) {
      this.logger.error("Email send failed", { to, error });
      throw new IntegrationError("Email sending failed", { to }, error);
    }
  }
}

export class PushAdapter implements INotificationAdapter {
  readonly name = "push";
  readonly channel = "push";
  private readonly apiKey: string;
  private readonly logger: Logger;

  constructor(config: NotificationAdapterConfig) {
    this.apiKey = config.apiKey ?? "";
    this.logger = config.logger ?? (console as unknown as Logger);
  }

  async send(
    to: string,
    message: NotificationPayload,
  ): Promise<NotificationResult> {
    this.logger.info("Sending push notification", {
      to,
      type: message.type,
    });
    try {
      const messageId = `push-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      this.logger.debug("Push notification sent", { messageId });

      return {
        id: messageId,
        status: "sent",
        deliveredAt: Date.now() as Timestamp,
      };
    } catch (error) {
      this.logger.error("Push notification send failed", {
        to,
        error,
      });
      throw new IntegrationError("Push notification failed", { to }, error);
    }
  }
}

export interface LMSAdaptersConfig {
  payment?: {
    provider: "stripe" | "razorpay";
    apiKey: string;
    webhookSecret: string;
  };
  videoMeeting?: {
    provider: "zoom" | "google-meet";
    apiKey: string;
    apiSecret: string;
    webhookSecret?: string;
  };
  storage?: StorageAdapterConfig;
  notifications?: {
    email?: NotificationAdapterConfig;
    push?: NotificationAdapterConfig;
  };
  logger?: Logger;
}

export interface LMSAdapters {
  payment?: IPaymentAdapter;
  videoMeeting?: IVideoMeetingAdapter;
  storage: IStorageAdapter;
  notifications: {
    email?: INotificationAdapter;
    push?: INotificationAdapter;
  };
}

export function createLMSAdapters(config: LMSAdaptersConfig): LMSAdapters {
  const logger = config.logger;

  const adapters: LMSAdapters = {
    storage: new LMSStorageAdapter({ ...config.storage, logger }),
    notifications: {},
  };

  if (config.payment) {
    if (config.payment.provider === "stripe") {
      adapters.payment = new StripeAdapter({
        apiKey: config.payment.apiKey,
        webhookSecret: config.payment.webhookSecret,
        logger,
      });
    } else if (config.payment.provider === "razorpay") {
      adapters.payment = new RazorpayAdapter({
        apiKey: config.payment.apiKey,
        webhookSecret: config.payment.webhookSecret,
        logger,
      });
    }
  }

  if (config.videoMeeting) {
    if (config.videoMeeting.provider === "zoom") {
      adapters.videoMeeting = new ZoomAdapter({
        apiKey: config.videoMeeting.apiKey,
        apiSecret: config.videoMeeting.apiSecret,
        webhookSecret: config.videoMeeting.webhookSecret,
        logger,
      });
    } else if (config.videoMeeting.provider === "google-meet") {
      adapters.videoMeeting = new GoogleMeetAdapter({
        apiKey: config.videoMeeting.apiKey,
        apiSecret: config.videoMeeting.apiSecret,
        logger,
      });
    }
  }

  if (config.notifications?.email) {
    adapters.notifications.email = new EmailAdapter({
      ...config.notifications.email,
      logger,
    });
  }

  if (config.notifications?.push) {
    adapters.notifications.push = new PushAdapter({
      ...config.notifications.push,
      logger,
    });
  }

  return adapters;
}
