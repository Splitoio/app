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
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    phoneNumber: "",
    password: "",
    agreeToTerms: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingEmail(true);

    if (!formData.agreeToTerms) {
      toast.error("Please agree to the Privacy & Policy terms");
      setIsLoadingEmail(false);
      return;
    }

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
      setIsLoadingEmail(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoadingGoogle(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: process.env.NEXT_PUBLIC_FRONTEND_URL,
        errorCallbackURL: process.env.NEXT_PUBLIC_FRONTEND_URL,
      });
    } catch (error) {
      toast.error("Failed to sign up with Google. Please try again.");
      setIsLoadingGoogle(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#101012] flex items-center justify-center relative px-4 py-8">
      <div className="absolute -left-1/3 lg:-left-1/4 w-full h-full bg-[url('/final_bgsvg.svg')] bg-no-repeat opacity-50 hidden sm:block" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.5,
          ease: [0.23, 1, 0.32, 1],
        }}
        className="w-full max-w-[440px] sm:px-0"
      >
        {/* Card container only visible on desktop */}
        <div className="hidden sm:block animate-border-light">
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
                <label htmlFor="email-desktop" className="form-label">
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email-desktop"
                    className="form-input !rounded-[19px] !bg-[#0D0D0F] !pl-12"
                    placeholder="name@gmail.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    disabled={isLoadingEmail || isLoadingGoogle}
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="phoneNumber-desktop" className="form-label">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    id="phoneNumber-desktop"
                    className="form-input !rounded-[19px] !bg-[#0D0D0F] !pl-12"
                    placeholder="00000 00000"
                    value={formData.phoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setFormData({ ...formData, phoneNumber: value });
                    }}
                    maxLength={10}
                    required
                    disabled={isLoadingEmail || isLoadingGoogle}
                  />
                  <div className="absolute left-4 top-0 h-full flex items-center text-white/70">
                    +91
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password-desktop" className="form-label">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password-desktop"
                    className="form-input !rounded-[19px] !bg-[#0D0D0F] !pl-12"
                    placeholder="●●●●●●●●"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    disabled={isLoadingEmail || isLoadingGoogle}
                  />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/70 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoadingEmail || isLoadingGoogle}
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
                  id="terms-desktop"
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
                  disabled={isLoadingEmail || isLoadingGoogle}
                />
                <label
                  htmlFor="terms-desktop"
                  className="text-sm text-white/70"
                >
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
                  disabled={isLoadingEmail || isLoadingGoogle}
                >
                  {isLoadingEmail ? (
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
                  disabled={isLoadingEmail || isLoadingGoogle}
                >
                  {isLoadingGoogle ? (
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

        {/* Mobile view - borderless design */}
        <div className="sm:hidden w-full flex flex-col min-h-[calc(100vh-48px)] justify-between">
          <div className="flex flex-col space-y-8 pt-10">
            <div className="flex justify-center">
              <Image
                src="/logo.svg"
                alt="Splito"
                width={120}
                height={48}
                className="w-[100px]"
                priority
              />
            </div>

            <h1 className="text-mobile-xl md:text-2xl font-semibold text-white text-center">
              Create account
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6 pt-2">
              <div className="form-group">
                <label
                  htmlFor="email-mobile"
                  className="text-mobile-sm font-medium text-white/80 mb-2 block"
                >
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email-mobile"
                    className="w-full bg-transparent border-0 border-b border-white/20 px-0 py-2 text-mobile-base text-white focus:ring-0 focus:border-white/40 placeholder-white/30"
                    placeholder="name@gmail.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    disabled={isLoadingEmail || isLoadingGoogle}
                  />
                </div>
              </div>

              <div className="form-group">
                <label
                  htmlFor="phoneNumber-mobile"
                  className="text-mobile-sm font-medium text-white/80 mb-2 block"
                >
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    id="phoneNumber-mobile"
                    className="w-full bg-transparent border-0 border-b border-white/20 pl-8 py-2 text-mobile-base text-white focus:ring-0 focus:border-white/40 placeholder-white/30"
                    placeholder="00000 00000"
                    value={formData.phoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setFormData({ ...formData, phoneNumber: value });
                    }}
                    maxLength={10}
                    required
                    disabled={isLoadingEmail || isLoadingGoogle}
                  />
                  <div className="absolute left-0 top-0 h-full flex items-center text-white/70 text-mobile-sm">
                    +91
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label
                  htmlFor="password-mobile"
                  className="text-mobile-sm font-medium text-white/80 mb-2 block"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password-mobile"
                    className="w-full bg-transparent border-0 border-b border-white/20 px-0 py-2 text-mobile-base text-white focus:ring-0 focus:border-white/40 placeholder-white/30"
                    placeholder="Your password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    disabled={isLoadingEmail || isLoadingGoogle}
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/70 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoadingEmail || isLoadingGoogle}
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
                  className="text-mobile-sm text-green-400 hover:text-green-300 mt-2 inline-block"
                >
                  Forgot Password?
                </Link>
              </div>

              <input
                type="checkbox"
                id="terms-mobile"
                className="sr-only"
                checked={formData.agreeToTerms}
                onChange={(e) =>
                  setFormData({ ...formData, agreeToTerms: e.target.checked })
                }
                required
                disabled={isLoadingEmail || isLoadingGoogle}
              />

              <button
                type="submit"
                className="w-full h-[50px] flex items-center justify-center mt-4
                bg-white rounded-full
                text-mobile-lg font-semibold text-black
                transition-all duration-200 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoadingEmail || isLoadingGoogle}
              >
                {isLoadingEmail ? (
                  <Loader2 className="h-5 w-5 animate-spin text-black" />
                ) : (
                  "Sign up"
                )}
              </button>
            </form>

            <div className="relative flex items-center justify-center">
              <div className="flex-grow border-t border-white/20"></div>
              <span className="mx-4 text-white/50 text-mobile-sm">OR</span>
              <div className="flex-grow border-t border-white/20"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignup}
              className="w-full h-[50px] flex items-center justify-center
              bg-transparent border border-white/20 rounded-full
              text-mobile-lg font-medium text-white
              transition-all duration-200 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoadingEmail || isLoadingGoogle}
            >
              <div className="flex items-center gap-2">
                {isLoadingGoogle ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M19.8055 10.2298C19.8055 9.51795 19.7434 8.83835 19.6299 8.18213H10.2002V11.9624H15.6016C15.3853 13.1709 14.6875 14.1933 13.6543 14.8622V17.311H16.8564C18.7502 15.5938 19.8055 13.1499 19.8055 10.2298Z"
                        fill="#4285F4"
                      />
                      <path
                        d="M10.1999 20.0001C12.8999 20.0001 15.1499 19.115 16.8561 17.3113L13.654 14.8625C12.7754 15.4513 11.6077 15.7968 10.1999 15.7968C7.5938 15.7968 5.38819 14.0732 4.58777 11.7H1.28149V14.2318C2.9752 17.6232 6.3313 20.0001 10.1999 20.0001Z"
                        fill="#34A853"
                      />
                      <path
                        d="M4.58753 11.7002C4.18753 10.4917 4.18753 9.17 4.58753 7.9615V5.42969H1.28126C-0.119933 8.00938 -0.119933 11.6523 1.28126 14.232L4.58753 11.7002Z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M10.1999 4.20378C11.6218 4.18533 12.9998 4.73503 14.0345 5.72847L16.8959 2.8671C15.1044 1.18895 12.6958 0.200905 10.1999 0.229336C6.3313 0.229336 2.9752 2.60621 1.28149 5.99761L4.58777 8.52941C5.38819 6.15621 7.5938 4.43261 10.1999 4.20378Z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </div>
            </button>
          </div>

          <div className="mt-auto pb-10 space-y-6">
            <p className="text-center text-mobile-sm text-white/70">
              Already have an account?{" "}
              <Link href="/login" className="text-white hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
