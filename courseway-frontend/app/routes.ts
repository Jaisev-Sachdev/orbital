import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("dashboard",      "routes/dashboard.tsx"),
  route("onboarding",     "routes/onboarding.tsx"),
  route("login",          "routes/page.tsx"),
  route("signup",         "routes/signup.tsx"),
  route("recommendations","routes/recommendations.tsx"),
  route("prerequisites",  "routes/prerequisites.tsx"),   // ← MS1: prereq checker
] satisfies RouteConfig;
