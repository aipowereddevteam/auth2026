"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/features/auth/api/auth-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Suspense } from "react";

const mfaSchema = z.object({
  code: z.string().min(6).max(6),
});

type MfaValues = z.infer<typeof mfaSchema>;

function MfaLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const form = useForm<MfaValues>({
    resolver: zodResolver(mfaSchema),
  });

  const mutation = useMutation({
    mutationFn: authApi.verifyMfaLogin,
    onSuccess: () => {
      toast.success("Login Successful");
      router.push("/dashboard");
    },
    onError: (error: any) => {
      toast.error("Invalid Code", {
        description: error.response?.data?.message || "Please try again",
      });
    },
  });

  const onSubmit = (data: MfaValues) => {
    if (!sessionId) {
      toast.error("Session missing. Please login again.");
      return router.push("/login");
    }
    mutation.mutate({ 
        mfa_session_id: sessionId, 
        code: data.code 
    });
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded-lg shadow-md border">
        <h1 className="text-2xl font-bold text-center mb-6">Two-Factor Authentication</h1>
        <p className="text-center text-slate-600 mb-6">
            Enter the 6-digit code from your authenticator app or a backup code.
        </p>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Input 
                placeholder="000000" 
                className="text-center text-2xl tracking-[0.5em] h-12" 
                maxLength={6}
                autoFocus
                {...form.register("code")} 
            />
            
            <Button className="w-full" size="lg" disabled={mutation.isPending}>
                {mutation.isPending ? "Verifying..." : "Verify Login"}
            </Button>
        </form>

        <div className="text-center mt-4">
            <button 
                onClick={() => router.push('/login')}
                className="text-sm text-slate-500 hover:text-slate-900 underline"
            >
                Back to Login
            </button>
        </div>
    </div>
  );
}

export default function MfaPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <MfaLoginForm />
        </Suspense>
    )
}
