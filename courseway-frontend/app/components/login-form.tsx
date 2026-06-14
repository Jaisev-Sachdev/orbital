/**
 * LoginForm  —  app/components/login-form.tsx
 *
 * Changes from original:
 *   - Raw fetch() → api.post() (Axios client with interceptor)
 *   - Uses auth.login() from AuthContext (consistent token key everywhere)
 *   - Stores email in localStorage for the profile greeting
 *   - Uses react-router navigate() instead of window.location.href
 *   - Courseway brand colours (navy/teal) applied via inline style + CSS vars
 *   - Fixed navigate("./..") → navigate("/")
 */

import { useState } from "react"
import { useNavigate, Link } from "react-router"
import { cn } from "~/lib/utils"
import { useAuth } from "~/context/AuthContext"
import api from "~/lib/api"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Label } from "./ui/label"
import { Input } from "./ui/input"

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage("")

    try {
      const { data } = await api.post("/auth/login", { email, password })

      // auth.login() writes to localStorage AND updates AuthContext state
      login(data.token, email)

      navigate("/")
    } catch (err: any) {
      const msg = err.response?.data?.error
               || err.response?.data?.message
               || "Failed to login. Please check your credentials."
      setErrorMessage(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card
        style={{
          backgroundColor: "var(--cw-navy-light)",
          border: "1px solid var(--cw-navy-border)",
        }}
      >
        <CardHeader className="text-center">
          {/* Courseway logo mark */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <span
              className="text-2xl font-bold"
              style={{ color: "var(--cw-teal)" }}
            >
              ⌘
            </span>
            <span className="text-xl font-bold" style={{ color: "var(--cw-white)" }}>
              Courseway
            </span>
          </div>
          <CardTitle style={{ color: "var(--cw-white)" }}>Welcome back</CardTitle>
          <CardDescription style={{ color: "rgba(240,244,255,0.5)" }}>
            Log in to continue planning your degree
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">

            <div className="space-y-2">
              <Label htmlFor="email" style={{ color: "rgba(240,244,255,0.8)" }}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="e0123456@u.nus.edu"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{
                  backgroundColor: "var(--cw-navy)",
                  borderColor: "var(--cw-navy-border)",
                  color: "var(--cw-white)",
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" style={{ color: "rgba(240,244,255,0.8)" }}>
                Password
              </Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  backgroundColor: "var(--cw-navy)",
                  borderColor: "var(--cw-navy-border)",
                  color: "var(--cw-white)",
                }}
              />
            </div>

            {errorMessage && (
              <p
                className="text-sm px-3 py-2 rounded"
                style={{
                  color: "#FF4D4F",
                  backgroundColor: "rgba(255,77,79,0.08)",
                  border: "1px solid rgba(255,77,79,0.2)",
                }}
              >
                {errorMessage}
              </p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full font-semibold"
              style={{
                backgroundColor: "var(--cw-teal)",
                color: "var(--cw-navy)",
              }}
            >
              {isLoading ? "Logging in…" : "Log in"}
            </Button>

            <p className="text-center text-sm" style={{ color: "rgba(240,244,255,0.5)" }}>
              Don't have an account?{" "}
              <Link
                to="/signup"
                style={{ color: "var(--cw-teal)", textDecoration: "none", fontWeight: 500 }}
              >
                Sign up
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
