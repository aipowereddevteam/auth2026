"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { authApi } from "../api/auth-api"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema)
  })

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data: any) => {
      // SCENARIO C: MFA CHALLENGE
      if (data.status === 'mfa_required') {
          router.push(`/login/mfa?session_id=${data.mfa_session_id}`);
          return;
      }

      // SCENARIO A: MFA NOT ENABLED (Tokens Issued)
      toast.success("Login Successful")
      router.push("/dashboard")
    },
    onError: (error: any) => {
      toast.error("Login Failed", {
        description: error.response?.data?.message || "Something went wrong"
      })
    }
  })

  const onSubmit = (data: LoginValues) => {
    mutation.mutate(data)
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={mutation.isPending}
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              disabled={mutation.isPending}
              {...form.register("password")}
            />
             {form.formState.errors.password && (
              <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
            )}
          </div>
          <Button disabled={mutation.isPending}>
            {mutation.isPending ? "Signing In..." : "Sign In with Email"}
          </Button>
        </div>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-slate-500">
            Or continue with
          </span>
        </div>
      </div>
      <Button 
        variant="outline" 
        type="button" 
        disabled={mutation.isPending}
        // Use environment variable in real app, hardcoded for now matching axios base
        onClick={() => window.location.href = 'http://localhost:3000/auth/google'}
      >
         Sign in with Google
      </Button>
      <div className="text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="underline hover:text-primary">
            Sign Up
        </Link>
      </div>
    </div>
  )
}
