import type { RealTimeGateway } from "../../../apps/server/src/core/realtime";
import type { DomainEvent } from "../../../apps/server/src/core/event";
import type { ID } from "../../../apps/server/src/core/entity";

export type LmsWsMessageType =
  | "session:state"
  | "session:presence"
  | "enrollment:new"
  | "submission:new"
  | "module:unlock"
  | "certificate:ready";

export interface LmsWsMessage {
  type: LmsWsMessageType;
  channel: string;
  data: unknown;
  timestamp: number;
}

export interface LmsRealtimePayload {
  sessionId?: ID;
  courseId?: ID;
  learnerId?: ID;
  instructorId?: ID;
  actorId?: ID;
  enrollmentId?: ID;
  submissionId?: ID;
  moduleId?: ID;
  certificateId?: ID;
  [key: string]: unknown;
}

export type ChannelResolver = (
  event: DomainEvent<LmsRealtimePayload>,
) => string | null;

export interface EventForwardRule {
  pattern: string;
  resolveChannel: ChannelResolver;
}

export class LMSRealtimeBridge {
  private gateway: RealTimeGateway;
  private forwardRules: EventForwardRule[] = [];
  private eventSubscriptions: Array<() => void> = [];

  constructor(gateway: RealTimeGateway) {
    this.gateway = gateway;
    this.setupForwardRules();
  }

  private setupForwardRules(): void {
    this.forwardRules = [
      {
        pattern: "session.*",
        resolveChannel: (e) => {
          if (e.payload.sessionId) {
            return `org:${e.orgId}:lms:session:${e.payload.sessionId}`;
          }
          return null;
        },
      },
      {
        pattern: "enrollment.*",
        resolveChannel: (e) => {
          if (e.payload.courseId) {
            return `org:${e.orgId}:lms:course:${e.payload.courseId}:instructor`;
          }
          return null;
        },
      },
      {
        pattern: "submission.*",
        resolveChannel: (e) => {
          if (e.payload.courseId) {
            return `org:${e.orgId}:lms:course:${e.payload.courseId}:instructor`;
          }
          return null;
        },
      },
      {
        pattern: "module.unlocked",
        resolveChannel: (e) => {
          if (e.payload.learnerId) {
            return `org:${e.orgId}:actor:${e.payload.learnerId}:lms`;
          }
          return null;
        },
      },
      {
        pattern: "certificate.issued",
        resolveChannel: (e) => {
          if (e.payload.learnerId) {
            return `org:${e.orgId}:actor:${e.payload.learnerId}:lms`;
          }
          return null;
        },
      },
      {
        pattern: "course.submitted-for-review",
        resolveChannel: (e) => {
          return `org:${e.orgId}:lms:admin`;
        },
      },
    ];
  }

  forward(pattern: string, resolveChannel: ChannelResolver): void {
    this.forwardRules.push({ pattern, resolveChannel });
  }

  handleEvent(event: DomainEvent<LmsRealtimePayload>): void {
    for (const rule of this.forwardRules) {
      if (this.matchesPattern(event.type, rule.pattern)) {
        const channel = rule.resolveChannel(event);
        if (channel) {
          const message: LmsWsMessage = {
            type: this.mapEventTypeToMessageType(event.type),
            channel,
            data: event.payload,
            timestamp: Date.now(),
          };
          this.gateway.publish(channel, message);
        }
      }
    }
  }

  private matchesPattern(eventType: string, pattern: string): boolean {
    const eventParts = eventType.split(".");
    const patternParts = pattern.split(".");

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];

      if (patternPart === "*") {
        continue;
      }

      if (patternPart === "**") {
        return true;
      }

      if (i >= eventParts.length || patternPart !== eventParts[i]) {
        return false;
      }
    }

    return patternParts.length === eventParts.length;
  }

  private mapEventTypeToMessageType(eventType: string): LmsWsMessageType {
    if (eventType.startsWith("session.")) {
      return "session:state";
    }
    if (eventType.startsWith("enrollment.")) {
      return "enrollment:new";
    }
    if (eventType.startsWith("submission.")) {
      return "submission:new";
    }
    if (eventType === "module.unlocked") {
      return "module:unlock";
    }
    if (eventType === "certificate.issued") {
      return "certificate:ready";
    }
    return "session:state";
  }

  subscribeToEventBus(eventBus: {
    subscribe: (
      pattern: string,
      handler: (event: DomainEvent) => Promise<void>,
    ) => () => void;
  }): void {
    const uniquePatterns = [
      ...new Set(this.forwardRules.map((r) => r.pattern)),
    ];

    for (const pattern of uniquePatterns) {
      const unsub = eventBus.subscribe(pattern, async (event) => {
        this.handleEvent(event as DomainEvent<LmsRealtimePayload>);
      });
      this.eventSubscriptions.push(unsub);
    }
  }

  unsubscribeAll(): void {
    for (const unsub of this.eventSubscriptions) {
      unsub();
    }
    this.eventSubscriptions = [];
  }

  broadcastSessionState(orgId: ID, sessionId: ID, state: unknown): void {
    const channel = sessionChannel(orgId, sessionId);
    const message: LmsWsMessage = {
      type: "session:state",
      channel,
      data: state,
      timestamp: Date.now(),
    };
    this.gateway.publish(channel, message);
  }

  broadcastSessionPresence(orgId: ID, sessionId: ID, presence: unknown): void {
    const channel = sessionChannel(orgId, sessionId);
    const message: LmsWsMessage = {
      type: "session:presence",
      channel,
      data: presence,
      timestamp: Date.now(),
    };
    this.gateway.publish(channel, message);
  }

  notifyInstructor(orgId: ID, courseId: ID, notification: unknown): void {
    const channel = instructorChannel(orgId, courseId);
    const message: LmsWsMessage = {
      type: "enrollment:new",
      channel,
      data: notification,
      timestamp: Date.now(),
    };
    this.gateway.publish(channel, message);
  }

  notifyLearner(orgId: ID, learnerId: ID, notification: unknown): void {
    const channel = learnerChannel(orgId, learnerId);
    const message: LmsWsMessage = {
      type: "module:unlock",
      channel,
      data: notification,
      timestamp: Date.now(),
    };
    this.gateway.publish(channel, message);
  }

  notifyAdmin(orgId: ID, notification: unknown): void {
    const channel = adminChannel(orgId);
    const message: LmsWsMessage = {
      type: "enrollment:new",
      channel,
      data: notification,
      timestamp: Date.now(),
    };
    this.gateway.publish(channel, message);
  }
}

export function sessionChannel(orgId: ID, sessionId: ID): string {
  return `org:${orgId}:lms:session:${sessionId}`;
}

export function instructorChannel(orgId: ID, courseId: ID): string {
  return `org:${orgId}:lms:course:${courseId}:instructor`;
}

export function learnerChannel(orgId: ID, actorId: ID): string {
  return `org:${orgId}:actor:${actorId}:lms`;
}

export function adminChannel(orgId: ID): string {
  return `org:${orgId}:lms:admin`;
}

export function registerLMSRealtime(
  bridge: LMSRealtimeBridge,
  eventBus: {
    subscribe: (
      pattern: string,
      handler: (event: DomainEvent) => Promise<void>,
    ) => () => void;
  },
): void {
  bridge.subscribeToEventBus(eventBus);
}

export function createLMSRealtimeBridge(
  gateway: RealTimeGateway,
): LMSRealtimeBridge {
  return new LMSRealtimeBridge(gateway);
}
