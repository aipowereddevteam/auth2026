"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/features/auth/api/auth-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const mfaSchema = z.object({
  code: z.string().min(6, "Code must be 6 digits").max(6),
});

type MfaValues = z.infer<typeof mfaSchema>;

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  // 1. Fetch Profile (to check if MFA is already enabled)
  const { data: user, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => (await authApi.getProfile()).data,
  });

  const form = useForm<MfaValues>({
    resolver: zodResolver(mfaSchema),
  });

  // 2. Mutation: Generate QR Code
  const generateMutation = useMutation({
    mutationFn: authApi.generateMfa,
    onSuccess: (data) => {
      setQrCode(data.qrCode);
      setSecret(data.secret);
      toast.info("Scan the QR code with your Authenticator App");
    },
    onError: () => toast.error("Failed to generate MFA secret"),
  });

  // 3. Mutation: Enable MFA
  const enableMutation = useMutation({
    mutationFn: authApi.enableMfa,
    onSuccess: (data) => {
      toast.success("MFA Enabled Successfully!");
      setQrCode(null);
      setSecret(null);
      // @ts-ignore
      setBackupCodes(data.backupCodes); // Save codes to display
      queryClient.invalidateQueries({ queryKey: ["profile"] }); // Refresh profile to show "Enabled" state
    },
    onError: () => toast.error("Invalid Code"),
  });

  // 4. Mutation: Disable MFA
  const disableMutation = useMutation({
    mutationFn: authApi.disableMfa,
    onSuccess: () => {
      toast.success("MFA Disabled");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Failed to disable MFA"),
  });

  const onEnableSubmit = (data: MfaValues) => {
    enableMutation.mutate(data.code);
  };

  if (isLoading) return <div>Loading settings...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold text-slate-900">Account Settings</h1>

      {/* DASHBOARD CARD START */}
      <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold mb-4">Two-Factor Authentication (2FA)</h2>
        
        {/* STATE 4: SHOW BACKUP CODES AFTER SUCCESS */}
        {backupCodes ? (
             <div className="space-y-4">
                 <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
                    <h3 className="font-bold text-amber-800 flex items-center gap-2">
                        <span>⚠️ IMPORTANT: SAVE THESE CODES</span>
                    </h3>
                    <p className="text-sm text-amber-700 mt-1">
                        If you lose your phone, these are the ONLY way to recover your account. 
                        Download or copy them now. They will not be shown again.
                    </p>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-2 bg-slate-100 p-4 rounded font-mono text-sm">
                     {backupCodes.map((code) => (
                         <div key={code} className="bg-white p-2 text-center border rounded">{code}</div>
                     ))}
                 </div>

                 <Button className="w-full" variant="outline" onClick={() => setBackupCodes(null)}>
                     I have saved these codes
                 </Button>
             </div>
        ) : (
            <>
                {/* STATE 1: ALREADY ENABLED */}
                {(user as any)?.isMfaEnabled ? (
                <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-4 rounded-md">
                        <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-6 h-6"
                        >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                        </svg>
                        <span className="font-medium">MFA is currently ENABLED. Your account is secure.</span>
                    </div>

                    <Button 
                        variant="destructive" 
                        onClick={() => disableMutation.mutate()}
                        disabled={disableMutation.isPending}
                    >
                        {disableMutation.isPending ? "Disabling..." : "Disable 2FA"}
                    </Button>
                </div>
                ) : (
                /* STATE 2: NOT ENABLED */
                <div className="space-y-4">
                    <p className="text-slate-600">
                    Add an extra layer of security to your account by enabling 2FA.
                    </p>

                    {!qrCode ? (
                    /* STEP A: REQUEST SETUP */
                    <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
                        {generateMutation.isPending ? "Generating..." : "Setup MFA"}
                    </Button>
                    ) : (
                    /* STEP B: SCAN & VERIFY */
                    <div className="space-y-6 border-t pt-4">
                        <div className="flex flex-col items-center space-y-4">
                            <p className="text-sm font-medium text-slate-700">1. Scan this QR Code with Google Authenticator</p>
                            <img src={qrCode} alt="MFA QR Code" className="border rounded-lg shadow-sm" />
                            <p className="text-xs text-slate-500">Secret: {secret}</p>
                        </div>

                        <div className="max-w-xs mx-auto">
                            <p className="text-sm font-medium text-slate-700 mb-2">2. Enter the 6-digit code</p>
                            <form onSubmit={form.handleSubmit(onEnableSubmit)} className="space-y-3">
                                <Input 
                                    placeholder="123456" 
                                    className="text-center text-lg tracking-widest" 
                                    maxLength={6}
                                    {...form.register("code")} 
                                />
                                {form.formState.errors.code && <p className="text-xs text-red-500">{form.formState.errors.code.message}</p>}
                                
                                <Button className="w-full" disabled={enableMutation.isPending}>
                                    {enableMutation.isPending ? "Verifying..." : "Verify & Enable"}
                                </Button>
                            </form>
                        </div>
                    </div>
                    )}
                </div>
                )}
            </>
        )}
      </div>
    </div>
  );
}
