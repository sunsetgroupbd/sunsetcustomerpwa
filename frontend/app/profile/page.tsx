'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api, getAvatarUrl } from '@/lib/api';
import { CustomerProfileData } from '@/lib/types';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Icons } from '@/components/ui/Icons';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, refreshProfile, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Common User Fields
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');

  // Customer Specific Fields
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [division, setDivision] = useState('');
  const [postCode, setPostCode] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  // Password Change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initial copy to reset
  const [initialCustomerData, setInitialCustomerData] = useState<CustomerProfileData | null>(null);

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'admin' || user.role === 'subadmin') return '/admin/dashboard';
    if (user.role === 'sales') return '/sales/dashboard';
    if (user.role === 'cr') return '/cr/dashboard';
    return '/customer/dashboard';
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    async function loadData() {
      if (!user) return;
      setIsLoading(true);
      setFullName(user.full_name || '');
      setMobile(user.phone_number || (user as any).mobile || '');
      setEmail(user.email || '');

      if (user.role === 'customer') {
        try {
          const res = await api.profile.get();
          setInitialCustomerData(res);
          setFullName(res.full_name || user.full_name || '');
          setMobile(res.mobile || (res as any).phone_number || user.phone_number || '');
          setEmail(res.email || user.email || '');
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
          console.error('Failed to load customer profile details:', err);
        }
      }
      setIsLoading(false);
    }

    if (user) {
      loadData();
    }
  }, [user, authLoading, router]);

  // Handle Avatar Upload
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size exceeds the 5MB limit. Please choose a smaller photo.');
      return;
    }

    // Validate format
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setErrorMsg('Invalid image format. Supported formats: JPG, PNG, WEBP, GIF.');
      return;
    }

    setIsUploadingAvatar(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setAvatarError(false);

    try {
      await api.auth.uploadAvatar(file);
      await refreshProfile();
      setAvatarError(false);
      setSuccessMsg('Profile picture uploaded successfully! It is now displayed across your header and profile.');
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      setErrorMsg(err.message || 'Failed to upload profile picture.');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.auth.removeAvatar();
      await refreshProfile();
      setSuccessMsg('Profile picture removed successfully.');
    } catch (err: any) {
      console.error('Failed to remove avatar:', err);
      setErrorMsg(err.message || 'Failed to remove profile picture.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullName.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }

    setIsSaving(true);
    try {
      if (user?.role === 'customer') {
        if (emergencyContact.trim()) {
          const bdPhoneRegex = /^(?:\+?88)?01[3-9]\d{8}$/;
          if (!bdPhoneRegex.test(emergencyContact.trim())) {
            setErrorMsg('Emergency contact must be a valid 11-digit Bangladeshi mobile number.');
            setIsSaving(false);
            return;
          }
        }

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

        setInitialCustomerData(updated);
        await refreshProfile();
        setSuccessMsg('Profile information updated successfully!');
      } else {
        // Staff Profile (Admin / Subadmin / CR / Sales)
        await api.profile.update({
          full_name: fullName.trim(),
          email: email.trim() || undefined,
        });
        await refreshProfile();
        setSuccessMsg('Account details saved successfully!');
      }
    } catch (err: any) {
      console.error('Update error:', err);
      setErrorMsg(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Please enter your current password.' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New password and confirm password do not match.' });
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.profile.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setPasswordMsg({
        type: 'success',
        text: 'Your password has been changed successfully! Please use your new password next time you sign in.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({
        type: 'error',
        text: err.message || 'Failed to change password. Please check your current password.',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const [avatarError, setAvatarError] = useState(false);
  const avatarUrl = getAvatarUrl(user?.avatar_url || user?.profile_photo_url);

  return (
    <DashboardShell
      title="My Profile & Settings"
      subtitle="Manage your personal details, profile picture, and account credentials."
      actions={
        <Link href={getDashboardLink()}>
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

        {/* Profile Card Header with Optimized Avatar Upload */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            {/* Circular Avatar with Camera Overlay */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-emerald-500/20 bg-slate-100 flex items-center justify-center overflow-hidden shadow-sm">
                {isUploadingAvatar ? (
                  <div className="flex flex-col items-center justify-center">
                    <Icons.Spinner className="w-8 h-8 text-[#008751] animate-spin" />
                    <span className="text-[10px] font-semibold text-slate-500 mt-1">Uploading...</span>
                  </div>
                ) : (avatarUrl && !avatarError) ? (
                  <img
                    src={avatarUrl}
                    alt={user?.full_name || 'Profile'}
                    className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <span className="text-3xl font-black text-slate-400">
                    {(user?.full_name || user?.phone_number || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Hover / Overlay Upload Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute inset-0 rounded-full bg-slate-900/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-50"
                title="Change Profile Photo"
              >
                <Icons.Camera className="w-6 h-6 mb-0.5" />
                <span className="text-[10px] font-bold tracking-tight">Change</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleAvatarSelect}
                className="hidden"
              />
            </div>

            {/* Profile Info & Action Controls */}
            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                    {user?.full_name || 'User Profile'}
                  </h2>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                    <Badge
                      variant={
                        user?.role === 'admin'
                          ? 'purple'
                          : user?.role === 'subadmin'
                          ? 'info'
                          : user?.role === 'sales'
                          ? 'warning'
                          : user?.role === 'cr'
                          ? 'info'
                          : 'success'
                      }
                      className={user?.role === 'subadmin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold' : ''}
                    >
                      {user?.role === 'subadmin' ? 'SUBADMIN' : user?.role === 'sales' ? 'SALES TEAM' : user?.role?.toUpperCase()}
                    </Badge>

                    {user?.customer_id_number && (
                      <span className="font-mono text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                        CUST ID: {user.customer_id_number}
                      </span>
                    )}

                    {user?.employee_id && (
                      <span className="font-mono text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-semibold">
                        EMP ID: {user.employee_id}
                      </span>
                    )}
                  </div>
                </div>

                {/* Upload Photo Buttons */}
                <div className="flex items-center justify-center sm:justify-end gap-2 mt-2 sm:mt-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    isLoading={isUploadingAvatar}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <Icons.Camera className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                  </Button>

                  {user?.avatar_url && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs p-2"
                      title="Remove profile picture"
                    >
                      <Icons.Trash className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
                <div>
                  <span className="text-slate-400">Mobile Phone:</span>{' '}
                  <span className="font-mono font-medium text-slate-900">{user?.phone_number || (user as any)?.mobile}</span>
                </div>
                <div>
                  <span className="text-slate-400">Email:</span>{' '}
                  <span className="font-medium text-slate-900">{user?.email || 'Not provided'}</span>
                </div>
                {user?.designation && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-400">Designation:</span>{' '}
                    <span className="font-medium text-slate-900">{user.designation}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details Edit Form */}
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <Card
            title={user?.role === 'customer' ? 'Personal & Investor Details' : 'Account Information'}
            subtitle={
              user?.role === 'customer'
                ? 'Information provided during registration and verification.'
                : 'Your profile identification across the Sunset Group portal.'
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your Full Name"
              />

              <Input
                label="Mobile Phone"
                disabled
                value={mobile}
                helperText="Primary identifier. Mobile cannot be changed directly."
              />

              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />

              {user?.role === 'customer' && (
                <>
                  <Input
                    label="Date of Birth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#008751]/30 font-medium"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <Input
                    label="Emergency Contact (Mobile)"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="01XXXXXXXXX"
                  />

                  <div className="sm:col-span-2">
                    <Input
                      label="Residential Address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="House, Road, Area, Ward"
                    />
                  </div>

                  <Input
                    label="District"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Dhaka"
                  />

                  <Input
                    label="Division"
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    placeholder="e.g. Dhaka"
                  />

                  <Input
                    label="Postal Code"
                    value={postCode}
                    onChange={(e) => setPostCode(e.target.value)}
                    placeholder="e.g. 1205"
                  />
                </>
              )}
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSaving}
              >
                Save Profile Changes
              </Button>
            </div>
          </Card>
        </form>

        {/* Password Security Section */}
        <Card
          title="Account Security"
          subtitle="Update your sign-in password to keep your account protected."
        >
          {passwordMsg && (
            <Alert type={passwordMsg.type} className="mb-4">
              {passwordMsg.text}
            </Alert>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <Input
              label="Current Password"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />

            <Input
              label="New Password"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
            />

            <Input
              label="Confirm New Password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
            />

            <Button
              type="submit"
              variant="outline"
              size="sm"
              isLoading={isChangingPassword}
            >
              Update Password
            </Button>
          </form>
        </Card>
      </div>
    </DashboardShell>
  );
}
