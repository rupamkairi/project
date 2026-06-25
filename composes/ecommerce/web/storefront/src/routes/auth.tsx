import { createRoute, useNavigate, Link } from "@tanstack/react-router";
import { ecommerceStorefrontLayoutRoute } from "./store.layout";
import { useState } from "react";
import { Button, Input, Separator, Card, CardContent } from "@projectx/ui";
import { ecommerceStorefrontApi } from "../lib/api";
import { useCustomerStore } from "../stores/customer";
import { LogIn, UserPlus, Mail, Lock, ArrowLeft } from "lucide-react";

function StorefrontLogin() {
  const navigate = useNavigate();
  const loginStore = useCustomerStore((s) => s.login);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await ecommerceStorefrontApi.login(form.email, form.password);
    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else if (res.data) {
      ecommerceStorefrontApi.setToken(res.data.token);
      loginStore(res.data.customer, res.data.token);
      navigate({ to: "/store/account" });
    }
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <Card className="border-0 shadow-lg">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-1">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <LogIn className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome Back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Password</label>
              <Input type="password" placeholder="Enter your password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{error}</p>}
            <Button type="submit" className="w-full h-11" disabled={loading}>{loading ? "Signing in..." : "Sign In"}</Button>
          </form>

          <div className="text-center text-sm space-y-2">
            <Link to="/store/auth/register" className="text-primary hover:underline font-medium">Create an account</Link>
            <br />
            <Link to="/store/auth/forgot" className="text-muted-foreground hover:underline text-xs">Forgot password?</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StorefrontRegister() {
  const navigate = useNavigate();
  const loginStore = useCustomerStore((s) => s.login);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await ecommerceStorefrontApi.register(form);
    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else if (res.data) {
      ecommerceStorefrontApi.setToken(res.data.token);
      loginStore(res.data.customer, res.data.token);
      navigate({ to: "/store/account" });
    }
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <Card className="border-0 shadow-lg">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-1">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Create Account</h1>
            <p className="text-sm text-muted-foreground">Join the store today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">First Name</label>
                <Input placeholder="John" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Last Name</label>
                <Input placeholder="Doe" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Password</label>
              <Input type="password" placeholder="Create a password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{error}</p>}
            <Button type="submit" className="w-full h-11" disabled={loading}>{loading ? "Creating..." : "Create Account"}</Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/store/auth/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StorefrontForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <Card className="border-0 shadow-lg">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-1">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Reset Password</h1>
            <p className="text-sm text-muted-foreground">Enter your email to receive a reset link</p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-sm text-green-600 font-medium">Reset link sent! Check your email.</p>
              <Button variant="outline" asChild><Link to="/store/auth/login">Back to Sign In</Link></Button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full h-11">Send Reset Link</Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link to="/store/auth/login" className="text-primary hover:underline font-medium">Back to Sign In</Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const ecoStoreLoginRoute = createRoute({
  getParentRoute: () => ecommerceStorefrontLayoutRoute,
  path: "/auth/login",
  component: StorefrontLogin,
});

export const ecoStoreRegisterRoute = createRoute({
  getParentRoute: () => ecommerceStorefrontLayoutRoute,
  path: "/auth/register",
  component: StorefrontRegister,
});

export const ecoStoreForgotRoute = createRoute({
  getParentRoute: () => ecommerceStorefrontLayoutRoute,
  path: "/auth/forgot",
  component: StorefrontForgotPassword,
});
