"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function GoogleSignInButton({
  role,
  onCredential
}: {
  role?: "DEVELOPER" | "CREATOR" | "BRAND";
  onCredential: (credential: string) => void;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  // The button's own render() call reads this ref, so a re-render caused by
  // switching role (register page) doesn't need to reinitialize Google's
  // widget — it always calls whatever the latest onCredential is.
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    if (!clientId) return;

    let cancelled = false;
    function render() {
      if (cancelled || !window.google?.accounts?.id || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId as string,
        callback: (response) => onCredentialRef.current(response.credential)
      });
      buttonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: role ? "signup_with" : "signin_with"
      });
    }

    if (window.google?.accounts?.id) {
      render();
      return;
    }
    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(interval);
        render();
      }
    }, 100);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [role]);

  if (!clientId) {
    return (
      <div className="text-xs text-ink-muted border border-border rounded-lg px-3.5 py-3 text-center">
        Google sign-in isn&apos;t configured (missing NEXT_PUBLIC_GOOGLE_CLIENT_ID).
      </div>
    );
  }

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      <div ref={buttonRef} />
    </>
  );
}
