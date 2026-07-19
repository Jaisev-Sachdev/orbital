/**
 * root.tsx — App shell
 *
 * Changes from original:
 *   - Wraps <Outlet> in <AuthProvider> so every route gets auth context
 *   - Removed Google Fonts link tag (fonts now imported in app.css)
 *   - Kept ErrorBoundary unchanged
 */

import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { AuthProvider } from "~/context/AuthContext";

export const links: Route.LinksFunction = () => [
  { rel: "icon", type: "image/png", href: "/favicon.png" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main style={{ padding: "4rem 2rem", color: "var(--cw-white)" }}>
      <h1 style={{ color: "var(--cw-teal)" }}>{message}</h1>
      <p style={{ color: "rgba(240,244,255,0.7)" }}>{details}</p>
      {stack && (
        <pre
          style={{
            padding: "1rem",
            overflowX: "auto",
            backgroundColor: "var(--cw-navy-light)",
            borderRadius: "0.5rem",
            fontSize: "0.8rem",
            color: "rgba(240,244,255,0.6)",
          }}
        >
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
