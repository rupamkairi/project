// Simple Send Email Component

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";

interface SendEmailRouteProps {
  sendApi?: {
    send: (data: { to: string; subject: string; body: string }) => Promise<{ data?: { success?: boolean; messageId?: string; error?: string } }>;
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
        setResult({ success: true, message: `Email sent! Message ID: ${data.messageId}` });
        setTo("");
        setSubject("");
        setBody("");
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
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Send Email</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="to" className="block text-sm font-medium mb-1">
            To (Email Address)
          </label>
          <input
            id="to"
            type="email"
            required
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
            placeholder="recipient@example.com"
          />
        </div>
        
        <div>
          <label htmlFor="subject" className="block text-sm font-medium mb-1">
            Subject
          </label>
          <input
            id="subject"
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
            placeholder="Email subject"
          />
        </div>
        
        <div>
          <label htmlFor="body" className="block text-sm font-medium mb-1">
            Message (HTML supported)
          </label>
          <textarea
            id="body"
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background min-h-[200px]"
            placeholder="Write your message here..."
          />
        </div>
        
        <button
          type="submit"
          disabled={sending}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? "Sending..." : "Send Email"}
        </button>
      </form>
      
      {result && (
        <div className={`mt-4 p-4 rounded-md ${result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {result.message}
        </div>
      )}
    </div>
  );
}
