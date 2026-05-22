import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
 
  index("routes/home.tsx"), 

  route("onboarding", "routes/onboarding.tsx"),
  
  route("login", "routes/page.tsx"),
  
  route("signup", "routes/signup.tsx"),

  route("dashboard", "routes/dashboard.tsx"),
] satisfies RouteConfig;