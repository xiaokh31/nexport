"use client";

import { useEffect, useRef } from "react";

interface CaptchaProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  resetKey?: number;
}

declare global {
  interface Window {
    grecaptcha?: {
      render: (container: string | HTMLElement, options: object) => number;
      reset: (widgetId?: number) => void;
    };
    onRecaptchaLoad?: () => void;
  }
}

export function CaptchaV2Checkbox({
  siteKey,
  onVerify,
  onError,
  onExpire,
  resetKey,
}: CaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const callbacksRef = useRef({ onVerify, onError, onExpire });

  useEffect(() => {
    callbacksRef.current = { onVerify, onError, onExpire };
  }, [onVerify, onError, onExpire]);

  useEffect(() => {
    const renderWidget = () => {
      if (!containerRef.current || widgetIdRef.current !== null || !window.grecaptcha) return;

      widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => callbacksRef.current.onVerify(token),
        "error-callback": () => callbacksRef.current.onError?.(),
        "expired-callback": () => callbacksRef.current.onExpire?.(),
      });
    };

    window.onRecaptchaLoad = renderWidget;

    if (window.grecaptcha) {
      renderWidget();
    } else {
      const script = document.createElement("script");
      script.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.nexportRecaptcha = "true";
      script.onerror = () => callbacksRef.current.onError?.();
      document.head.appendChild(script);
    }

    return () => {
      document.querySelector('script[data-nexport-recaptcha="true"]')?.remove();
      window.onRecaptchaLoad = undefined;
      widgetIdRef.current = null;
    };
  }, [siteKey]);

  useEffect(() => {
    if (resetKey !== undefined && widgetIdRef.current !== null) {
      window.grecaptcha?.reset(widgetIdRef.current);
    }
  }, [resetKey]);

  return (
    <div className="flex justify-center">
      <div ref={containerRef} />
    </div>
  );
}

export function CaptchaUnavailable({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {message}
    </div>
  );
}
