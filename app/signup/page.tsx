"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { authClient } from "@/lib/auth";
import { toast } from "sonner";
import { ApiError } from "@/types/api-error";

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    phoneNumber: "",
    password: "",
    agreeToTerms: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agreeToTerms) {
      toast.error("Please agree to the Privacy & Policy terms");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await authClient.signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.email,
        callbackURL: "/dashboard",
      });

      if (error) {
        toast.error(error.message || "Failed to sign up. Please try again.");
      } else if (data) {
        toast.success(
          "Account created successfully! Please check your email to verify your account."
        );
        router.push("/login");
      }
    } catch (error) {
      const apiError = error as ApiError;
      const statusCode =
        apiError.response?.status || apiError.status || apiError.code;

      if (statusCode === 409) {
        toast.error(
          "Email already in use. Please use a different email or sign in."
        );
      } else {
        toast.error("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: process.env.NEXT_PUBLIC_FRONTEND_URL,
        errorCallbackURL: process.env.NEXT_PUBLIC_FRONTEND_URL,
      });
    } catch (error) {
      toast.error("Failed to sign up with Google. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#101012] flex items-center justify-center relative">
      <div className="absolute -left-1/3 lg:-left-1/4 w-full h-full bg-[url('/final_bgsvg.svg')] bg-no-repeat opacity-50" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.5,
          ease: [0.23, 1, 0.32, 1],
        }}
        className="w-full max-w-[440px] px-4"
      >
        <div className="animate-border-light">
          <div className="relative rounded-[24px] !bg-[#0f0f10] p-8 space-y-6">
            <div className="flex justify-center mb-6">
              <Image
                src="/logo.svg"
                alt="Splito"
                width={140}
                height={56}
                priority
              />
            </div>

            <h1 className="text-2xl font-semibold text-white text-center">
              Create account
            </h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    className="form-input !rounded-[19px] !bg-[#0D0D0F] !pl-12"
                    placeholder="name@gmail.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    disabled={isLoading}
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="phoneNumber" className="form-label">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    id="phoneNumber"
                    className="form-input !rounded-[19px] !bg-[#0D0D0F] !pl-12"
                    placeholder="00000 00000"
                    value={formData.phoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setFormData({ ...formData, phoneNumber: value });
                    }}
                    maxLength={10}
                    required
                    disabled={isLoading}
                  />
                  <div className="absolute left-4 top-0 h-full flex items-center text-white/70">
                    +91
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    className="form-input !rounded-[19px] !bg-[#0D0D0F] !pl-12"
                    placeholder="●●●●●●●●"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    disabled={isLoading}
                  />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/70 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <Link
                  href="/forgot-password"
                  className="text-sm text-white/50 hover:text-white/70 mt-2 inline-block"
                >
                  Forgot Password?
                </Link>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  id="terms"
                  className="appearance-none rounded-[7px] accent-zinc-700 border border-white/10 w-5 h-5 
                  checked:border-white cursor-pointer relative
                  checked:after:content-['✓'] checked:after:absolute checked:after:left-1/2 
                  checked:after:top-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2
                  checked:after:text-white"
                  checked={formData.agreeToTerms}
                  onChange={(e) =>
                    setFormData({ ...formData, agreeToTerms: e.target.checked })
                  }
                  required
                  disabled={isLoading}
                />
                <label htmlFor="terms" className="text-sm text-white/70">
                  I agree with the{" "}
                  <Link href="/terms" className="text-white hover:underline">
                    Privacy & Policy
                  </Link>
                </label>
              </div>

              <div className="flex justify-center">
                <button
                  type="submit"
                  className="w-2/4 h-[58px] flex items-center justify-center mt-6
                  bg-[#101012] border border-white/75 rounded-[19px]
                  text-[21.5px] font-semibold text-white leading-[34px] tracking-[-0.03em]
                  transition-all duration-200 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Sign up"
                  )}
                </button>
              </div>

              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  onClick={handleGoogleSignup}
                  className="w-full h-[58px] flex items-center justify-center mt-6
                  bg-[#101012] border border-white/75 rounded-[19px]
                  text-[21.5px] font-semibold text-white leading-[34px] tracking-[-0.03em]
                  transition-all duration-200 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Sign up with Google"
                  )}
                </button>
              </div>

              <p className="text-center text-sm text-white/70">
                Already have an account?{" "}
                <Link href="/login" className="text-white hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
