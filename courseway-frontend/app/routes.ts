import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("onboarding",     "routes/onboarding.tsx"),
  route("login",          "routes/page.tsx"),
  route("signup",         "routes/signup.tsx"),
  route("recommendations","routes/recommendations.tsx"),
  route("prerequisites",  "routes/prerequisites.tsx"),   
  route("module-planning","routes/module-planning.tsx"),
  route("profile",        "routes/profile.tsx"),
  route("graduation",     "routes/graduation.tsx"),
  route("shared/:token",  "routes/shared.tsx"),
] satisfies RouteConfig;
