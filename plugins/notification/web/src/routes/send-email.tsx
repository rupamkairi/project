import React, { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button, Input, Textarea, Label } from "@projectx/ui";

interface SendEmailRouteProps {
  sendApi?: {
    send: (data: { to: string; subject: string; body: string }) => Promise<{
      data?: { success?: boolean; messageId?: string; error?: string };
    }>;
  };
}

export function SendEmailRoute({ sendApi }: SendEmailRouteProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendApi) return;
    setSending(true);
    setResult(null);
    try {
      const response = await sendApi.send({ to, subject, body });
      const data = response.data;
      if (data?.success) {
        setResult({ success: true, message: `Email sent. Message ID: ${data.messageId}` });
        setTo(""); setSubject(""); setBody("");
      } else {
        setResult({ success: false, message: data?.error || "Failed to send email" });
      }
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-lg space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="to">To</Label>
          <Input
            id="to"
            type="email"
            required
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="body">Message</Label>
          <Textarea
            id="body"
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[160px]"
            placeholder="Write your message here..."
          />
        </div>
        <Button type="submit" size="sm" disabled={sending}>
          {sending
            ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            : <Send className="h-4 w-4 mr-1.5" />}
          {sending ? "Sending..." : "Send Email"}
        </Button>
      </form>

      {result && (
        <div className={result.success
          ? "rounded-md border p-3 text-sm bg-secondary text-secondary-foreground"
          : "rounded-md border border-destructive/50 p-3 text-sm bg-destructive/10 text-destructive"
        }>
          {result.message}
        </div>
      )}
    </div>
  );
}
