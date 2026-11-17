/**
 * Utility to format and dispatch customer login credentials directly via mobile SMS application.
 */

export interface CustomerSmsCredentials {
  phone: string;
  customerName?: string;
  tempPassword?: string;
  referenceNumber?: string;
  businessCode?: string;
}

export function openSmsWithCredentials(data: CustomerSmsCredentials): void {
  if (!data.phone || data.phone === '-') {
    if (typeof window !== 'undefined') {
      alert('No mobile phone number available for this customer.');
    }
    return;
  }

  const cleanPhone = data.phone.replace(/[^\d+]/g, '');
  const portalUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/login`
      : 'https://sunsetgroup.com/login';
  const name = data.customerName?.trim() || 'Valued Investor';
  const pass = data.tempPassword || 'Sunset@123';
  const ref = data.referenceNumber ? `Application Ref: ${data.referenceNumber}\n` : '';
  const biz = data.businessCode ? `Division: ${data.businessCode}\n` : '';

  const message =
    `Sunset Group Investor Portal\n` +
    `Dear ${name},\n` +
    `Your portal login credentials:\n` +
    `User ID / Mobile: ${cleanPhone}\n` +
    `Temporary Password: ${pass}\n` +
    `${ref}` +
    `${biz}` +
    `Portal Link: ${portalUrl}\n` +
    `Please log in to review your profile and update your password.`;

  // Standard SMS URI scheme:
  // iOS typically prefers '&body=', Android and other platforms prefer '?body='
  const isIOS =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent || '');
  const separator = isIOS ? '&' : '?';
  const smsUrl = `sms:${cleanPhone}${separator}body=${encodeURIComponent(message)}`;

  // Copy to clipboard as a helpful fallback
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(message).catch(() => {});
  }

  // Open native mobile SMS application
  if (typeof window !== 'undefined') {
    window.location.href = smsUrl;
  }
}
