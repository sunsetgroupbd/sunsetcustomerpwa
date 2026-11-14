'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Icons } from '@/components/ui/Icons';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyOtp } = useAuth();

  const phoneParam = searchParams.get('phone') || '';
  const [phoneNumber, setPhoneNumber] = useState(phoneParam);
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim() || !otpCode.trim()) {
      setError('Please provide phone number and OTP code.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const user = await verifyOtp(phoneNumber.trim(), otpCode.trim());
      if (user.role === 'admin') router.push('/admin/dashboard');
      else if (user.role === 'cr') router.push('/cr/dashboard');
      else router.push('/customer/dashboard');
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!phoneNumber.trim()) {
      setError('Please provide your phone number.');
      return;
    }
    setIsResending(true);
    setError(null);
    try {
      await api.auth.sendOtp(phoneNumber.trim());
      setSuccess('A new verification code has been dispatched to your mobile number.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex flex-col items-center gap-2 mb-4">
          <Icons.Logo className="w-14 h-14 object-contain" />
          <span className="text-xl font-bold tracking-tight text-slate-900">SUNSET GROUP</span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Verify Mobile OTP</h2>
        <p className="mt-1 text-xs text-slate-500">
          Enter the 6-digit authentication code sent to your phone
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card>
          {error && <Alert type="error" className="mb-5">{error}</Alert>}
          {success && <Alert type="success" className="mb-5">{success}</Alert>}

          <form onSubmit={handleVerify} className="space-y-4">
            <Input
              label="Phone Number"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="017XXXXXXXX"
            />

            <Input
              label="6-Digit OTP Code"
              required
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="text-center font-mono text-lg tracking-widest font-bold"
            />

            <div className="pt-2">
              <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
                Verify &amp; Continue
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="font-semibold text-[#006B3E] hover:underline"
            >
              {isResending ? 'Sending...' : 'Resend Code'}
            </button>
            <Link href="/login" className="hover:underline">
              Back to Login
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Loading verification...</div>}>
      <VerifyOtpContent />
    </Suspense>
  );
}

