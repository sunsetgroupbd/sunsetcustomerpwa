// Enterprise Naturally Filled (Solid) SVG Icons
import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

export const Icons = {
  // Official Brand Logo
  Logo: ({
    className = 'w-9 h-9',
    alt = 'Sunset Group Logo',
    width = 36,
    height = 36,
    ...props
  }: {
    className?: string;
    alt?: string;
    width?: number;
    height?: number;
    [key: string]: any;
  }) => (
    <img
      src="/Sunset-Group-Logo.png"
      alt={alt}
      width={width}
      height={height}
      className={`object-contain ${className}`}
      {...props}
    />
  ),

  // Naturally Filled (Solid) Icons
  Home: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M11.29 1.71a1 1 0 0 1 1.42 0l9 9a1 1 0 0 1-1.42 1.42L19 10.84V20a2 2 0 0 1-2 2h-3a1 1 0 0 1-1-1v-4h-2v4a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2v-9.16l-1.29 1.29a1 1 0 0 1-1.42-1.42l9-9z" clipRule="evenodd" />
    </svg>
  ),

  Building: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M3 3a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2h2a2 2 0 0 1 2 2v13h2a1 1 0 1 1 0 2H1a1 1 0 1 1 0-2h2V3zm4 3a1 1 0 1 0 0 2h2a1 1 0 1 0 0-2H7zm0 5a1 1 0 1 0 0 2h2a1 1 0 1 0 0-2H7zm0 5a1 1 0 1 0 0 2h2a1 1 0 1 0 0-2H7zm10-7h-2v2h2v-2zm0 4h-2v2h2v-2zm0 4h-2v2h2v-2z" clipRule="evenodd" />
    </svg>
  ),

  // Hospitality & Resort (SKH)
  Hotel: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M3 3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3zm4 3a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H7zm7 0a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2zM7 11a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1H7zm7 0a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-1a1 1 0 0 0-1-1h-2zm-6 4a1 1 0 0 0-1 1v6h10v-6a1 1 0 0 0-1-1H8zm2 2h4v4h-4v-4z" clipRule="evenodd" />
    </svg>
  ),

  // Theme Park / Amusement Park (DFI)
  FerrisWheel: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path d="M12 2v4" />
      <path d="m6.8 15-3.5 2" />
      <path d="m20.7 7-3.5 2" />
      <path d="M6.8 9 3.3 7" />
      <path d="m20.7 17-3.5-2" />
      <path d="m9 22 3-8 3 8" />
      <path d="M8 22h8" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),

  ThemePark: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path d="M12 2v4" />
      <path d="m6.8 15-3.5 2" />
      <path d="m20.7 7-3.5 2" />
      <path d="M6.8 9 3.3 7" />
      <path d="m20.7 17-3.5-2" />
      <path d="m9 22 3-8 3 8" />
      <path d="M8 22h8" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),

  // Healthcare / Hospital & Diagnostic Centre (SCH)
  Hospital: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M4 2a2 2 0 0 0-2 2v18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V4a2 2 0 0 0-2-2H4zm7 3a1 1 0 0 1 2 0v2h2a1 1 0 1 1 0 2h-2v2a1 1 0 1 1-2 0V9H9a1 1 0 0 1 0-2h2V5zm-4 8a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-2zm7 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2zM9 18a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4H9v-4z" clipRule="evenodd" />
    </svg>
  ),

  // Multi-Division Combo / Bundled Portfolio (SPC)
  Layers: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M12 2 2 7l10 5 10-5-10-5zm-8.3 8.8L12 15l8.3-4.2 1.7.9-10 5-10-5 1.7-.9zm0 4.5L12 19.5l8.3-4.2 1.7.9-10 5-10-5 1.7-.9z" clipRule="evenodd" />
    </svg>
  ),

  Combo: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M12 2 2 7l10 5 10-5-10-5zm-8.3 8.8L12 15l8.3-4.2 1.7.9-10 5-10-5 1.7-.9zm0 4.5L12 19.5l8.3-4.2 1.7.9-10 5-10-5 1.7-.9z" clipRule="evenodd" />
    </svg>
  ),

  Shield: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M12 1.5a1 1 0 0 0-.41.09L3.59 5.59A1 1 0 0 0 3 6.5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12v-6a1 1 0 0 0-.59-.91l-8-4A1 1 0 0 0 12 1.5z" clipRule="evenodd" />
    </svg>
  ),

  CheckCircle: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.71 7.71-5.71 5.71a1 1 0 0 1-1.42 0l-2.29-2.29a1 1 0 1 1 1.42-1.42l1.58 1.58 5-5a1 1 0 1 1 1.42 1.42z" clipRule="evenodd" />
    </svg>
  ),

  Clock: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 6a1 1 0 1 0-2 0v4.59l3.71 2.22a1 1 0 1 0 1.02-1.72L13 11.41V8z" clipRule="evenodd" />
    </svg>
  ),

  User: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm-7 18a7 7 0 0 1 14 0H5z" clipRule="evenodd" />
    </svg>
  ),

  Users: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zm-8 4a6 6 0 0 0-6 6h16a6 6 0 0 0-6-6H8zm11.5-6a3 3 0 1 0-2.8-4.05 5.96 5.96 0 0 1 0 8.1 3 3 0 0 0 2.8-4.05zm1.5 7.9c1.8.6 3 2.1 3 4.1h-4.3c.2-.6.3-1.3.3-2 0-.7-.3-1.4-.7-2.1h1.7z" />
    </svg>
  ),

  Briefcase: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M8 2a2 2 0 0 0-2 2v2H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3V4a2 2 0 0 0-2-2H8zm2 2h4v2h-4V4zm-7 6h18v3.5a1 1 0 0 1-1 1h-5v-1a1 1 0 0 0-2 0v1H8a1 1 0 0 1-1-1V10zm0 6.5V18h18v-1.5h-5.5v.5a1 1 0 0 1-2 0v-.5H3z" clipRule="evenodd" />
    </svg>
  ),

  CreditCard: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M2 5a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5zm2 1h16V7H4V6zm0 4v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8H4zm3 4a1 1 0 0 1 1-1h4a1 1 0 1 1 0 2H8a1 1 0 0 1-1-1z" clipRule="evenodd" />
    </svg>
  ),

  FileText: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M4 3a2 2 0 0 1 2-2h8.59a2 2 0 0 1 1.41.59l4.41 4.41a2 2 0 0 1 .59 1.41V21a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V3zm10 0v5h5l-5-5zm-6 8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2H8zm0 4a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2H8zm0 4a1 1 0 1 0 0 2h5a1 1 0 1 0 0-2H8z" clipRule="evenodd" />
    </svg>
  ),

  Edit: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  ),

  Download: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M12 2a1 1 0 0 1 1 1v9.59l2.29-2.3a1 1 0 1 1 1.42 1.42l-4 4a1 1 0 0 1-1.42 0l-4-4a1 1 0 0 1 1.42-1.42L11 12.59V3a1 1 0 0 1 1-1zm-8 15a1 1 0 0 1 1 1v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2a1 1 0 1 1 2 0v2a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-2a1 1 0 0 1 1-1z" clipRule="evenodd" />
    </svg>
  ),

  Upload: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M12 16a1 1 0 0 1-1-1V5.41L8.71 7.71A1 1 0 0 1 7.29 6.29l4-4a1 1 0 0 1 1.42 0l4 4a1 1 0 0 1-1.42 1.42L13 5.41V15a1 1 0 0 1-1 1zm-8 1a1 1 0 0 1 1 1v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2a1 1 0 1 1 2 0v2a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-2a1 1 0 0 1 1-1z" clipRule="evenodd" />
    </svg>
  ),

  AlertCircle: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 6a1 1 0 1 1 2 0v5a1 1 0 1 1-2 0V8zm1 10a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5z" clipRule="evenodd" />
    </svg>
  ),

  AlertTriangle: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M12 2.25c.42 0 .82.22 1.04.59l8.66 15a1.2 1.2 0 0 1-1.04 1.81H2.34a1.2 1.2 0 0 1-1.04-1.81l8.66-15c.22-.37.62-.59 1.04-.59zm-1 6.75a1 1 0 1 1 2 0v4a1 1 0 1 1-2 0V9zm1 8.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5z" clipRule="evenodd" />
    </svg>
  ),

  Star: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M12 1.5l3.09 6.26 6.91 1-5 4.87 1.18 6.88L12 17.27l-6.18 3.24L7 13.63 2 8.76l6.91-1L12 1.5z" />
    </svg>
  ),

  Sparkles: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M9.8 1.2a1 1 0 0 1 1.4 0l1.5 3.3 3.3 1.5a1 1 0 0 1 0 1.4l-3.3 1.5-1.5 3.3a1 1 0 0 1-1.4 0l-1.5-3.3-3.3-1.5a1 1 0 0 1 0-1.4l3.3-1.5 1.5-3.3zm8.4 10.4a.7.7 0 0 1 1 0l1 2.2 2.2 1a.7.7 0 0 1 0 1l-2.2 1-1 2.2a.7.7 0 0 1-1 0l-1-2.2-2.2-1a.7.7 0 0 1 0-1l2.2-1 1-2.2z" />
    </svg>
  ),

  Eye: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M12 4.5C7.3 4.5 3.3 7.5 1.9 12c1.4 4.5 5.4 7.5 10.1 7.5s8.7-3 10.1-7.5C20.7 7.5 16.7 4.5 12 4.5zm0 11.5a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-2.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" clipRule="evenodd" />
    </svg>
  ),

  EyeOff: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M2.7 3.3a1 1 0 0 1 1.4 0l16.6 16.6a1 1 0 1 1-1.4 1.4l-3.3-3.3c-1.3.6-2.6.9-4 .9-4.7 0-8.7-3-10.1-7.5 1-3.2 3.4-5.6 6.4-6.8L3.3 4.7a1 1 0 0 1-.6-1.4zm6.4 6.4l2 2a2 2 0 0 0 2.8 2.8l2 2a4 4 0 0 1-5.6-5.6l-1.2-1.2zm8.7 4.5l-2.6-2.6c.1-.5.2-1 .2-1.6a4 4 0 0 0-4-4c-.6 0-1.1.1-1.6.2L8.2 4.6C9.4 4.2 10.7 4 12 4c4.7 0 8.7 3 10.1 7.5-.9 2.8-2.6 5-4.3 6.2z" clipRule="evenodd" />
    </svg>
  ),

  Lock: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M12 2a4 4 0 0 0-4 4v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4zm-2 7V6a2 2 0 1 1 4 0v3h-4zm2 5a1.5 1.5 0 0 0-1.5 1.5v2a1.5 1.5 0 0 0 3 0v-2A1.5 1.5 0 0 0 12 14z" clipRule="evenodd" />
    </svg>
  ),

  Trash: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M9 3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h4a1 1 0 1 1 0 2h-1v13a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6H3a1 1 0 1 1 0-2h4V3zm2 1h2V4h-2V4zm-3 4v10a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V8H8zm2 2a1 1 0 1 1 2 0v6a1 1 0 1 1-2 0v-6zm4 0a1 1 0 1 1 2 0v6a1 1 0 1 1-2 0v-6z" clipRule="evenodd" />
    </svg>
  ),

  Search: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M10 2a8 8 0 1 0 4.9 14.32l4.39 4.39a1 1 0 0 0 1.42-1.42l-4.39-4.39A8 8 0 0 0 10 2zm-6 8a6 6 0 1 1 12 0 6 6 0 0 1-12 0z" clipRule="evenodd" />
    </svg>
  ),

  Phone: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M2.01 4.27a1.99 1.99 0 0 1 1.76-1.26c1.1-.09 2.22.47 2.8 1.42l1.63 2.65a2 2 0 0 1-.29 2.45l-1.07 1.07a11.05 11.05 0 0 0 5.27 5.27l1.07-1.07a2 2 0 0 1 2.45-.29l2.65 1.63c.95.58 1.51 1.7 1.42 2.8a1.99 1.99 0 0 1-1.26 1.76c-1.39.6-3.03.49-4.82-.32a18.06 18.06 0 0 1-7.85-6.22 18.06 18.06 0 0 1-3.44-8.07c-.4-1.84-.25-3.48.34-4.82z" clipRule="evenodd" />
    </svg>
  ),

  MessageSquare: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M3 4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7.41l-3.7 3.7A1 1 0 0 1 2 21V4a2 2 0 0 1 1-1zm3 4a1 1 0 0 0 0 2h12a1 1 0 1 0 0-2H6zm0 4a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2H6z" clipRule="evenodd" />
    </svg>
  ),

  Mail: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M3 4a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h18a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H3zm0 2h18a1 1 0 0 1 .55.17L12 12.3 2.45 6.17A1 1 0 0 1 3 6zm19 2.38V17a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8.38l9.48 6.16a1 1 0 0 0 1.04 0L22 8.38z" clipRule="evenodd" />
    </svg>
  ),

  Plus: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M12 3a1.5 1.5 0 0 1 1.5 1.5V10.5H19.5a1.5 1.5 0 0 1 0 3H13.5V19.5a1.5 1.5 0 0 1-3 0V13.5H4.5a1.5 1.5 0 0 1 0-3H10.5V4.5A1.5 1.5 0 0 1 12 3z" clipRule="evenodd" />
    </svg>
  ),

  PlusCircle: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 5a1 1 0 1 0-2 0v4H7a1 1 0 1 0 0 2h4v4a1 1 0 1 0 2 0v-4h4a1 1 0 1 0 0-2h-4V7z" clipRule="evenodd" />
    </svg>
  ),

  Check: ({ className = 'w-4 h-4', size = 16, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M19.7 5.3a1 1 0 0 1 0 1.4l-11 11a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.4L8 15.6 18.3 5.3a1 1 0 0 1 1.4 0z" clipRule="evenodd" />
    </svg>
  ),

  Copy: ({ className = 'w-4 h-4', size = 16, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
    </svg>
  ),

  X: ({ className = 'w-4 h-4', size = 16, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M5.3 5.3a1 1 0 0 1 1.4 0L12 10.6l5.3-5.3a1 1 0 1 1 1.4 1.4L13.4 12l5.3 5.3a1 1 0 0 1-1.4 1.4L12 13.4l-5.3 5.3a1 1 0 0 1-1.4-1.4L10.6 12 5.3 6.7a1 1 0 0 1 0-1.4z" clipRule="evenodd" />
    </svg>
  ),

  ChevronDown: ({ className = 'w-4 h-4', size = 16, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M5.3 8.3a1 1 0 0 1 1.4 0L12 13.6l5.3-5.3a1 1 0 1 1 1.4 1.4l-6 6a1 1 0 0 1-1.4 0l-6-6a1 1 0 0 1 0-1.4z" clipRule="evenodd" />
    </svg>
  ),

  ArrowRight: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M12.3 4.3a1 1 0 0 1 1.4 0l6 6a1 1 0 0 1 0 1.4l-6 6a1 1 0 0 1-1.4-1.4L16.6 12H4a1 1 0 1 1 0-2h12.6l-4.3-4.3a1 1 0 0 1 0-1.4z" clipRule="evenodd" />
    </svg>
  ),

  ArrowLeft: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M11.7 4.3a1 1 0 0 0-1.4 0l-6 6a1 1 0 0 0 0 1.4l6 6a1 1 0 0 0 1.4-1.4L7.4 12H20a1 1 0 1 0 0-2H7.4l4.3-4.3a1 1 0 0 0 0-1.4z" clipRule="evenodd" />
    </svg>
  ),

  LogOut: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} {...props}>
      <path fillRule="evenodd" d="M3 4a2 2 0 0 1 2-2h7a1 1 0 1 1 0 2H5v16h7a1 1 0 1 1 0 2H5a2 2 0 0 1-2-2V4zm14.3 4.3a1 1 0 0 1 1.4 0l4 4a1 1 0 0 1 0 1.4l-4 4a1 1 0 0 1-1.4-1.4L18.6 13H10a1 1 0 1 1 0-2h8.6l-1.3-1.3a1 1 0 0 1 0-1.4z" clipRule="evenodd" />
    </svg>
  ),

  Spinner: ({ className = 'w-5 h-5', size = 20, ...props }: IconProps) => (
    <svg width={size} height={size} className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24" {...props}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
    </svg>
  ),

  Refresh: ({ className = 'w-4 h-4', size = 16, ...props }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  ),
};
