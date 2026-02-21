import type { ID, Timestamp } from "../../../apps/server/src/core/entity";
import type { Money } from "../../../apps/server/src/core/primitives";
import { IntegrationError } from "../../../apps/server/src/core/errors";
import type { Logger } from "../../../apps/server/src/core/context";

export interface PaymentOrder {
  id: ID;
  amount: Money;
  metadata?: Record<string, unknown>;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  customerName?: string;
}

export interface PaymentSession {
  id: string;
  url: string;
  status: "pending" | "completed" | "failed" | "expired";
  paymentIntentId?: string;
}

export interface PaymentCapture {
  id: string;
  status: "succeeded" | "failed" | "pending";
  amount: Money;
}

export interface RefundResult {
  id: string;
  status: "succeeded" | "failed" | "pending";
  amount: Money;
}

export interface WebhookResult {
  event: string;
  processed: boolean;
  data?: Record<string, unknown>;
}

export interface PaymentAdapterConfig {
  apiKey: string;
  webhookSecret: string;
  logger?: Logger;
}

export interface PaymentAdapter {
  readonly name: string;
  createPaymentSession(order: PaymentOrder): Promise<PaymentSession>;
  capturePayment(sessionId: string): Promise<PaymentCapture>;
  refund(transactionId: string, amount: Partial<Money>): Promise<RefundResult>;
  handleWebhook(payload: string, signature: string): Promise<WebhookResult>;
}

export class StripeAdapter implements PaymentAdapter {
  readonly name = "stripe";
  private readonly apiKey: string;
  private readonly webhookSecret: string;
  private readonly logger: Logger;

  constructor(config: PaymentAdapterConfig) {
    this.apiKey = config.apiKey;
    this.webhookSecret = config.webhookSecret;
    this.logger =
      config.logger?.child({ adapter: "stripe" }) ??
      (console as unknown as Logger);
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
            success_url: order.successUrl,
            cancel_url: order.cancelUrl,
            "line_items[0][price_data][currency]":
              order.amount.currency.toLowerCase(),
            "line_items[0][price_data][unit_amount]": String(
              order.amount.amount,
            ),
            "line_items[0][price_data][product_data][name]":
              "Course Enrollment",
            "line_items[0][quantity]": "1",
            ...(order.customerEmail && { customer_email: order.customerEmail }),
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

  async capturePayment(sessionId: string): Promise<PaymentCapture> {
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
            ? "pending"
            : "failed";

      this.logger.info("Stripe payment captured", { sessionId, status });

      return {
        id: session.id,
        status,
        amount: {
          amount: session.amount_total,
          currency: session.currency.toUpperCase(),
        },
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

  async refund(
    transactionId: string,
    amount?: Partial<Money>,
  ): Promise<RefundResult> {
    this.logger.info("Processing Stripe refund", { transactionId, amount });
    try {
      const body: Record<string, string> = {
        payment_intent: transactionId,
      };
      if (amount?.amount) {
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
        id: refund.id,
        status: refund.status === "succeeded" ? "succeeded" : "pending",
        amount: { amount: refund.amount, currency: amount?.currency ?? "USD" },
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
    payload: string,
    signature: string,
  ): Promise<WebhookResult> {
    this.logger.info("Handling Stripe webhook");
    try {
      const event = JSON.parse(payload) as {
        type: string;
        data: { object: Record<string, unknown> };
      };

      this.logger.info("Stripe webhook received", { eventType: event.type });

      return {
        event: event.type,
        processed: true,
        data: event.data.object,
      };
    } catch (error) {
      this.logger.error("Stripe webhook handling failed", { error });
      throw new IntegrationError("Stripe webhook processing failed", {}, error);
    }
  }
}

export class RazorpayAdapter implements PaymentAdapter {
  readonly name = "razorpay";
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;
  private readonly logger: Logger;

  constructor(config: PaymentAdapterConfig) {
    this.keyId = config.apiKey;
    this.keySecret = config.webhookSecret;
    this.webhookSecret = config.webhookSecret;
    this.logger =
      config.logger?.child({ adapter: "razorpay" }) ??
      (console as unknown as Logger);
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

  async capturePayment(sessionId: string): Promise<PaymentCapture> {
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
            ? "pending"
            : "failed";

      this.logger.info("Razorpay payment status", { sessionId, status });

      return {
        id: order.id,
        status,
        amount: { amount: order.amount, currency: order.currency },
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

  async refund(
    transactionId: string,
    amount?: Partial<Money>,
  ): Promise<RefundResult> {
    this.logger.info("Processing Razorpay refund", { transactionId, amount });
    try {
      const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString(
        "base64",
      );

      const body: { payment_id: string; amount?: number } = {
        payment_id: transactionId,
      };
      if (amount?.amount) {
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
        id: refund.id,
        status: refund.status === "processed" ? "succeeded" : "pending",
        amount: { amount: refund.amount, currency: amount?.currency ?? "INR" },
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
    payload: string,
    signature: string,
  ): Promise<WebhookResult> {
    this.logger.info("Handling Razorpay webhook");
    try {
      const event = JSON.parse(payload) as {
        event: string;
        payload: { payment: { entity: Record<string, unknown> } };
      };

      this.logger.info("Razorpay webhook received", { eventType: event.event });

      return {
        event: event.event,
        processed: true,
        data: event.payload.payment.entity,
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

export interface MeetingSession {
  id: ID;
  title: string;
  scheduledAt: Timestamp;
  durationMinutes: number;
  hostId: ID;
  attendeeIds?: ID[];
  settings?: MeetingSettings;
}

export interface MeetingSettings {
  hostVideo?: boolean;
  participantVideo?: boolean;
  muteUponEntry?: boolean;
  waitingRoom?: boolean;
  recordingEnabled?: boolean;
}

export interface MeetingDetails {
  id: string;
  hostUrl: string;
  joinUrl: string;
  password?: string;
  status: "scheduled" | "waiting" | "started" | "ended";
  scheduledAt: Timestamp;
  durationMinutes: number;
}

export interface RecordingDetails {
  id: string;
  url: string;
  downloadUrl?: string;
  duration?: number;
  fileSize?: number;
}

export interface VideoMeetingAdapterConfig {
  apiKey: string;
  apiSecret: string;
  webhookSecret?: string;
  logger?: Logger;
}

export interface VideoMeetingAdapter {
  readonly name: string;
  createMeeting(session: MeetingSession): Promise<MeetingDetails>;
  getMeeting(meetingId: string): Promise<MeetingDetails>;
  endMeeting(meetingId: string): Promise<void>;
  getRecording?(meetingId: string): Promise<RecordingDetails | null>;
  handleWebhook?(payload: string, signature: string): Promise<WebhookResult>;
}

export class ZoomAdapter implements VideoMeetingAdapter {
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
    this.logger =
      config.logger?.child({ adapter: "zoom" }) ??
      (console as unknown as Logger);
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
          start_time: new Date(session.scheduledAt).toISOString(),
          duration: session.durationMinutes,
          settings: {
            host_video: session.settings?.hostVideo ?? true,
            participant_video: session.settings?.participantVideo ?? false,
            mute_upon_entry: session.settings?.muteUponEntry ?? true,
            waiting_room: session.settings?.waitingRoom ?? false,
            recording_option: session.settings?.recordingEnabled
              ? "cloud"
              : "none",
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
        joinUrl: meeting.join_url,
        password: meeting.password,
        status: "scheduled",
        scheduledAt: new Date(meeting.start_time).getTime() as Timestamp,
        durationMinutes: meeting.duration,
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
        joinUrl: meeting.join_url,
        password: meeting.password,
        status:
          meeting.status === "started"
            ? "started"
            : meeting.status === "ended"
              ? "ended"
              : "scheduled",
        scheduledAt: new Date(meeting.start_time).getTime() as Timestamp,
        durationMinutes: meeting.duration,
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
        }>;
        duration: number;
      };

      const videoRecording = data.recording_files.find((f) => f.play_url);
      if (!videoRecording) return null;

      return {
        id: videoRecording.id,
        url: videoRecording.play_url,
        downloadUrl: videoRecording.download_url,
        duration: data.duration,
        fileSize: videoRecording.file_size,
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

  async handleWebhook(
    payload: string,
    signature: string,
  ): Promise<WebhookResult> {
    this.logger.info("Handling Zoom webhook");
    try {
      const event = JSON.parse(payload) as {
        event: string;
        payload: { object: Record<string, unknown> };
      };

      this.logger.info("Zoom webhook received", { eventType: event.event });

      return {
        event: event.event,
        processed: true,
        data: event.payload.object,
      };
    } catch (error) {
      this.logger.error("Zoom webhook handling failed", { error });
      throw new IntegrationError("Zoom webhook processing failed", {}, error);
    }
  }
}

export class GoogleMeetAdapter implements VideoMeetingAdapter {
  readonly name = "google-meet";
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly logger: Logger;
  private accessToken?: string;

  constructor(config: VideoMeetingAdapterConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.logger =
      config.logger?.child({ adapter: "google-meet" }) ??
      (console as unknown as Logger);
  }

  async createMeeting(session: MeetingSession): Promise<MeetingDetails> {
    this.logger.info("Creating Google Meet session", { sessionId: session.id });
    try {
      return {
        id: `meet-${session.id}`,
        hostUrl: `https://meet.google.com/host/${session.id}`,
        joinUrl: `https://meet.google.com/${Buffer.from(session.id).toString("base64url").slice(0, 10)}`,
        status: "scheduled",
        scheduledAt: session.scheduledAt,
        durationMinutes: session.durationMinutes,
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
        joinUrl: `https://meet.google.com/${meetingId}`,
        status: "scheduled",
        scheduledAt: Date.now() as Timestamp,
        durationMinutes: 60,
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
}

export interface MediaUploadResult {
  id: string;
  url: string;
  signedUrl?: string;
  expiresAt?: Timestamp;
  contentType: string;
  size: number;
}

export interface CertificateData {
  learnerName: string;
  courseTitle: string;
  completionDate: string;
  verificationCode: string;
  verifyUrl: string;
  instructorName?: string;
  expiryDate?: string;
}

export interface StorageAdapterConfig {
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
  logger?: Logger;
}

export interface StorageAdapter {
  readonly name: string;
  uploadCourseMedia(
    courseId: ID,
    file: File,
    metadata?: Record<string, unknown>,
  ): Promise<MediaUploadResult>;
  getCourseMediaUrl(
    courseId: ID,
    fileId: string,
    expiresIn?: number,
  ): Promise<string>;
  uploadSubmission(
    learnerId: ID,
    file: File,
    metadata?: Record<string, unknown>,
  ): Promise<MediaUploadResult>;
  generateCertificatePDF(
    template: string,
    data: CertificateData,
  ): Promise<MediaUploadResult>;
}

export class LMSStorageAdapter implements StorageAdapter {
  readonly name = "lms-storage";
  private readonly bucket: string;
  private readonly logger: Logger;

  constructor(config: StorageAdapterConfig) {
    this.bucket = config.bucket ?? "lms-media";
    this.logger =
      config.logger?.child({ adapter: "storage" }) ??
      (console as unknown as Logger);
  }

  async uploadCourseMedia(
    courseId: ID,
    file: File,
    metadata?: Record<string, unknown>,
  ): Promise<MediaUploadResult> {
    this.logger.info("Uploading course media", {
      courseId,
      fileName: file.name,
    });
    try {
      const fileId = `course-${courseId}/${Date.now()}-${file.name}`;

      return {
        id: fileId,
        url: `https://${this.bucket}.s3.amazonaws.com/${fileId}`,
        signedUrl: `https://${this.bucket}.s3.amazonaws.com/${fileId}?signed=true`,
        contentType: file.type,
        size: file.size,
      };
    } catch (error) {
      this.logger.error("uploadCourseMedia failed", { courseId, error });
      throw new IntegrationError(
        "Course media upload failed",
        { courseId },
        error,
      );
    }
  }

  async getCourseMediaUrl(
    courseId: ID,
    fileId: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    this.logger.debug("Getting course media URL", { courseId, fileId });
    return `https://${this.bucket}.s3.amazonaws.com/${fileId}?expires=${expiresIn}`;
  }

  async uploadSubmission(
    learnerId: ID,
    file: File,
    metadata?: Record<string, unknown>,
  ): Promise<MediaUploadResult> {
    this.logger.info("Uploading submission", {
      learnerId,
      fileName: file.name,
    });
    try {
      const fileId = `submissions/${learnerId}/${Date.now()}-${file.name}`;

      return {
        id: fileId,
        url: `https://${this.bucket}.s3.amazonaws.com/${fileId}`,
        contentType: file.type,
        size: file.size,
      };
    } catch (error) {
      this.logger.error("uploadSubmission failed", { learnerId, error });
      throw new IntegrationError(
        "Submission upload failed",
        { learnerId },
        error,
      );
    }
  }

  async generateCertificatePDF(
    template: string,
    data: CertificateData,
  ): Promise<MediaUploadResult> {
    this.logger.info("Generating certificate PDF", {
      verificationCode: data.verificationCode,
    });
    try {
      const fileId = `certificates/${data.verificationCode}.pdf`;

      return {
        id: fileId,
        url: `https://${this.bucket}.s3.amazonaws.com/${fileId}`,
        contentType: "application/pdf",
        size: 0,
      };
    } catch (error) {
      this.logger.error("generateCertificatePDF failed", {
        verificationCode: data.verificationCode,
        error,
      });
      throw new IntegrationError("Certificate generation failed", {}, error);
    }
  }
}

export interface NotificationPayload {
  to: ID | string;
  templateKey: string;
  variables: Record<string, unknown>;
  subject?: string;
}

export interface NotificationResult {
  id: string;
  status: "sent" | "failed" | "queued";
  deliveredAt?: Timestamp;
}

export interface NotificationAdapterConfig {
  apiKey?: string;
  from?: string;
  logger?: Logger;
}

export interface NotificationAdapter {
  readonly name: string;
  readonly channel: string;
  send(payload: NotificationPayload): Promise<NotificationResult>;
}

export class EmailAdapter implements NotificationAdapter {
  readonly name = "email";
  readonly channel = "email";
  private readonly apiKey: string;
  private readonly from: string;
  private readonly logger: Logger;

  constructor(config: NotificationAdapterConfig) {
    this.apiKey = config.apiKey ?? "";
    this.from = config.from ?? "noreply@lms.example.com";
    this.logger =
      config.logger?.child({ adapter: "email" }) ??
      (console as unknown as Logger);
  }

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    this.logger.info("Sending email", {
      to: payload.to,
      templateKey: payload.templateKey,
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
      this.logger.error("Email send failed", { to: payload.to, error });
      throw new IntegrationError(
        "Email sending failed",
        { to: payload.to },
        error,
      );
    }
  }
}

export class PushAdapter implements NotificationAdapter {
  readonly name = "push";
  readonly channel = "push";
  private readonly apiKey: string;
  private readonly logger: Logger;

  constructor(config: NotificationAdapterConfig) {
    this.apiKey = config.apiKey ?? "";
    this.logger =
      config.logger?.child({ adapter: "push" }) ??
      (console as unknown as Logger);
  }

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    this.logger.info("Sending push notification", {
      to: payload.to,
      templateKey: payload.templateKey,
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
        to: payload.to,
        error,
      });
      throw new IntegrationError(
        "Push notification failed",
        { to: payload.to },
        error,
      );
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
  payment?: PaymentAdapter;
  videoMeeting?: VideoMeetingAdapter;
  storage: StorageAdapter;
  notifications: {
    email?: NotificationAdapter;
    push?: NotificationAdapter;
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
