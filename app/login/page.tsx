"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { authClient } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // login logic here

    const { data, error } = await authClient.signIn.email({
      email: formData.email,
      password: formData.password,
      callbackURL: "/",
    });

    console.log(data, error);
  };

  const handleGoogleLogin = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: process.env.NEXT_PUBLIC_FRONTEND_URL,
      errorCallbackURL: process.env.NEXT_PUBLIC_FRONTEND_URL,
    });
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
              Sign in
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
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
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
                  />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/70 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
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

              <div className="flex justify-center">
                <button
                  type="submit"
                  className="w-2/4 h-[58px] flex items-center justify-center mt-6
                  bg-[#101012] border border-white/75 rounded-[19px]
                  text-[21.5px] font-semibold text-white leading-[34px] tracking-[-0.03em]
                  transition-all duration-200 hover:bg-white/5"
                >
                  Sign in
                </button>
              </div>

              <div className="flex justify-center mt-0">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full h-[58px] flex items-center justify-center mt-6
                  bg-[#101012] border border-white/75 rounded-[19px]
                  text-[21.5px] font-semibold text-white leading-[34px] tracking-[-0.03em]
                  transition-all duration-200 hover:bg-white/5"
                >
                  {/* <Google className="h-5 w-5 mr-2" /> */}
                  Sign in with Google
                </button>
              </div>

              <p className="text-center text-sm text-white/70">
                Don't have an account?{" "}
                <Link href="/signup" className="text-white hover:underline">
                  Sign up
                </Link>
              </p>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
