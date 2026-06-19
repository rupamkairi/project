import { createRoute } from "@tanstack/react-router"
import { sharedRootRoute } from "@projectx/shared-router"
import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useAuthStore } from "../../stores/auth"
import {
  Button,
  Input,
  Label,
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@projectx/ui"

export const Route = createRoute({
  getParentRoute: () => sharedRootRoute,
  path: "/login",
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { login, isLoading, error, clearError } = useAuthStore()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    const success = await login(email, password)
    if (success) {
      navigate({ to: "/dashboard" })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-xl">Platform Login</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Dev credentials</p>
            <p>
              Email: <span className="font-mono text-foreground">dev@platform.local</span>
            </p>
            <p>
              Password: <span className="font-mono text-foreground">dev123</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
