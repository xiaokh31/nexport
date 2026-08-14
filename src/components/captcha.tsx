"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface CaptchaProps {
  siteKey?: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
      render: (container: string | HTMLElement, options: object) => number;
      reset: (widgetId?: number) => void;
    };
    onRecaptchaLoad?: () => void;
  }
}

// reCAPTCHA v2 Checkbox (visible, user must click)
export function CaptchaV2Checkbox({
  siteKey,
  onVerify,
  onError,
  onExpire,
}: CaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const isLoadedRef = useRef(false);

  useEffect(() => {
    if (!siteKey || isLoadedRef.current) return;

    // Define callback before loading script
    window.onRecaptchaLoad = () => {
      if (containerRef.current && widgetIdRef.current === null) {
        widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
          sitekey: siteKey,
          callback: onVerify,
          "error-callback": onError,
          "expired-callback": onExpire,
        });
      }
    };

    // Load reCAPTCHA v2 script
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    isLoadedRef.current = true;

    return () => {
      // Cleanup
      const existingScript = document.querySelector(
        `script[src*="recaptcha/api.js"]`
      );
      if (existingScript) {
        existingScript.remove();
      }
      window.onRecaptchaLoad = undefined;
    };
  }, [siteKey, onVerify, onError, onExpire]);

  const reset = useCallback(() => {
    if (widgetIdRef.current !== null && window.grecaptcha) {
      window.grecaptcha.reset(widgetIdRef.current);
    }
  }, []);

  return (
    <div className="flex justify-center">
      <div ref={containerRef} />
    </div>
  );
}

// reCAPTCHA v3 (invisible)
export function CaptchaV3({ siteKey, onVerify }: Pick<CaptchaProps, "siteKey" | "onVerify">) {
  const isLoaded = useRef(false);

  useEffect(() => {
    if (!siteKey || isLoaded.current) return;

    // Load reCAPTCHA script
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    isLoaded.current = true;

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector(
        `script[src*="recaptcha/api.js"]`
      );
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [siteKey]);

  const executeRecaptcha = useCallback(
    async (action: string = "submit") => {
      if (!siteKey || !window.grecaptcha) {
        console.warn("reCAPTCHA not loaded or no site key provided");
        return null;
      }

      return new Promise<string>((resolve) => {
        window.grecaptcha.ready(async () => {
          try {
            const token = await window.grecaptcha.execute(siteKey, { action });
            onVerify(token);
            resolve(token);
          } catch (error) {
            console.error("reCAPTCHA execution error:", error);
            resolve("");
          }
        });
      });
    },
    [siteKey, onVerify]
  );

  return { executeRecaptcha };
}

// Simple Math CAPTCHA (fallback when no external service)
export function SimpleMathCaptcha({
  onVerify,
  label = "Verify you are human",
}: {
  onVerify: (verified: boolean) => void;
  label?: string;
}) {
  const [challenge, setChallenge] = useState(() => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    return { num1, num2, answer: num1 + num2 };
  });
  const [input, setInput] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState(false);

  const regenerate = useCallback(() => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setChallenge({ num1, num2, answer: num1 + num2 });
    setInput("");
    setIsVerified(false);
    setError(false);
    onVerify(false);
  }, [onVerify]);

  const handleVerify = useCallback(() => {
    const userAnswer = parseInt(input, 10);
    if (userAnswer === challenge.answer) {
      setIsVerified(true);
      setError(false);
      onVerify(true);
    } else {
      setError(true);
      setIsVerified(false);
      onVerify(false);
    }
  }, [input, challenge.answer, onVerify]);

  if (isVerified) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span className="text-sm text-green-700 dark:text-green-300">Verified</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}: {challenge.num1} + {challenge.num2} = ?
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError(false);
          }}
          className={`flex-1 px-3 py-2 border rounded-md text-sm 
            ${error ? "border-red-500 bg-red-50 dark:bg-red-900/20" : "border-gray-300 dark:border-gray-600"}
            bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary`}
          placeholder="Answer"
        />
        <button
          type="button"
          onClick={handleVerify}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
        >
          Verify
        </button>
        <button
          type="button"
          onClick={regenerate}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
          title="New question"
        >
          ↻
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-500">Incorrect answer, please try again.</p>
      )}
    </div>
  );
}

// Hook for using CAPTCHA
export function useCaptcha(siteKey?: string) {
  const hasExternalCaptcha = !!siteKey;
  
  const verifyToken = useCallback(
    async (token: string): Promise<boolean> => {
      if (!hasExternalCaptcha) return true; // Skip if no external captcha
      
      try {
        const response = await fetch("/api/auth/verify-captcha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        
        const data = await response.json();
        return data.success;
      } catch (error) {
        console.error("CAPTCHA verification error:", error);
        return false;
      }
    },
    [hasExternalCaptcha]
  );

  return { verifyToken, hasExternalCaptcha };
}
