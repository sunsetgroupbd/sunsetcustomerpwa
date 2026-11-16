'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { CustomerProfileData } from '@/lib/types';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Icons } from '@/components/ui/Icons';

export default function CustomerProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [division, setDivision] = useState('');
  const [postCode, setPostCode] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Initial copy to reset
  const [initialData, setInitialData] = useState<CustomerProfileData | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'customer')) {
      router.push('/login');
      return;
    }

    async function fetchProfile() {
      setIsLoading(true);
      try {
        const res = await api.profile.get();
        setInitialData(res);
        setFullName(res.full_name || '');
        setMobile(res.mobile || (res as any).phone_number || '');
        setEmail(res.email || '');
        if (res.profile) {
          setDateOfBirth(res.profile.date_of_birth || '');
          setGender(res.profile.gender || '');
          setAddress(res.profile.address || '');
          setDistrict(res.profile.district || '');
          setDivision(res.profile.division || '');
          setPostCode(res.profile.post_code || '');
          setEmergencyContact(res.profile.emergency_contact || '');
        }
      } catch (err: any) {
        console.error('Failed to load profile:', err);
        setErrorMsg(err.message || 'Unable to load profile data.');
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      fetchProfile();
    }
  }, [user, authLoading, router]);

  const handleReset = () => {
    if (!initialData) return;
    setFullName(initialData.full_name || '');
    setEmail(initialData.email || '');
    if (initialData.profile) {
      setDateOfBirth(initialData.profile.date_of_birth || '');
      setGender(initialData.profile.gender || '');
      setAddress(initialData.profile.address || '');
      setDistrict(initialData.profile.district || '');
      setDivision(initialData.profile.division || '');
      setPostCode(initialData.profile.post_code || '');
      setEmergencyContact(initialData.profile.emergency_contact || '');
    }
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }

    if (emergencyContact.trim()) {
      const bdPhoneRegex = /^(?:\+?88)?01[3-9]\d{8}$/;
      if (!bdPhoneRegex.test(emergencyContact.trim())) {
        setErrorMsg('Emergency contact must be a valid 11-digit Bangladeshi mobile number.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const updated = await api.profile.update({
        full_name: fullName.trim(),
        email: email.trim() || undefined,
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
        address: address.trim() || null,
        district: district.trim() || null,
        division: division || null,
        post_code: postCode.trim() || null,
        emergency_contact: emergencyContact.trim() || null,
      });

      setInitialData(updated);
      setSuccessMsg('Profile updated successfully! Your investor records have been saved.');
    } catch (err: any) {
      console.error('Update error:', err);
      setErrorMsg(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardShell
      title="Investor Profile"
      subtitle="View and update your personal details and investor records."
      actions={
        <Link href="/customer/dashboard">
          <Button variant="secondary" size="sm" className="flex items-center gap-1.5">
            <Icons.ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Button>
        </Link>
      }
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {successMsg && (
          <Alert type="success" className="animate-in fade-in">
            {successMsg}
          </Alert>
        )}

        {errorMsg && (
          <Alert type="error" className="animate-in fade-in">
            {errorMsg}
          </Alert>
        )}

        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <Icons.Spinner className="w-7 h-7 text-[#008751] mx-auto mb-2" />
            Loading profile information...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Account Overview Header Card */}
            <Card className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#008751] to-[#005a36] text-white flex items-center justify-center text-xl font-bold shadow-md shadow-[#008751]/20">
                    {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{fullName || 'Customer'}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="success">INVESTOR / SHAREHOLDER</Badge>
                      <span className="text-xs text-slate-500 font-mono">
                        ID: #{user?.id || initialData?.id}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-right self-stretch sm:self-auto">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    Account Status
                  </div>
                  <div className="text-xs font-bold text-emerald-700 flex items-center justify-end gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Active &amp; Verified
                  </div>
                </div>
              </div>
            </Card>

            {/* Personal Details Card */}
            <Card
              title="Personal Information"
              subtitle="Essential identity information used for deed and ownership records."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Mobile Phone - LOCKED */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Mobile Phone Number <span className="text-slate-400 font-normal">(Primary Login ID)</span>
                    </label>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      <Icons.Lock className="w-3 h-3 text-slate-400" /> Locked
                    </span>
                  </div>
                  <input
                    type="tel"
                    disabled
                    value={mobile}
                    className="w-full px-3.5 py-2.5 sm:py-2 min-h-[42px] sm:min-h-0 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-sm font-mono cursor-not-allowed select-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Phone number is linked to verified legal records. Contact Sunset CR to change.
                  </p>
                </div>

                {/* Full Name - EDITABLE */}
                <Input
                  label="Full Name"
                  required
                  placeholder="Mohammad Rahman"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  helperText="As it appears on your official National ID or Passport."
                />

                {/* Date of Birth - EDITABLE */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3.5 py-2.5 sm:py-2 min-h-[42px] sm:min-h-0 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#008751]/30 focus:border-[#008751]"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Required for shareholder deed registration.
                  </p>
                </div>

                {/* Gender - EDITABLE */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 sm:py-2 min-h-[42px] sm:min-h-0 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#008751]/30 focus:border-[#008751]"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Email Address - EDITABLE */}
                <Input
                  label="Email Address (Optional)"
                  type="email"
                  placeholder="investor@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  helperText="Used for quarterly ownership dividend and AGM notifications."
                />

                {/* Emergency Contact - EDITABLE */}
                <Input
                  label="Emergency / Alternate Phone (Optional)"
                  type="tel"
                  placeholder="018XXXXXXXX"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  helperText="Alternative contact number for critical shareholder notices."
                />
              </div>
            </Card>

            {/* Address & Residence Details Card */}
            <Card
              title="Address &amp; Location"
              subtitle="Current postal address where official certificates and reports will be dispatched."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Present Street Address"
                    placeholder="House, Road, Area, or Village"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Division
                  </label>
                  <select
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    className="w-full px-3.5 py-2.5 sm:py-2 min-h-[42px] sm:min-h-0 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#008751]/30 focus:border-[#008751]"
                  >
                    <option value="">Select Division</option>
                    <option value="Dhaka">Dhaka</option>
                    <option value="Chittagong">Chittagong</option>
                    <option value="Sylhet">Sylhet</option>
                    <option value="Rajshahi">Rajshahi</option>
                    <option value="Khulna">Khulna</option>
                    <option value="Barisal">Barisal</option>
                    <option value="Rangpur">Rangpur</option>
                    <option value="Mymensingh">Mymensingh</option>
                  </select>
                </div>

                <Input
                  label="District"
                  placeholder="e.g. Dhaka, Cox's Bazar, Patuakhali"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                />

                <Input
                  label="Postal Code"
                  placeholder="e.g. 1212"
                  value={postCode}
                  onChange={(e) => setPostCode(e.target.value)}
                />
              </div>
            </Card>

            {/* Account Sign Out / Security */}
            <Card className="p-4 bg-slate-50 border-slate-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Account Session</h4>
                  <p className="text-[11px] text-slate-500">Sign out of your active session on this mobile device.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="text-rose-600 hover:text-rose-700 hover:border-rose-300 flex items-center gap-1.5"
                >
                  <Icons.LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </Button>
              </div>
            </Card>

            {/* Submit / Reset Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleReset}
                disabled={isSaving}
              >
                Reset Changes
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSaving}
                className="min-w-[140px]"
              >
                Save Profile
              </Button>
            </div>
          </form>
        )}
      </div>
    </DashboardShell>
  );
}
