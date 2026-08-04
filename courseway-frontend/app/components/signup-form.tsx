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

  const [name, setName]                     = useState("")
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
      // name is optional; the backend stores null when it is blank.
      await api.post("/auth/register", { name, email, password })
      const { data } = await api.post("/auth/login", { email, password })
      login(data.token, email)
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
          <CardDescription style={{ color: "rgba(10,22,40,0.55)" }}>
            Start planning your NUS degree journey
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">

            <div className="space-y-2">
              <Label htmlFor="name" style={{ color: "rgba(10,22,40,0.8)" }}>Full name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Jaisev Sachdev"
                autoComplete="name"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{
                  backgroundColor: "var(--cw-navy)",
                  borderColor: "var(--cw-navy-border)",
                  color: "var(--cw-white)",
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" style={{ color: "rgba(10,22,40,0.8)" }}>Email</Label>
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
              <Label htmlFor="password" style={{ color: "rgba(10,22,40,0.8)" }}>Password</Label>
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
              <Label htmlFor="confirmPassword" style={{ color: "rgba(10,22,40,0.8)" }}>
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
                  color: "#E11D2E",
                  backgroundColor: "rgba(225,29,46,0.06)",
                  border: "1px solid rgba(225,29,46,0.2)",
                }}
              >
                {errorMessage}
              </p>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full font-semibold"
              style={{ backgroundColor: "var(--cw-teal)", color: "#FFFFFF" }}
            >
              {isLoading ? "Creating account…" : "Create account"}
            </Button>

            <p className="text-center text-sm" style={{ color: "rgba(10,22,40,0.55)" }}>
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
