"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  Suspense,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  Mail,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CanvasRevealEffect } from "@/components/ui/sign-in-flow-1";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PasswordRules {
  length: boolean;
  uppercase: boolean;
  number: boolean;
  special: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validatePassword(password: string): PasswordRules {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

function isPasswordValid(password: string): boolean {
  const r = validatePassword(password);
  return r.length && r.uppercase && r.number && r.special;
}

function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(
    email.trim()
  );
}

function isValidName(name: string): boolean {
  return /^[a-zA-Z\s'\-]{2,}$/.test(name.trim());
}



// ─── Shared Background ────────────────────────────────────────────────────────

function AuthBackground({ reverse = false }: { reverse?: boolean }) {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <CanvasRevealEffect
        animationSpeed={3}
        containerClassName="bg-black"
        colors={[
          [255, 255, 255],
          [255, 255, 255],
        ]}
        dotSize={6}
        reverse={reverse}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.92)_0%,_transparent_80%)]" />
      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black to-transparent" />
    </div>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function HealthCompanionLogo() {
  return (
    <div className="mb-8 flex items-center justify-center gap-3">
      <div className="w-9 h-9 bg-emerald-500 rounded-2xl flex items-center justify-center">
        <ShieldCheck className="w-5 h-5 text-black" />
      </div>
      <span className="text-white font-semibold text-lg tracking-tight">
        Health Companion
      </span>
    </div>
  );
}

// ─── Auth Card Layout ─────────────────────────────────────────────────────────

function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -24 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <HealthCompanionLogo />
        {children}
      </motion.div>
    </div>
  );
}

// ─── Input Field ──────────────────────────────────────────────────────────────

interface InputFieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  valid?: boolean | null;
  errorMsg?: string;
  disabled?: boolean;
  rightElement?: React.ReactNode;
  onBlur?: () => void;
}

function InputField({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  valid = null,
  errorMsg,
  disabled,
  rightElement,
  onBlur,
}: InputFieldProps) {
  const borderClass =
    valid === null
      ? "border-white/10 focus:border-white/30"
      : valid
      ? "border-emerald-500/50 focus:border-emerald-500"
      : "border-red-500/50 focus:border-red-500";

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-white/40 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className={cn(
            "w-full bg-white/5 backdrop-blur-sm text-white rounded-xl py-3 text-sm",
            "border transition-all duration-200 focus:outline-none",
            "placeholder:text-white/20 disabled:opacity-40 disabled:cursor-not-allowed",
            borderClass,
            rightElement ? "pl-4 pr-12" : "px-4"
          )}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
            {rightElement}
          </div>
        )}
      </div>
      <AnimatePresence>
        {errorMsg && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs text-red-400 flex items-center gap-1 overflow-hidden"
          >
            <AlertCircle className="w-3 h-3 flex-none" />
            {errorMsg}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Password Field with Show/Hide ────────────────────────────────────────────

type PasswordFieldProps = Omit<InputFieldProps, "type" | "rightElement">;

function PasswordField(props: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <InputField
      {...props}
      type={show ? "text" : "password"}
      rightElement={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="text-white/30 hover:text-white/60 transition-colors"
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      }
    />
  );
}

// ─── Password Strength Meter ──────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const rules = validatePassword(password);
  const score = Object.values(rules).filter(Boolean).length;

  const barColors = [
    "bg-red-500",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-emerald-500",
  ];
  const labels = ["Weak", "Fair", "Good", "Strong"];
  const barColor = barColors[score - 1] ?? "bg-zinc-700";
  const label = labels[score - 1] ?? "";

  const ruleList: [keyof PasswordRules, string][] = [
    ["length", "8+ characters"],
    ["uppercase", "Uppercase letter"],
    ["number", "Number"],
    ["special", "Special character"],
  ];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-2 overflow-hidden"
    >
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-300",
                i < score ? barColor : "bg-zinc-800"
              )}
            />
          ))}
        </div>
        <span className="text-xs text-white/40 w-12 text-right">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {ruleList.map(([key, text]) => (
          <div key={key} className="flex items-center gap-1.5">
            {rules[key] ? (
              <Check className="w-3 h-3 text-emerald-400 flex-none" />
            ) : (
              <X className="w-3 h-3 text-zinc-600 flex-none" />
            )}
            <span
              className={cn(
                "text-xs",
                rules[key] ? "text-emerald-400" : "text-zinc-500"
              )}
            >
              {text}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Error Banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
    >
      <AlertCircle className="w-4 h-4 text-red-400 flex-none mt-0.5" />
      <p className="text-sm text-red-300 leading-snug">{message}</p>
    </motion.div>
  );
}

// ─── Primary Button ───────────────────────────────────────────────────────────

interface PrimaryButtonProps {
  children: React.ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
}

function PrimaryButton({
  children,
  isLoading,
  disabled,
  type = "submit",
  onClick,
}: PrimaryButtonProps) {
  const isDisabled = disabled || isLoading;
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      whileHover={{ scale: isDisabled ? 1 : 1.02 }}
      whileTap={{ scale: isDisabled ? 1 : 0.98 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "w-full py-3 rounded-full font-semibold text-sm transition-all duration-200",
        isDisabled
          ? "bg-zinc-800 text-white/25 cursor-not-allowed"
          : "bg-white text-black hover:bg-white/90"
      )}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Please wait…
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}

// ─── Fake CAPTCHA (client-side rate-limit UX) ─────────────────────────────────

function FakeCaptcha({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="w-full flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 hover:border-white/20 transition-colors"
      >
        <div
          className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center flex-none transition-colors",
            checked ? "bg-emerald-500 border-emerald-500" : "border-white/30"
          )}
        >
          {checked && <Check className="w-3 h-3 text-black" />}
        </div>
        <span className="text-sm text-white/60 text-left">
          I&apos;m not a robot
        </span>
        <div className="ml-auto text-right flex-none">
          <div className="text-[10px] text-white/20">reCAPTCHA</div>
          <div className="text-[9px] text-white/15">Privacy · Terms</div>
        </div>
      </button>
    </motion.div>
  );
}

// ─── Lockout Banner ───────────────────────────────────────────────────────────

function LockoutBanner({ seconds }: { seconds: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3"
    >
      <AlertCircle className="w-4 h-4 text-orange-400 flex-none" />
      <p className="text-sm text-orange-300">
        Too many attempts. Try again in{" "}
        <span className="font-semibold">{seconds}s</span>
      </p>
    </motion.div>
  );
}

// ─── OTP Input Grid ───────────────────────────────────────────────────────────

interface OTPInputsProps {
  code: string[];
  onChange: (index: number, value: string) => void;
  onKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  disabled?: boolean;
}

function OTPInputs({
  code,
  onChange,
  onKeyDown,
  inputRefs,
  disabled,
}: OTPInputsProps) {
  return (
    <div className="rounded-2xl py-4 px-5 border border-white/10 bg-white/5 backdrop-blur-sm">
      <div className="flex items-center justify-center">
        {code.map((digit, i) => (
          <div key={i} className="flex items-center">
            <div className="relative">
              <input
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                disabled={disabled}
                onChange={(e) =>
                  onChange(i, e.target.value.replace(/\D/g, ""))
                }
                onKeyDown={(e) => onKeyDown(i, e)}
                autoComplete={i === 0 ? "one-time-code" : "off"}
                className="w-9 h-10 text-center text-xl bg-transparent text-white border-none focus:outline-none focus:ring-0 appearance-none disabled:opacity-40"
                style={{ caretColor: "transparent" }}
              />
              {!digit && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-xl text-white/15">·</span>
                </div>
              )}
            </div>
            {i < 5 && (
              <span className="text-white/15 text-lg mx-0.5 select-none">
                |
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SIGN IN ──────────────────────────────────────────────────────────────────

export function HealthCompanionSignIn() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Rate limiting
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaChecked, setCaptchaChecked] = useState(false);

  // Field touch state
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Lockout countdown
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const t = setInterval(
      () => setLockoutSeconds((s) => Math.max(0, s - 1)),
      1000
    );
    return () => clearInterval(t);
  }, [lockoutSeconds]);

  const emailValid = emailTouched
    ? isValidEmail(email)
      ? true
      : false
    : null;
  const passwordValid = passwordTouched
    ? password.length > 0
      ? true
      : false
    : null;

  const canSubmit =
    isValidEmail(email) &&
    password.length > 0 &&
    lockoutSeconds === 0 &&
    (!showCaptcha || captchaChecked);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit || isLoading) return;

      setIsLoading(true);
      setError("");

      const isPlaceholder = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("your-project.supabase.co");
      if (isPlaceholder) {
        setError("Supabase is not configured. Please set your real NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.");
        setIsLoading(false);
        return;
      }

      try {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (authError) {
          const newAttempts = loginAttempts + 1;
          setLoginAttempts(newAttempts);

          if (newAttempts >= 5) {
            setLockoutSeconds(30);
            setLoginAttempts(0);
            setError("");
          } else if (newAttempts >= 3) {
            setShowCaptcha(true);
            setError(
              authError.message === "Invalid login credentials"
                ? "Incorrect email or password."
                : authError.message
            );
          } else {
            setError(
              authError.message === "Invalid login credentials"
                ? "Incorrect email or password."
                : authError.message
            );
          }
        } else {
          router.push("/dashboard");
          router.refresh();
        }
      } catch {
        setError("Network error: Failed to connect to authentication server. Please check your internet connection.");
      }

      setIsLoading(false);
    },
    [
      email,
      password,
      canSubmit,
      isLoading,
      loginAttempts,
      supabase,
      router,
    ]
  );

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <AuthBackground />
      <AuthCard>
        <div className="space-y-2 text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Welcome back
          </h1>
          <p className="text-white/40 text-sm">Sign in to your Health Companion account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <AnimatePresence>
            {error && <ErrorBanner message={error} />}
            {lockoutSeconds > 0 && (
              <LockoutBanner seconds={lockoutSeconds} />
            )}
          </AnimatePresence>

          <InputField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            onBlur={() => setEmailTouched(true)}
            placeholder="you@example.com"
            autoComplete="email"
            valid={emailValid}
            errorMsg={
              emailValid === false ? "Enter a valid email address" : undefined
            }
            disabled={isLoading || lockoutSeconds > 0}
          />

          <PasswordField
            label="Password"
            value={password}
            onChange={setPassword}
            onBlur={() => setPasswordTouched(true)}
            placeholder="••••••••"
            autoComplete="current-password"
            valid={passwordValid}
            disabled={isLoading || lockoutSeconds > 0}
          />

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <AnimatePresence>
            {showCaptcha && (
              <FakeCaptcha
                checked={captchaChecked}
                onChange={setCaptchaChecked}
              />
            )}
          </AnimatePresence>

          <PrimaryButton isLoading={isLoading} disabled={!canSubmit}>
            Sign In
          </PrimaryButton>
        </form>

        <p className="mt-6 text-center text-sm text-white/40">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-white hover:text-emerald-400 transition-colors font-medium"
          >
            Sign up
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}

// ─── SIGN UP ──────────────────────────────────────────────────────────────────

export function HealthCompanionSignUp() {
  const router = useRouter();
  const supabase = createClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedHealth, setAgreedHealth] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Touch tracking for validation feedback
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const touch = (field: keyof typeof touched) =>
    setTouched((t) => ({ ...t, [field]: true }));

  const allPasswordRules = isPasswordValid(password);

  const validations = {
    firstName: isValidName(firstName),
    lastName: isValidName(lastName),
    email: isValidEmail(email),
    password: allPasswordRules,
    confirmPassword: password === confirmPassword && confirmPassword.length > 0,
  };

  const canSubmit =
    Object.values(validations).every(Boolean) &&
    agreedTerms &&
    agreedHealth;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit || isLoading) return;

      setIsLoading(true);
      setError("");

      const isPlaceholder = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("your-project.supabase.co");
      if (isPlaceholder) {
        setError("Supabase is not configured. Please set your real NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.");
        setIsLoading(false);
        return;
      }

      try {
        const { error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: `${firstName.trim()} ${lastName.trim()}`,
              first_name: firstName.trim(),
              last_name: lastName.trim(),
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (authError) {
          setError(authError.message);
        } else {
          router.push(
            `/verify-email?email=${encodeURIComponent(email.trim())}`
          );
        }
      } catch {
        setError("Network error: Failed to connect to authentication server. Please check your internet connection.");
      }

      setIsLoading(false);
    },
    [
      canSubmit,
      isLoading,
      email,
      password,
      firstName,
      lastName,
      supabase,
      router,
    ]
  );

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <AuthBackground />
      <AuthCard>
        <div className="space-y-2 text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Create account
          </h1>
          <p className="text-white/40 text-sm">
            Start your health journey with Health Companion
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <AnimatePresence>
            {error && <ErrorBanner message={error} />}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="First Name"
              value={firstName}
              onChange={setFirstName}
              onBlur={() => touch("firstName")}
              placeholder="Alex"
              autoComplete="given-name"
              valid={
                touched.firstName
                  ? validations.firstName
                    ? true
                    : false
                  : null
              }
              errorMsg={
                touched.firstName && !validations.firstName
                  ? "2+ letters only"
                  : undefined
              }
              disabled={isLoading}
            />
            <InputField
              label="Last Name"
              value={lastName}
              onChange={setLastName}
              onBlur={() => touch("lastName")}
              placeholder="Chen"
              autoComplete="family-name"
              valid={
                touched.lastName
                  ? validations.lastName
                    ? true
                    : false
                  : null
              }
              errorMsg={
                touched.lastName && !validations.lastName
                  ? "2+ letters only"
                  : undefined
              }
              disabled={isLoading}
            />
          </div>

          <InputField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            onBlur={() => touch("email")}
            placeholder="you@example.com"
            autoComplete="email"
            valid={
              touched.email ? (validations.email ? true : false) : null
            }
            errorMsg={
              touched.email && !validations.email
                ? "Enter a valid email address"
                : undefined
            }
            disabled={isLoading}
          />

          <PasswordField
            label="Password"
            value={password}
            onChange={setPassword}
            onBlur={() => touch("password")}
            placeholder="••••••••"
            autoComplete="new-password"
            valid={
              touched.password
                ? validations.password
                  ? true
                  : false
                : null
            }
            disabled={isLoading}
          />

          <AnimatePresence>
            {password.length > 0 && (
              <PasswordStrength password={password} />
            )}
          </AnimatePresence>

          <PasswordField
            label="Confirm Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            onBlur={() => touch("confirmPassword")}
            placeholder="••••••••"
            autoComplete="new-password"
            valid={
              touched.confirmPassword
                ? validations.confirmPassword
                  ? true
                  : false
                : null
            }
            errorMsg={
              touched.confirmPassword && !validations.confirmPassword
                ? "Passwords do not match"
                : undefined
            }
            disabled={isLoading}
          />

          {/* Consent checkboxes */}
          <div className="space-y-3 pt-1">
            <CheckboxItem
              checked={agreedTerms}
              onChange={setAgreedTerms}
              disabled={isLoading}
            >
              I agree to the{" "}
              <Link
                href="#"
                className="text-white/60 underline hover:text-white transition-colors"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="#"
                className="text-white/60 underline hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
            </CheckboxItem>

            <CheckboxItem
              checked={agreedHealth}
              onChange={setAgreedHealth}
              disabled={isLoading}
            >
              I consent to Health Companion processing my health data to provide
              personalised coaching
            </CheckboxItem>
          </div>

          <PrimaryButton isLoading={isLoading} disabled={!canSubmit}>
            Create Account
          </PrimaryButton>
        </form>

        <p className="mt-6 text-center text-sm text-white/40">
          Already have an account?{" "}
          <Link
            href="/signin"
            className="text-white hover:text-emerald-400 transition-colors font-medium"
          >
            Sign in
          </Link>
        </p>
      </AuthCard>
    </div>
  );
}

// ─── Checkbox Item ────────────────────────────────────────────────────────────

function CheckboxItem({
  checked,
  onChange,
  disabled,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      className="flex items-start gap-3 text-left w-full group"
      disabled={disabled}
    >
      <div
        className={cn(
          "w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center flex-none transition-colors",
          checked
            ? "bg-emerald-500 border-emerald-500"
            : "border-white/20 group-hover:border-white/40"
        )}
      >
        {checked && <Check className="w-3 h-3 text-black" />}
      </div>
      <span className="text-xs text-white/40 leading-relaxed">{children}</span>
    </button>
  );
}

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────

export function HealthCompanionForgotPassword() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const emailValid = emailTouched
    ? isValidEmail(email)
      ? true
      : false
    : null;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isValidEmail(email) || isLoading) return;

      setIsLoading(true);
      setError("");

      const isPlaceholder = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("your-project.supabase.co");
      if (isPlaceholder) {
        setError("Supabase is not configured. Please set your real NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.");
        setIsLoading(false);
        return;
      }

      try {
        const { error: authError } =
          await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
          });

        if (authError) {
          setError(authError.message);
        } else {
          setSent(true);
        }
      } catch {
        setError("Network error: Failed to connect to authentication server. Please check your internet connection.");
      }

      setIsLoading(false);
    },
    [email, isLoading, supabase]
  );

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <AuthBackground />
      <AuthCard>
        <AnimatePresence mode="wait">
          {!sent ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Forgot password?
                </h1>
                <p className="text-white/40 text-sm">
                  Enter your email and we&apos;ll send a reset link
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <AnimatePresence>
                  {error && <ErrorBanner message={error} />}
                </AnimatePresence>

                <InputField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  onBlur={() => setEmailTouched(true)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  valid={emailValid}
                  errorMsg={
                    emailValid === false
                      ? "Enter a valid email address"
                      : undefined
                  }
                  disabled={isLoading}
                />

                <PrimaryButton
                  isLoading={isLoading}
                  disabled={!isValidEmail(email)}
                >
                  Send Reset Link
                </PrimaryButton>
              </form>

              <div className="text-center">
                <Link
                  href="/signin"
                  className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to sign in
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="sent"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6 text-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring" }}
                className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"
              >
                <Mail className="w-8 h-8 text-emerald-400" />
              </motion.div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-white">
                  Check your inbox
                </h1>
                <p className="text-white/40 text-sm leading-relaxed">
                  We sent a password reset link to{" "}
                  <span className="text-white/70">{email}</span>
                </p>
              </div>

              <p className="text-xs text-white/25 leading-relaxed">
                Didn&apos;t receive the email? Check your spam folder or{" "}
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="text-white/50 underline hover:text-white/70 transition-colors"
                >
                  try again
                </button>
              </p>

              <Link
                href="/signin"
                className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to sign in
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </AuthCard>
    </div>
  );
}

// ─── VERIFY EMAIL (inner — uses useSearchParams) ──────────────────────────────

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const emailParam = searchParams.get("email") ?? "";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [reverseCanvas, setReverseCanvas] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(
      () => setResendCooldown((s) => Math.max(0, s - 1)),
      1000
    );
    return () => clearInterval(t);
  }, [resendCooldown]);

  // Focus first input on mount
  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 300);
  }, []);

  const handleVerify = async (token: string) => {
    if (!emailParam || token.length !== 6) return;

    setIsLoading(true);
    setError("");

    const isPlaceholder = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("your-project.supabase.co");
    if (isPlaceholder) {
      setError("Supabase is not configured. Please set your real NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.");
      setIsLoading(false);
      return;
    }

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: emailParam,
        token,
        type: "signup",
      });

      if (verifyError) {
        setError(
          verifyError.message === "Token has expired or is invalid"
            ? "Invalid or expired code. Please try resending."
            : verifyError.message
        );
        setCode(["", "", "", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      } else {
        setReverseCanvas(true);
        setSuccess(true);
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 2000);
      }
    } catch {
      setError("Network error: Failed to connect to authentication server. Please check your internet connection.");
    }

  };

  const handleCodeChange = useCallback(
    (index: number, value: string) => {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);

      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-verify when all 6 digits entered
      if (index === 5 && value) {
        const isComplete = newCode.every((d) => d.length === 1);
        if (isComplete) {
          handleVerify(newCode.join(""));
        }
      }
    },
    [code] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !code[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [code]
  );

  const handleResend = async () => {
    if (resendCooldown > 0 || !emailParam) return;

    setError("");
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: emailParam,
    });

    if (resendError) {
      setError(resendError.message);
    } else {
      setResendCooldown(60);
      setCode(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    }
  };

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <AuthBackground reverse={reverseCanvas} />
      <AuthCard>
        <AnimatePresence mode="wait">
          {!success ? (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Check your email
                </h1>
                <p className="text-white/40 text-sm leading-relaxed">
                  We sent a 6-digit code to{" "}
                  {emailParam ? (
                    <span className="text-white/70">{emailParam}</span>
                  ) : (
                    "your email"
                  )}
                </p>
              </div>

              <AnimatePresence>
                {error && <ErrorBanner message={error} />}
              </AnimatePresence>

              <OTPInputs
                code={code}
                onChange={handleCodeChange}
                onKeyDown={handleKeyDown}
                inputRefs={inputRefs}
                disabled={isLoading}
              />

              {/* Resend */}
              <div className="text-center">
                {resendCooldown > 0 ? (
                  <p className="text-sm text-white/30 flex items-center justify-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Resend in {resendCooldown}s
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-sm text-white/40 hover:text-white/70 transition-colors"
                  >
                    Didn&apos;t receive a code? Resend
                  </button>
                )}
              </div>

              <PrimaryButton
                type="button"
                isLoading={isLoading}
                disabled={code.some((d) => d === "") || isLoading}
                onClick={() => handleVerify(code.join(""))}
              >
                Verify Email
              </PrimaryButton>

              <div className="text-center">
                <Link
                  href="/signin"
                  className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to sign in
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6 text-center"
            >
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="mx-auto w-16 h-16 rounded-full bg-white flex items-center justify-center"
              >
                <Check className="w-8 h-8 text-black" />
              </motion.div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white">
                  You&apos;re in!
                </h1>
                <p className="text-white/40 text-sm">
                  Welcome to Health Companion. Heading to your dashboard…
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </AuthCard>
    </div>
  );
}


// ─── RESET PASSWORD ───────────────────────────────────────────────────────────

export function HealthCompanionResetPassword() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [touched, setTouched] = useState({
    password: false,
    confirmPassword: false,
  });

  const touch = (field: keyof typeof touched) =>
    setTouched((t) => ({ ...t, [field]: true }));

  const allPasswordRules = isPasswordValid(password);
  const validations = {
    password: allPasswordRules,
    confirmPassword: password === confirmPassword && confirmPassword.length > 0,
  };

  const canSubmit = Object.values(validations).every(Boolean);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit || isLoading) return;

      setIsLoading(true);
      setError("");

      const isPlaceholder = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("your-project.supabase.co");
      if (isPlaceholder) {
        setError("Supabase is not configured. Please set your real NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.");
        setIsLoading(false);
        return;
      }

      try {
        const { error: authError } = await supabase.auth.updateUser({
          password: password,
        });

        if (authError) {
          setError(authError.message);
        } else {
          setSuccess(true);
          setTimeout(() => {
            router.push("/signin");
          }, 2000);
        }
      } catch {
        setError("Network error: Failed to connect to authentication server. Please check your internet connection.");
      }

      setIsLoading(false);
    },
    [password, canSubmit, isLoading, supabase, router]
  );

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <AuthBackground />
      <AuthCard>
        <AnimatePresence mode="wait">
          {!success ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Reset password
                </h1>
                <p className="text-white/40 text-sm">
                  Enter your new password below
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <AnimatePresence>
                  {error && <ErrorBanner message={error} />}
                </AnimatePresence>

                <PasswordField
                  label="New Password"
                  value={password}
                  onChange={setPassword}
                  onBlur={() => touch("password")}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  valid={
                    touched.password
                      ? validations.password
                        ? true
                        : false
                      : null
                  }
                  disabled={isLoading}
                />

                <AnimatePresence>
                  {password.length > 0 && (
                    <PasswordStrength password={password} />
                  )}
                </AnimatePresence>

                <PasswordField
                  label="Confirm Password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  onBlur={() => touch("confirmPassword")}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  valid={
                    touched.confirmPassword
                      ? validations.confirmPassword
                        ? true
                        : false
                      : null
                  }
                  errorMsg={
                    touched.confirmPassword && !validations.confirmPassword
                      ? "Passwords do not match"
                      : undefined
                  }
                  disabled={isLoading}
                />

                <PrimaryButton isLoading={isLoading} disabled={!canSubmit}>
                  Update Password
                </PrimaryButton>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="space-y-6 text-center py-4"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-white">
                  Password updated
                </h1>
                <p className="text-white/40 text-sm">
                  Your password has been reset successfully. Redirecting you to sign in...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </AuthCard>
    </div>
  );
}

// ─── VERIFY EMAIL (exported — wraps with Suspense for useSearchParams) ────────

export function HealthCompanionVerifyEmail() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
