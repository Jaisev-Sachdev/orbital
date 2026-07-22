/**
 * SignupForm  —  app/components/signup-form.tsx
 *
 * Changes from original:
 *   - Raw fetch() → api.post()
 *   - On success, auto-logs in (calls /auth/login right after register)
 *     and redirects to /onboarding so the user goes straight to setup
 *   - Courseway brand styling
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

export function SignupForm({ className, ...props }: React.ComponentProps<"div">) {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail]                   = useState("")
  const [password, setPassword]             = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading]           = useState(false)
  const [errorMessage, setErrorMessage]     = useState("")

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage("")

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.")
      setIsLoading(false)
      return
    }

    try {
      // 1. Register
      await api.post("/auth/register", { email, password })

      // 2. Auto-login so the user doesn't have to log in again
      const { data } = await api.post("/auth/login", { email, password })
      login(data.token, email)

      // 3. Go straight to onboarding
      navigate("/onboarding")
    } catch (err: any) {
      const msg = err.response?.data?.error
               || err.response?.data?.message
               || "Failed to create account. Please try again."
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
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/logo.png" alt="Courseway" className="h-9 w-auto" />
          </div>
          <CardTitle style={{ color: "var(--cw-white)" }}>Create your account</CardTitle>
          <CardDescription style={{ color: "rgba(240,244,255,0.5)" }}>
            Start planning your NUS degree journey
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">

            <div className="space-y-2">
              <Label htmlFor="email" style={{ color: "rgba(240,244,255,0.8)" }}>Email</Label>
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
              <Label htmlFor="password" style={{ color: "rgba(240,244,255,0.8)" }}>Password</Label>
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" style={{ color: "rgba(240,244,255,0.8)" }}>
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
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
              style={{ backgroundColor: "var(--cw-teal)", color: "var(--cw-navy)" }}
            >
              {isLoading ? "Creating account…" : "Create account"}
            </Button>

            <p className="text-center text-sm" style={{ color: "rgba(240,244,255,0.5)" }}>
              Already have an account?{" "}
              <Link
                to="/login"
                style={{ color: "var(--cw-teal)", textDecoration: "none", fontWeight: 500 }}
              >
                Log in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
