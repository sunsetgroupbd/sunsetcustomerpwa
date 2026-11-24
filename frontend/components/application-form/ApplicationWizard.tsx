'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Application, Business, PackagePricing, TermsAndConditions, Nominee } from '@/lib/types';
import { api } from '@/lib/api';
import { numberToWords } from '@/lib/number-to-words';
import { getDivisionPackages, DivisionPackageSpec } from '@/lib/packages';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icons';
import { Modal } from '@/components/ui/Modal';
import { ApplicationReceiptModal } from './ApplicationReceiptModal';

export const getDivisionLogo = (code?: string): string => {
  const c = (code || '').toUpperCase().trim();
  if (c === 'SCH') return '/suncarelogo.png';
  if (c === 'DFI') return '/dfilogo.png';
  if (c === 'SPC') return '/sunsetcombologo.png';
  if (c === 'SKH') return '/sunsetlogo.png';
  return '/sunsetlogo.png';
};

export interface UploadedDocItem {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
}

export const resolveDocUrl = (rawUrl?: string): string => {
  if (!rawUrl) return '';
  if (
    rawUrl.startsWith('http://') ||
    rawUrl.startsWith('https://') ||
    rawUrl.startsWith('blob:') ||
    rawUrl.startsWith('data:')
  ) {
    return rawUrl;
  }
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
  const serverBase = apiBase.replace(/\/api\/v1\/?$/, '');
  const cleanPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  return `${serverBase}${cleanPath}`;
};

export const isImageDoc = (doc?: { mimeType?: string; name?: string; url?: string } | null): boolean => {
  if (!doc) return false;
  if (doc.mimeType && doc.mimeType.startsWith('image/')) return true;
  const target = (doc.name || doc.url || '').toLowerCase();
  return /\.(jpg|jpeg|png|webp|gif|bmp|svg)($|\?)/i.test(target);
};

export const isPdfDoc = (doc?: { mimeType?: string; name?: string; url?: string } | null): boolean => {
  if (!doc) return false;
  if (doc.mimeType && doc.mimeType.includes('pdf')) return true;
  const target = (doc.name || doc.url || '').toLowerCase();
  return /\.pdf($|\?)/i.test(target);
};

export const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface WizardProps {
  business: Business;
  availableBusinesses?: Business[];
  onBusinessChange?: (newBusiness: Business) => void;
  existingApplication?: Application | null;
  onSuccess?: (application: Application) => void;
}

export const ApplicationWizard: React.FC<WizardProps> = ({
  business,
  availableBusinesses,
  onBusinessChange,
  existingApplication,
  onSuccess,
}) => {
  const router = useRouter();
  const [currentBusiness, setCurrentBusiness] = useState<Business>(business);
  const [bizList, setBizList] = useState<Business[]>(availableBusinesses || []);
  const [isChangeBizModalOpen, setIsChangeBizModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [pendingBusiness, setPendingBusiness] = useState<Business | null>(null);
  const [isSwitchingBiz, setIsSwitchingBiz] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(existingApplication?.current_step || 1);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    const initialStep = existingApplication?.current_step || 1;
    for (let i = 1; i <= initialStep; i++) {
      initial.add(i);
    }
    return initial;
  });
  const [applicationId, setApplicationId] = useState<string | null>(existingApplication?.id || null);
  const [referenceNumber, setReferenceNumber] = useState<string>(existingApplication?.reference_number || '');
  const [packages, setPackages] = useState<PackagePricing[]>([]);
  const [terms, setTerms] = useState<TermsAndConditions | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Applicant Info
    ownership_id: existingApplication?.applicant_info?.ownership_id || '',
    application_date: existingApplication?.applicant_info?.application_date || new Date().toISOString().split('T')[0],
    full_name_en: existingApplication?.applicant_info?.full_name_en || '',
    full_name_bn: existingApplication?.applicant_info?.full_name_bn || '',
    father_name: existingApplication?.applicant_info?.father_name || '',
    mother_name: existingApplication?.applicant_info?.mother_name || '',
    spouse_name: existingApplication?.applicant_info?.spouse_name || '',
    present_address: existingApplication?.applicant_info?.present_address || '',
    permanent_address: existingApplication?.applicant_info?.permanent_address || '',
    mobile_number: existingApplication?.applicant_info?.mobile_number || '',
    phone_number: existingApplication?.applicant_info?.phone_number || '',
    date_of_birth: existingApplication?.applicant_info?.date_of_birth || '',
    nationality: existingApplication?.applicant_info?.nationality || 'Bangladeshi',
    religion: existingApplication?.applicant_info?.religion || '',
    nid_or_passport: existingApplication?.applicant_info?.nid_or_passport || (existingApplication?.applicant_info as any)?.nid_number || '',
    tin_number: existingApplication?.applicant_info?.tin_number || '',
    personal_email: existingApplication?.applicant_info?.personal_email || '',

    // Step 2: Profession / Occupation
    company_name: existingApplication?.applicant_info?.company_name || '',
    office_address: existingApplication?.applicant_info?.office_address || '',
    designation: existingApplication?.applicant_info?.designation || '',
    office_phone: existingApplication?.applicant_info?.office_phone || '',

    // Step 3: Nominees
    nominees: existingApplication?.nominees?.length
      ? existingApplication.nominees.map((n: any, idx: number) => ({
          nominee_order: n.nominee_number || n.nominee_order || idx + 1,
          full_name: n.full_name || n.name || '',
          relation: n.relation || n.relationship || '',
          father_or_husband_name: n.father_or_husband_name || '',
          nid_or_passport: n.nid_or_passport || n.nid_number || '',
          cell_number: n.cell_number || n.mobile_number || '',
          date_of_birth: n.date_of_birth || '',
        }))
      : [
          {
            nominee_order: 1,
            full_name: '',
            relation: '',
            father_or_husband_name: '',
            nid_or_passport: '',
            cell_number: '',
            date_of_birth: '',
          },
        ],

    // Step 4: Bank Details
    account_name: existingApplication?.bank_detail?.account_name || '',
    account_number: existingApplication?.bank_detail?.account_number || '',
    bank_name: existingApplication?.bank_detail?.bank_name || '',
    branch_name: existingApplication?.bank_detail?.branch_name || (existingApplication?.bank_detail as any)?.branch || '',

    // Step 5: Ownership & Pricing
    package_type: existingApplication?.ownership_detail?.package_type || (existingApplication?.ownership_detail as any)?.package || '',
    number_of_ownership: existingApplication?.ownership_detail?.number_of_ownership || 1,
    price_per_ownership: existingApplication?.ownership_detail?.price_per_ownership || 0,
    discount_amount: existingApplication?.ownership_detail?.discount_amount || (existingApplication?.ownership_detail as any)?.discount || 0,
    total_price: existingApplication?.ownership_detail?.total_price || 0,
    amount_in_words: existingApplication?.ownership_detail?.amount_in_words || '',

    // Step 6: Payment Information
    token_money: existingApplication?.payment_detail?.token_money || 0,
    booking_money: existingApplication?.payment_detail?.booking_money || 0,
    booking_date: existingApplication?.payment_detail?.booking_date || (existingApplication?.payment_detail as any)?.booking_money_date || '',
    booking_installment_count: existingApplication?.payment_detail?.booking_installment_count || 1,
    booking_installment_amount: existingApplication?.payment_detail?.booking_installment_amount || 0,
    installment_type: existingApplication?.payment_detail?.installment_type || 'monthly',
    number_of_installments: existingApplication?.payment_detail?.number_of_installments || 0,
    installment_amount: existingApplication?.payment_detail?.installment_amount || 0,
    installment_start_date: existingApplication?.payment_detail?.installment_start_date || (existingApplication?.payment_detail as any)?.installment_starting_date || '',
    dues_amount: existingApplication?.payment_detail?.dues_amount || 0,

    // Step 8: Declaration
    declaration_accepted: Boolean(existingApplication?.declaration_accepted),
  });

  // Uploaded documents state (initialized with existing documents if any)
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, UploadedDocItem>>(() => {
    const map: Record<string, UploadedDocItem> = {};
    if (existingApplication?.documents && Array.isArray(existingApplication.documents)) {
      existingApplication.documents.forEach((d: any) => {
        const typeKey = d.document_type || d.doc_type;
        if (typeKey) {
          const rawUrl =
            d.download_url ||
            d.file_path ||
            d.file_url ||
            (d.file_key ? `/api/v1/uploads/${d.file_key}` : '');
          map[typeKey] = {
            id: String(d.id),
            name: d.original_filename || d.file_name || 'Uploaded document',
            url: resolveDocUrl(rawUrl),
            mimeType:
              d.mime_type ||
              (rawUrl.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
            size: d.file_size,
          };
        }
      });
    }
    return map;
  });
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [previewModalDoc, setPreviewModalDoc] = useState<{
    title: string;
    name: string;
    url: string;
    mimeType?: string;
  } | null>(null);

  // Robust document lookup matching direct keys and all known backend aliases
  const getUploadedDoc = (type: string): UploadedDocItem | undefined => {
    if (uploadedDocs[type]) return uploadedDocs[type];
    const aliases: Record<string, string[]> = {
      applicant_photo: ['photograph', 'photo', 'profile_photo'],
      photograph: ['applicant_photo', 'photo', 'profile_photo'],
      nominee_photo: ['nominee_photograph', 'nominee_photo_front'],
      nominee_nid: ['nominee_nid_front', 'nominee_nid_back', 'nominee_passport'],
      nid_front: ['nid', 'national_id', 'passport'],
      nid_back: ['nid_back_side', 'nid_back_page'],
      tin_certificate: ['tin', 'tin_cert', 'e_tin'],
    };
    for (const alt of aliases[type] || []) {
      if (uploadedDocs[alt]) return uploadedDocs[alt];
    }
    return undefined;
  };

  // Sync / refresh documents with signed download URLs from server if applicationId exists
  useEffect(() => {
    if (applicationId) {
      api.applications
        .getDocuments(applicationId)
        .then((docs) => {
          if (Array.isArray(docs) && docs.length > 0) {
            setUploadedDocs((prev) => {
              const next = { ...prev };
              docs.forEach((d: any) => {
                const typeKey = d.document_type || d.doc_type;
                if (typeKey) {
                  const rawUrl =
                    d.download_url ||
                    d.file_path ||
                    d.file_url ||
                    (d.file_key ? `/api/v1/uploads/${d.file_key}` : '');
                  next[typeKey] = {
                    id: String(d.id),
                    name: d.original_filename || d.file_name || 'Uploaded document',
                    url: resolveDocUrl(rawUrl) || prev[typeKey]?.url || '',
                    mimeType:
                      d.mime_type ||
                      prev[typeKey]?.mimeType ||
                      (rawUrl.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
                    size: d.file_size || prev[typeKey]?.size,
                  };
                }
              });
              return next;
            });
          }
        })
        .catch(() => {});
    }
  }, [applicationId]);

  // Re-sync full form state whenever existingApplication is loaded or refreshed
  useEffect(() => {
    if (existingApplication) {
      if (existingApplication.id) {
        setApplicationId(String(existingApplication.id));
      }
      if (existingApplication.reference_number) {
        setReferenceNumber(existingApplication.reference_number);
      }
      if (existingApplication.current_step && existingApplication.current_step > 0) {
        setCurrentStep(existingApplication.current_step);
      }

      setVisitedSteps((prev) => {
        const next = new Set(prev);
        const maxStep = Math.max(existingApplication.current_step || 1, 8);
        for (let i = 1; i <= maxStep; i++) {
          next.add(i);
        }
        return next;
      });

      const appInfo: any = existingApplication.applicant_info || {};
      const bankInfo: any = existingApplication.bank_detail || {};
      const ownInfo: any = existingApplication.ownership_detail || {};
      const payInfo: any = existingApplication.payment_detail || {};

      setFormData((prev) => ({
        ...prev,
        // Step 1: Personal Details
        ownership_id: appInfo.ownership_id || prev.ownership_id || '',
        application_date: appInfo.application_date || prev.application_date || new Date().toISOString().split('T')[0],
        full_name_en: appInfo.full_name_en || prev.full_name_en || '',
        full_name_bn: appInfo.full_name_bn || prev.full_name_bn || '',
        father_name: appInfo.father_name || prev.father_name || '',
        mother_name: appInfo.mother_name || prev.mother_name || '',
        spouse_name: appInfo.spouse_name || prev.spouse_name || '',
        present_address: appInfo.present_address || prev.present_address || '',
        permanent_address: appInfo.permanent_address || prev.permanent_address || '',
        mobile_number: appInfo.mobile_number || prev.mobile_number || '',
        phone_number: appInfo.phone_number || prev.phone_number || '',
        date_of_birth: appInfo.date_of_birth || prev.date_of_birth || '',
        nationality: appInfo.nationality || prev.nationality || 'Bangladeshi',
        religion: appInfo.religion || prev.religion || '',
        nid_or_passport: appInfo.nid_or_passport || (appInfo as any).nid_number || prev.nid_or_passport || '',
        tin_number: appInfo.tin_number || prev.tin_number || '',
        personal_email: appInfo.personal_email || prev.personal_email || '',

        // Step 2: Profession
        company_name: appInfo.company_name || prev.company_name || '',
        office_address: appInfo.office_address || prev.office_address || '',
        designation: appInfo.designation || prev.designation || '',
        office_phone: appInfo.office_phone || prev.office_phone || '',

        // Step 3: Nominees
        nominees: existingApplication.nominees && existingApplication.nominees.length > 0
          ? existingApplication.nominees.map((n: any, idx: number) => ({
              nominee_order: n.nominee_number || n.nominee_order || idx + 1,
              full_name: n.full_name || n.name || '',
              relation: n.relation || n.relationship || '',
              father_or_husband_name: n.father_or_husband_name || '',
              nid_or_passport: n.nid_or_passport || n.nid_number || '',
              cell_number: n.cell_number || n.mobile_number || '',
              date_of_birth: n.date_of_birth || '',
            }))
          : prev.nominees,

        // Step 4: Bank Details
        account_name: bankInfo.account_name || prev.account_name || '',
        account_number: bankInfo.account_number || prev.account_number || '',
        bank_name: bankInfo.bank_name || prev.bank_name || '',
        branch_name: bankInfo.branch_name || (bankInfo as any).branch || prev.branch_name || '',

        // Step 5: Ownership
        package_type: ownInfo.package_type || (ownInfo as any).package || prev.package_type || '',
        number_of_ownership: ownInfo.number_of_ownership ?? prev.number_of_ownership ?? 1,
        price_per_ownership: ownInfo.price_per_ownership ?? prev.price_per_ownership ?? 0,
        discount_amount: ownInfo.discount_amount ?? (ownInfo as any).discount ?? prev.discount_amount ?? 0,
        total_price: ownInfo.total_price ?? prev.total_price ?? 0,
        amount_in_words: ownInfo.amount_in_words || prev.amount_in_words || '',

        // Step 6: Payment Info
        token_money: payInfo.token_money ?? prev.token_money ?? 0,
        booking_money: payInfo.booking_money ?? prev.booking_money ?? 0,
        booking_date: payInfo.booking_date || (payInfo as any).booking_money_date || prev.booking_date || '',
        booking_installment_count: payInfo.booking_installment_count ?? prev.booking_installment_count ?? 1,
        booking_installment_amount: payInfo.booking_installment_amount ?? prev.booking_installment_amount ?? 0,
        installment_type: payInfo.installment_type || prev.installment_type || 'monthly',
        number_of_installments: payInfo.number_of_installments ?? prev.number_of_installments ?? 0,
        installment_amount: payInfo.installment_amount ?? prev.installment_amount ?? 0,
        installment_start_date: payInfo.installment_start_date || (payInfo as any).installment_starting_date || prev.installment_start_date || '',
        dues_amount: payInfo.dues_amount ?? prev.dues_amount ?? 0,

        // Step 8: Declaration
        declaration_accepted: Boolean(existingApplication.declaration_accepted),
      }));

      // Initialize documents if attached to existing application
      if (existingApplication.documents && Array.isArray(existingApplication.documents)) {
        setUploadedDocs((prev) => {
          const next = { ...prev };
          existingApplication.documents.forEach((d: any) => {
            const typeKey = d.document_type || d.doc_type;
            if (typeKey) {
              const rawUrl =
                d.download_url ||
                d.file_path ||
                d.file_url ||
                (d.file_key ? `/api/v1/uploads/${d.file_key}` : '');
              next[typeKey] = {
                id: String(d.id),
                name: d.original_filename || d.file_name || 'Uploaded document',
                url: resolveDocUrl(rawUrl) || prev[typeKey]?.url || '',
                mimeType:
                  d.mime_type ||
                  prev[typeKey]?.mimeType ||
                  (rawUrl.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
                size: d.file_size || prev[typeKey]?.size,
              };
            }
          });
          return next;
        });
      }
    }
  }, [existingApplication]);

  // Sync currentBusiness if prop changes
  useEffect(() => {
    if (business && business.id !== currentBusiness.id) {
      setCurrentBusiness(business);
    }
  }, [business]);

  // Load available divisions if not passed via props
  useEffect(() => {
    if (!availableBusinesses || availableBusinesses.length === 0) {
      api.businesses
        .list()
        .then((data) => {
          const list = Array.isArray(data) ? data : ((data as any)?.items || (data as any)?.data || []);
          if (list.length > 0) {
            setBizList(list);
          }
        })
        .catch(() => {
          setBizList([
            { id: '1', code: 'SKH', name: 'Sunset Kuakata Hotel & Resort', slug: 'sunset-kuakata', description: 'Luxury seaside hospitality suites & beachfront ownership at Kuakata Beach.', logo_url: null, is_active: true },
            { id: '2', code: 'DFI', name: 'Dhaka Fantasy Island', slug: 'dhaka-fantasy-island', description: 'Premier amusement theme park & family entertainment resort in Dhaka.', logo_url: null, is_active: true },
            { id: '3', code: 'SCH', name: 'Sun Care Hospital & Diagnostic Centre', slug: 'sun-care-hospital', description: 'State-of-the-art multi-specialty healthcare, pathology, and diagnostic services.', logo_url: null, is_active: true },
            { id: '4', code: 'SPC', name: 'Super Combo', slug: 'super-combo', description: 'Integrated multi-division commercial privileges and shared ownership bundle.', logo_url: null, is_active: true },
          ]);
        });
    } else {
      setBizList(availableBusinesses);
    }
  }, [availableBusinesses]);

  // Fetch package pricing and terms for this business
  useEffect(() => {
    async function loadConfig() {
      try {
        const [pkgData, termsData] = await Promise.all([
          api.businesses.getPackages(currentBusiness.id).catch(() => []),
          api.businesses.getTerms(currentBusiness.id).catch(() => null),
        ]);
        if (pkgData && pkgData.length > 0) {
          setPackages(pkgData);
        }
        if (termsData) {
          setTerms(termsData);
        }
      } catch (e) {
        console.error('Failed to load business packages or terms', e);
      }
    }
    loadConfig();
  }, [currentBusiness.id, existingApplication]);

  // Handler to switch division from any step/page of the form
  const handleSwitchDivision = async (newBiz: Business, preserveInfo: boolean = true) => {
    if (newBiz.id === currentBusiness.id) {
      setIsChangeBizModalOpen(false);
      setPendingBusiness(null);
      return;
    }

    setIsSwitchingBiz(true);
    try {
      const [pkgData, termsData] = await Promise.all([
        api.businesses.getPackages(newBiz.id).catch(() => []),
        api.businesses.getTerms(newBiz.id).catch(() => null),
      ]);

      const validPackages = Array.isArray(pkgData) ? pkgData : [];
      setPackages(validPackages);
      setTerms(termsData || null);

      const firstPkg = validPackages[0];
      const newPricePerUnit = firstPkg ? firstPkg.base_price : 500000;
      const newPkgType = firstPkg ? firstPkg.package_type : 'Standard';

      if (preserveInfo) {
        // Keep all entered personal information, addresses, occupation, nominees, bank details
        const qty = formData.number_of_ownership || 1;
        const discount = formData.discount_amount || 0;
        const total = Math.max(0, qty * newPricePerUnit - discount);
        const words = numberToWords(total);
        const dues = Math.max(0, total - (formData.token_money + formData.booking_money));
        const instAmt = formData.number_of_installments > 0 ? Math.round(dues / formData.number_of_installments) : 0;

        setFormData((prev) => ({
          ...prev,
          package_type: newPkgType,
          price_per_ownership: newPricePerUnit,
          total_price: total,
          amount_in_words: words,
          dues_amount: dues,
          installment_amount: instAmt,
          declaration_accepted: false,
        }));
      } else {
        // Full reset to fresh blank form
        setFormData({
          ownership_id: '',
          application_date: new Date().toISOString().split('T')[0],
          full_name_en: '',
          full_name_bn: '',
          father_name: '',
          mother_name: '',
          spouse_name: '',
          present_address: '',
          permanent_address: '',
          mobile_number: '',
          phone_number: '',
          date_of_birth: '',
          nationality: 'Bangladeshi',
          religion: '',
          nid_or_passport: '',
          tin_number: '',
          personal_email: '',
          company_name: '',
          office_address: '',
          designation: '',
          office_phone: '',
          nominees: [
            {
              nominee_order: 1,
              full_name: '',
              relation: '',
              father_or_husband_name: '',
              nid_or_passport: '',
              cell_number: '',
              date_of_birth: '',
            },
          ],
          account_name: '',
          account_number: '',
          bank_name: '',
          branch_name: '',
          package_type: '',
          number_of_ownership: 1,
          price_per_ownership: 0,
          discount_amount: 0,
          total_price: 0,
          amount_in_words: '',
          token_money: 0,
          booking_money: 0,
          booking_date: '',
          booking_installment_count: 1,
          booking_installment_amount: 0,
          installment_type: '',
          number_of_installments: 0,
          installment_amount: 0,
          installment_start_date: '',
          dues_amount: 0,
          declaration_accepted: false,
        });
      }

      setCurrentBusiness(newBiz);
      if (onBusinessChange) {
        onBusinessChange(newBiz);
      }

      if (applicationId) {
        api.applications
          .updateDraft(applicationId, {
            business_id: Number(newBiz.id),
          } as any)
          .catch((err) => console.warn('Could not update backend business_id immediately', err));
      }

      // Return to Step 1 (Start No. 1 Step) as requested
      setCurrentStep(1);
      setVisitedSteps(new Set([1]));
      setErrors({});
      setStatusMessage({
        type: 'success',
        text: `Division switched to ${newBiz.name}. ${
          preserveInfo
            ? 'Applicant personal information has been preserved! Please review starting from Step 1.'
            : 'Form reset to Step 1 for the new division.'
        }`,
      });
      setIsChangeBizModalOpen(false);
      setPendingBusiness(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to switch division packages.',
      });
    } finally {
      setIsSwitchingBiz(false);
    }
  };

  // Recalculate Total Price and Words whenever package/qty/discount changes
  const updatePricing = (
    pkgType: string,
    qty: number,
    discount: number,
    pricePerUnit: number,
    suggestedBookingMoney?: number
  ) => {
    const total = Math.max(0, qty * pricePerUnit - discount);
    const words = numberToWords(total);
    const booking = suggestedBookingMoney !== undefined ? suggestedBookingMoney : formData.booking_money;
    const effectiveBooking = Math.max(booking, formData.token_money || 0);
    const dues = Math.max(0, total - effectiveBooking);
    const instAmt = formData.number_of_installments > 0 ? Math.round(dues / formData.number_of_installments) : 0;

    setFormData((prev) => ({
      ...prev,
      package_type: pkgType,
      number_of_ownership: qty,
      price_per_ownership: pricePerUnit,
      discount_amount: discount,
      booking_money: booking,
      booking_installment_count: 1,
      booking_installment_amount: 0,
      total_price: total,
      amount_in_words: words,
      dues_amount: dues,
      installment_amount: instAmt,
    }));
  };

  // Step names
  const steps = [
    { number: 1, title: 'Applicant Info', icon: Icons.User },
    { number: 2, title: 'Profession', icon: Icons.Briefcase },
    { number: 3, title: 'Nominees', icon: Icons.Users },
    { number: 4, title: 'Bank Details', icon: Icons.CreditCard },
    { number: 5, title: 'Ownership & Price', icon: Icons.Building },
    { number: 6, title: 'Payment Plan', icon: Icons.Clock },
    { number: 7, title: 'Documents', icon: Icons.Upload },
    { number: 8, title: 'Review & Terms', icon: Icons.FileText },
    { number: 9, title: 'Confirmation', icon: Icons.CheckCircle },
  ];

  // Check if a specific step has all required information filled
  const isStepComplete = (stepNum: number): boolean => {
    if (stepNum === 1) {
      return Boolean(
        formData.full_name_en?.trim() &&
        formData.full_name_bn?.trim() &&
        formData.father_name?.trim() &&
        formData.mother_name?.trim() &&
        formData.mobile_number?.trim() &&
        formData.date_of_birth &&
        formData.religion?.trim() &&
        formData.nid_or_passport?.trim() &&
        formData.present_address?.trim() &&
        formData.permanent_address?.trim()
      );
    }
    if (stepNum === 2) {
      return Boolean(formData.designation?.trim());
    }
    if (stepNum === 3) {
      const nom1 = formData.nominees?.[0];
      return Boolean(
        nom1 &&
        nom1.full_name?.trim() &&
        nom1.relation?.trim() &&
        nom1.cell_number?.trim() &&
        nom1.nid_or_passport?.trim()
      );
    }
    if (stepNum === 4) {
      return Boolean(
        formData.account_name?.trim() &&
        formData.account_number?.trim() &&
        formData.bank_name?.trim() &&
        formData.branch_name?.trim()
      );
    }
    if (stepNum === 5) {
      return Boolean(
        formData.package_type &&
        formData.package_type.trim() !== '' &&
        Number(formData.total_price) > 0
      );
    }
    if (stepNum === 6) {
      return Boolean(
        formData.installment_type &&
        formData.installment_type.trim() !== '' &&
        formData.booking_date &&
        formData.booking_date.trim() !== '' &&
        Number(formData.number_of_installments) > 0
      );
    }
    if (stepNum === 7) {
      // Must have uploaded at least one document
      return Boolean(Object.keys(uploadedDocs).length > 0);
    }
    if (stepNum === 8) {
      return Boolean(formData.declaration_accepted);
    }
    if (stepNum === 9) {
      // Confirmation is only complete if application was actually submitted
      return Boolean(
        (currentStep === 9 && referenceNumber) ||
        (existingApplication && existingApplication.status !== 'draft')
      );
    }
    return false;
  };

  // Validation
  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};

    if (step === 1) {
      if (!formData.full_name_en.trim()) errs.full_name_en = 'Full name (English) is required';
      if (!formData.full_name_bn.trim()) errs.full_name_bn = 'Full name (Bangla) is required';
      if (!formData.father_name.trim()) errs.father_name = "Father's name is required";
      if (!formData.mother_name.trim()) errs.mother_name = "Mother's name is required";
      if (!formData.mobile_number.trim()) errs.mobile_number = 'Mobile number is required';
      if (!formData.date_of_birth) errs.date_of_birth = 'Date of birth is required';
      if (!formData.religion.trim()) errs.religion = 'Religion is required';
      if (!formData.nid_or_passport.trim()) errs.nid_or_passport = 'NID or Passport number is required';
      if (!formData.present_address.trim()) errs.present_address = 'Present address is required';
      if (!formData.permanent_address.trim()) errs.permanent_address = 'Permanent address is required';
    } else if (step === 2) {
      if (!formData.designation?.trim()) errs.designation = 'Designation is required';
    } else if (step === 3) {
      const nom1 = formData.nominees[0];
      if (!nom1 || !nom1.full_name.trim()) errs.nominee_1_name = "Primary nominee's name is required";
      if (!nom1 || !nom1.relation.trim()) errs.nominee_1_relation = 'Relation is required';
      if (!nom1 || !nom1.cell_number.trim()) errs.nominee_1_phone = 'Cell number is required';
      if (!nom1 || !nom1.nid_or_passport.trim()) errs.nominee_1_nid = 'NID/Passport is required';
    } else if (step === 4) {
      if (!formData.account_name.trim()) errs.account_name = 'Account name is required';
      if (!formData.account_number.trim()) errs.account_number = 'Account number is required';
      if (!formData.bank_name.trim()) errs.bank_name = 'Bank name is required';
      if (!formData.branch_name.trim()) errs.branch_name = 'Branch name is required';
    } else if (step === 5) {
      if (!formData.package_type || !formData.package_type.trim() || formData.total_price <= 0) {
        errs.package_type = 'Please select an ownership package.';
      }
    } else if (step === 6) {
      if (!formData.installment_type || !formData.installment_type.trim()) {
        errs.installment_type = 'Please select an installment frequency.';
      }
      if (!formData.booking_date) {
        errs.booking_date = 'Booking money date is required.';
      }
      if (!formData.number_of_installments || formData.number_of_installments <= 0) {
        errs.number_of_installments = 'Number of installments must be at least 1.';
      }
    } else if (step === 7) {
      if (Object.keys(uploadedDocs).length === 0) {
        errs.documents = 'Please upload at least one required document.';
      }
    } else if (step === 8) {
      if (!formData.declaration_accepted) {
        errs.declaration = 'You must accept the terms and conditions and declaration to submit.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Comprehensive completeness check across all steps before final submission
  const validateAllBeforeSubmit = (): boolean => {
    const missing: string[] = [];
    const newErrors: Record<string, string> = {};
    let firstMissingStep: number | null = null;

    // Step 1: Personal Details
    if (!formData.full_name_en.trim()) {
      missing.push('Full Name (English)');
      newErrors.full_name_en = 'Full Name (English) is required';
      if (!firstMissingStep) firstMissingStep = 1;
    }
    if (!formData.full_name_bn.trim()) {
      missing.push('Full Name (Bangla)');
      newErrors.full_name_bn = 'Full Name (Bangla) is required';
      if (!firstMissingStep) firstMissingStep = 1;
    }
    if (!formData.father_name.trim()) {
      missing.push("Father's Name");
      newErrors.father_name = "Father's Name is required";
      if (!firstMissingStep) firstMissingStep = 1;
    }
    if (!formData.mother_name.trim()) {
      missing.push("Mother's Name");
      newErrors.mother_name = "Mother's Name is required";
      if (!firstMissingStep) firstMissingStep = 1;
    }
    if (!formData.mobile_number.trim()) {
      missing.push('Mobile Number');
      newErrors.mobile_number = 'Mobile Number is required';
      if (!firstMissingStep) firstMissingStep = 1;
    }
    if (!formData.date_of_birth) {
      missing.push('Date of Birth');
      newErrors.date_of_birth = 'Date of Birth is required';
      if (!firstMissingStep) firstMissingStep = 1;
    }
    if (!formData.nationality.trim()) {
      missing.push('Nationality');
      newErrors.nationality = 'Nationality is required';
      if (!firstMissingStep) firstMissingStep = 1;
    }
    if (!formData.religion.trim()) {
      missing.push('Religion');
      newErrors.religion = 'Religion is required';
      if (!firstMissingStep) firstMissingStep = 1;
    }
    if (!formData.nid_or_passport.trim()) {
      missing.push('NID or Passport Number');
      newErrors.nid_or_passport = 'NID or Passport Number is required';
      if (!firstMissingStep) firstMissingStep = 1;
    }
    if (!formData.present_address.trim()) {
      missing.push('Present Address');
      newErrors.present_address = 'Present Address is required';
      if (!firstMissingStep) firstMissingStep = 1;
    }
    if (!formData.permanent_address.trim()) {
      missing.push('Permanent Address');
      newErrors.permanent_address = 'Permanent Address is required';
      if (!firstMissingStep) firstMissingStep = 1;
    }

    // Step 2: Profession (company_name and office_address are explicitly OPTIONAL)
    if (!formData.designation.trim()) {
      missing.push('Designation');
      newErrors.designation = 'Designation is required';
      if (!firstMissingStep) firstMissingStep = 2;
    }

    // Step 3: Nominees
    const nom1 = formData.nominees?.[0];
    if (!nom1 || !nom1.full_name?.trim()) {
      missing.push('Primary Nominee Name');
      newErrors.nominee_1_name = 'Primary Nominee Name is required';
      if (!firstMissingStep) firstMissingStep = 3;
    }
    if (!nom1 || !nom1.relation?.trim()) {
      missing.push('Nominee Relationship');
      newErrors.nominee_1_relation = 'Nominee Relationship is required';
      if (!firstMissingStep) firstMissingStep = 3;
    }
    if (!nom1 || !nom1.cell_number?.trim()) {
      missing.push('Nominee Cell Number');
      newErrors.nominee_1_phone = 'Nominee Cell Number is required';
      if (!firstMissingStep) firstMissingStep = 3;
    }
    if (!nom1 || !nom1.nid_or_passport?.trim()) {
      missing.push('Nominee NID / Passport');
      newErrors.nominee_1_nid = 'Nominee NID / Passport is required';
      if (!firstMissingStep) firstMissingStep = 3;
    }

    // Step 4: Bank Details
    if (!formData.account_name.trim()) {
      missing.push('Bank Account Name');
      newErrors.account_name = 'Bank Account Name is required';
      if (!firstMissingStep) firstMissingStep = 4;
    }
    if (!formData.account_number.trim()) {
      missing.push('Bank Account Number');
      newErrors.account_number = 'Bank Account Number is required';
      if (!firstMissingStep) firstMissingStep = 4;
    }
    if (!formData.bank_name.trim()) {
      missing.push('Bank Name');
      newErrors.bank_name = 'Bank Name is required';
      if (!firstMissingStep) firstMissingStep = 4;
    }
    if (!formData.branch_name.trim()) {
      missing.push('Bank Branch');
      newErrors.branch_name = 'Bank Branch is required';
      if (!firstMissingStep) firstMissingStep = 4;
    }

    // Step 5: Ownership
    if (!formData.package_type || !formData.package_type.trim() || formData.total_price <= 0) {
      missing.push('Ownership Package');
      if (!firstMissingStep) firstMissingStep = 5;
    }

    // Step 6: Payment Plan
    if (!formData.installment_type || !formData.installment_type.trim() || !formData.booking_date || formData.number_of_installments <= 0) {
      missing.push('Payment Plan & Installments');
      if (!firstMissingStep) firstMissingStep = 6;
    }

    // Step 7: Documents
    if (Object.keys(uploadedDocs).length === 0) {
      missing.push('At least one uploaded document');
      if (!firstMissingStep) firstMissingStep = 7;
    }

    // Step 8: Declaration
    if (!formData.declaration_accepted) {
      missing.push('Terms & Declaration acceptance');
      newErrors.declaration = 'You must accept the terms declaration before submission.';
      if (!firstMissingStep) firstMissingStep = 8;
    }

    setErrors(newErrors);

    if (missing.length > 0) {
      setStatusMessage({
        type: 'error',
        text: `Cannot submit incomplete application. All fields must be filled except Personal Email, TIN, Company Name, and Office Address. Missing: ${missing.join(', ')}`,
      });
      if (firstMissingStep) {
        setCurrentStep(firstMissingStep);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return false;
    }
    return true;
  };

  // Save draft to backend
  const handleSaveDraft = async (silent = false) => {
    setIsSavingDraft(true);
    if (!silent) setStatusMessage(null);
    try {
      const cleanDate = (val?: string | null) => (val && val.trim() ? val.trim() : null);

      const payload = {
        business_id: Number(currentBusiness?.id) || 1,
        current_step: currentStep,
        applicant_info: {
          ownership_id: formData.ownership_id || null,
          application_date: formData.application_date || null,
          full_name_en: formData.full_name_en || null,
          full_name_bn: formData.full_name_bn || null,
          father_name: formData.father_name || null,
          mother_name: formData.mother_name || null,
          spouse_name: formData.spouse_name || null,
          present_address: formData.present_address || null,
          permanent_address: formData.permanent_address || null,
          mobile_number: formData.mobile_number || null,
          phone_number: formData.phone_number || null,
          date_of_birth: cleanDate(formData.date_of_birth),
          nationality: formData.nationality || 'Bangladeshi',
          religion: formData.religion || null,
          nid_or_passport: formData.nid_or_passport || null,
          nid_number: formData.nid_or_passport || null,
          tin_number: formData.tin_number || null,
          personal_email: formData.personal_email || null,
          company_name: formData.company_name || null,
          office_address: formData.office_address || null,
          designation: formData.designation || null,
          cell_number: formData.mobile_number || null,
          office_phone: formData.office_phone || null,
        },
        nominees: (formData.nominees || []).map((nom: any, idx: number) => ({
          nominee_number: idx + 1,
          nominee_order: idx + 1,
          name: nom.full_name || nom.name || '',
          full_name: nom.full_name || nom.name || '',
          relationship: nom.relation || nom.relationship || '',
          relation: nom.relation || nom.relationship || '',
          father_or_husband_name: nom.father_or_husband_name || '',
          nid_or_passport: nom.nid_or_passport || '',
          cell_number: nom.cell_number || '',
          date_of_birth: cleanDate(nom.date_of_birth),
        })),
        bank_detail: {
          account_name: formData.account_name || null,
          account_number: formData.account_number || null,
          bank_name: formData.bank_name || null,
          branch: formData.branch_name || null,
          branch_name: formData.branch_name || null,
        },
        ownership_detail: {
          package: formData.package_type || null,
          package_type: formData.package_type || null,
          number_of_ownership: Number(formData.number_of_ownership) || 1,
          price_per_ownership: Number(formData.price_per_ownership) || 0,
          discount: Number(formData.discount_amount) || 0,
          discount_amount: Number(formData.discount_amount) || 0,
          total_price: Number(formData.total_price) || 0,
          amount_in_words: formData.amount_in_words || null,
        },
        payment_detail: {
          token_money: Number(formData.token_money) || 0,
          booking_money: Number(formData.booking_money) || 0,
          booking_date: cleanDate(formData.booking_date),
          booking_money_date: cleanDate(formData.booking_date),
          booking_installment_count: Number(formData.booking_installment_count) || 1,
          booking_installment_amount: Number(formData.booking_installment_amount) || 0,
          installment_type: formData.installment_type || null,
          number_of_installments: Number(formData.number_of_installments) || 0,
          installment_amount: Number(formData.installment_amount) || 0,
          installment_start_date: cleanDate(formData.installment_start_date),
          installment_starting_date: cleanDate(formData.installment_start_date),
          dues_amount: Number(formData.dues_amount) || 0,
        },
        declaration_accepted: Boolean(formData.declaration_accepted),
      };

      let result: Application;
      if (applicationId) {
        result = await api.applications.updateDraft(applicationId, payload as any);
      } else {
        result = await api.applications.createDraft(payload as any);
        if (result && result.id) {
          setApplicationId(String(result.id));
        }
      }
      const refNum = result?.reference_number || (result as any)?.application_number || '';
      if (refNum) {
        setReferenceNumber(refNum);
      }
      if (!silent) {
        setStatusMessage({ type: 'success', text: `Draft saved successfully (Ref: ${refNum || result?.id || 'Saved'})` });
      }
      return result;
    } catch (err: any) {
      if (!silent) {
        setStatusMessage({ type: 'error', text: err.message || 'Failed to save draft' });
      }
      return null;
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleNext = async () => {
    // Clear errors when navigating so next step is unblocked
    setErrors({});
    setStatusMessage(null);

    // Auto-save draft in the background silently
    handleSaveDraft(true).catch(() => {});

    setVisitedSteps((prev) => {
      const next = new Set(prev);
      for (let i = 1; i <= currentStep + 1; i++) {
        next.add(i);
      }
      return next;
    });

    setCurrentStep((prev) => Math.min(prev + 1, 9));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrev = () => {
    setErrors({});
    setStatusMessage(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToStep = (stepNumber: number) => {
    if (stepNumber < 1 || stepNumber > 8) return;
    setErrors({});
    setStatusMessage(null);
    handleSaveDraft(true).catch(() => {});

    // Mark steps up to current and target step as visited so incomplete steps are flagged
    setVisitedSteps((prev) => {
      const next = new Set(prev);
      const maxStep = Math.max(currentStep, stepNumber);
      for (let i = 1; i <= maxStep; i++) {
        next.add(i);
      }
      return next;
    });

    setCurrentStep(stepNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit Application
  const handleSubmit = async () => {
    if (!validateAllBeforeSubmit()) return;
    if (!applicationId) {
      setStatusMessage({ type: 'error', text: 'Application draft not found. Please click Save Draft first.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      // First, ensure all current form state and declaration acceptance are saved to draft
      await handleSaveDraft(true);
      const submitted = await api.applications.submit(
        applicationId,
        Boolean(formData.declaration_accepted)
      );
      const newRef = submitted?.reference_number || (submitted as any)?.application_number || (submitted as any)?.data?.reference_number;
      if (newRef) {
        setReferenceNumber(newRef);
      }
      setCurrentStep(9);
      if (onSuccess) onSuccess(submitted);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to submit application' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // File Upload Handler
  const handleFileUpload = async (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create immediate local object URL for instant visual preview
    const localBlobUrl = URL.createObjectURL(file);
    const mimeType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

    // Optimistically update uploadedDocs so applicant immediately sees preview & filename
    setUploadedDocs((prev) => ({
      ...prev,
      [docType]: {
        id: prev[docType]?.id || 'uploading',
        name: file.name,
        url: localBlobUrl,
        mimeType: mimeType,
        size: file.size,
      },
    }));

    // Ensure application exists
    let targetAppId = applicationId;
    if (!targetAppId) {
      const saved = await handleSaveDraft();
      if (!saved) return;
      targetAppId = saved.id;
    }

    setUploadingDocType(docType);
    try {
      const res = await api.applications.uploadDocument(targetAppId!, docType, file);
      const rawUrl =
        res?.download_url ||
        res?.file_path ||
        (res as any)?.data?.download_url ||
        (res as any)?.data?.file_path;
      const finalUrl = rawUrl ? resolveDocUrl(rawUrl) : localBlobUrl;

      setUploadedDocs((prev) => ({
        ...prev,
        [docType]: {
          id: String(res?.id || (res as any)?.data?.id || 'doc'),
          name: file.name,
          url: finalUrl,
          mimeType: res?.mime_type || mimeType,
          size: res?.file_size || file.size,
        },
      }));
      setStatusMessage({ type: 'success', text: `Uploaded ${file.name} successfully.` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'File upload failed' });
    } finally {
      setUploadingDocType(null);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner - App-like PWA Header with Direct Logo (no cardview border) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Direct Brand Logo - No border, no card container */}
          <img
            src={getDivisionLogo(currentBusiness.code)}
            alt={currentBusiness.name}
            className="h-11 sm:h-13 w-auto max-w-[85px] sm:max-w-[110px] object-contain shrink-0 select-none"
          />

          {/* Division Details & Change Action */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold tracking-wider uppercase text-[#006B3E] bg-[#006B3E]/10 px-2 py-0.5 rounded-full shrink-0">
                Division: {currentBusiness.code}
              </span>

              {/* Change Division App Action Pill Button */}
              <button
                type="button"
                onClick={() => {
                  setPendingBusiness(null);
                  setIsChangeBizModalOpen(true);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#006B3E] hover:text-[#005632] bg-emerald-50 hover:bg-emerald-100/90 active:scale-95 px-2.5 py-1 rounded-full border border-emerald-200/90 shadow-2xs transition-all cursor-pointer shrink-0"
                title="Change project division"
              >
                <Icons.Refresh className="w-3 h-3 text-[#006B3E]" />
                <span>Change</span>
              </button>
            </div>

            <h2 className="text-xs sm:text-base font-bold text-slate-900 truncate mt-1 leading-tight">
              {currentBusiness.name}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium truncate sm:whitespace-normal">
              Official Customer Ownership Registration Form
            </p>
          </div>
        </div>

        {referenceNumber && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Application Ref:</span>
            <span className="font-mono font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/70 text-[11px]">
              {referenceNumber}
            </span>
          </div>
        )}
      </div>

      {/* Change Division Modal */}
      <Modal
        isOpen={isChangeBizModalOpen}
        onClose={() => {
          if (!isSwitchingBiz) {
            setIsChangeBizModalOpen(false);
            setPendingBusiness(null);
          }
        }}
        title="Switch Division"
        description="Select a Sunset Group business division for this application."
        maxWidth="md"
      >
        <div className="space-y-3 pt-1">
          {!pendingBusiness ? (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {bizList.map((biz) => {
                  const isCurrent = biz.id === currentBusiness.id;
                  const logoSrc = getDivisionLogo(biz.code);

                  return (
                    <div
                      key={biz.id}
                      onClick={() => {
                        if (!isCurrent) setPendingBusiness(biz);
                      }}
                      className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${
                        isCurrent
                          ? 'border-[#006B3E] bg-emerald-50/50 ring-1 ring-[#006B3E]/20 cursor-default'
                          : 'border-slate-200/80 hover:border-[#006B3E]/60 hover:bg-slate-50 cursor-pointer shadow-2xs'
                      }`}
                    >
                      {/* Direct Logo - No border, no cardview */}
                      <img
                        src={logoSrc}
                        alt={biz.name}
                        className="h-10 w-10 object-contain shrink-0 select-none"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#006B3E] bg-[#006B3E]/10 px-1.5 py-0.5 rounded">
                            {biz.code}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded">
                              Active
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 truncate mt-1">{biz.name}</h4>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Confirmation step when another business is clicked - sleek app style with minimal text */
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3">
                {/* Direct Logo - No border */}
                <img
                  src={getDivisionLogo(pendingBusiness.code)}
                  alt={pendingBusiness.name}
                  className="h-11 w-11 object-contain shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase text-[#006B3E] bg-[#006B3E]/10 px-1.5 py-0.5 rounded">
                    Switch to {pendingBusiness.code}
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate mt-0.5">
                    {pendingBusiness.name}
                  </h4>
                  <p className="text-[11px] text-slate-500">How would you like to handle your form info?</p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                {/* Option 1: Keep Info */}
                <button
                  type="button"
                  disabled={isSwitchingBiz}
                  onClick={() => handleSwitchDivision(pendingBusiness, true)}
                  className="w-full p-3 rounded-xl border border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100/90 active:scale-[0.99] text-left transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#006B3E] text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                      ✓
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#006B3E]">
                        Keep Info &amp; Switch (Recommended)
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        Retains your personal info, addresses &amp; updates division pricing.
                      </div>
                    </div>
                  </div>
                  <Icons.ArrowRight className="w-4 h-4 text-[#006B3E] opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>

                {/* Option 2: Start Fresh */}
                <button
                  type="button"
                  disabled={isSwitchingBiz}
                  onClick={() => handleSwitchDivision(pendingBusiness, false)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.99] text-left transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                      ↺
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Start Blank Form
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Clears all fields and starts clean from Step 1.
                      </div>
                    </div>
                  </div>
                  <Icons.ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>
              </div>

              <div className="pt-1 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isSwitchingBiz}
                  onClick={() => setPendingBusiness(null)}
                >
                  Back
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Final Review & Confirmation Modal */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => !isSubmitting && setIsReviewModalOpen(false)}
        title="Review & Confirm Application"
        description="Verify all details and uploaded documents before final submission."
        maxWidth="xl"
      >
        <div className="space-y-4 pt-1">
          {/* Active Division Summary */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={getDivisionLogo(currentBusiness.code)}
                alt={currentBusiness.name}
                className="h-10 w-auto max-w-[70px] object-contain shrink-0"
              />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#006B3E] bg-[#006B3E]/10 px-2 py-0.5 rounded-full">
                  Division: {currentBusiness.code}
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">{currentBusiness.name}</h4>
              </div>
            </div>
            {referenceNumber && (
              <span className="text-[11px] font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">
                Ref: {referenceNumber}
              </span>
            )}
          </div>

          {/* Section 1: Applicant Information */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <div className="bg-slate-50/80 px-3.5 py-2 font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200">
              <Icons.User className="w-3.5 h-3.5 text-[#006B3E]" />
              <span>Applicant Personal Details</span>
            </div>
            <div className="p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <span className="text-[11px] text-slate-400 block">Name (English)</span>
                <span className="font-semibold text-slate-900">{formData.full_name_en || '—'}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Name (Bangla)</span>
                <span className="font-semibold text-slate-900">{formData.full_name_bn || '—'}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Father's Name</span>
                <span className="font-semibold text-slate-900">{formData.father_name || '—'}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Mother's Name</span>
                <span className="font-semibold text-slate-900">{formData.mother_name || '—'}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Mobile Number</span>
                <span className="font-semibold text-slate-900">{formData.mobile_number || '—'}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Date of Birth</span>
                <span className="font-semibold text-slate-900">{formData.date_of_birth || '—'}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">NID / Passport</span>
                <span className="font-semibold text-slate-900">{formData.nid_or_passport || '—'}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Religion</span>
                <span className="font-semibold text-slate-900">{formData.religion || '—'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[11px] text-slate-400 block">Present Address</span>
                <span className="font-semibold text-slate-900">{formData.present_address || '—'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[11px] text-slate-400 block">Permanent Address</span>
                <span className="font-semibold text-slate-900">{formData.permanent_address || '—'}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Profession, Nominee, Bank */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Profession */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <div className="bg-slate-50/80 px-3 py-1.5 font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200">
                <Icons.Briefcase className="w-3.5 h-3.5 text-[#006B3E]" />
                <span>Profession</span>
              </div>
              <div className="p-3 space-y-1.5">
                <div>
                  <span className="text-[11px] text-slate-400 block">Designation:</span>
                  <span className="font-semibold text-slate-900">{formData.designation || '—'}</span>
                </div>
                {formData.company_name && (
                  <div>
                    <span className="text-[11px] text-slate-400 block">Company:</span>
                    <span className="font-semibold text-slate-900">{formData.company_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Nominee */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <div className="bg-slate-50/80 px-3 py-1.5 font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200">
                <Icons.Users className="w-3.5 h-3.5 text-[#006B3E]" />
                <span>Primary Nominee</span>
              </div>
              <div className="p-3 space-y-1.5">
                <div>
                  <span className="text-[11px] text-slate-400 block">Name:</span>
                  <span className="font-semibold text-slate-900">{formData.nominees?.[0]?.full_name || '—'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Relation / Phone:</span>
                  <span className="font-semibold text-slate-900">
                    {formData.nominees?.[0]?.relation || '—'} • {formData.nominees?.[0]?.cell_number || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <div className="bg-slate-50/80 px-3 py-1.5 font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200">
                <Icons.CreditCard className="w-3.5 h-3.5 text-[#006B3E]" />
                <span>Bank Details</span>
              </div>
              <div className="p-3 space-y-1.5">
                <div>
                  <span className="text-[11px] text-slate-400 block">Bank &amp; Branch:</span>
                  <span className="font-semibold text-slate-900">{formData.bank_name || '—'} ({formData.branch_name || '—'})</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Account:</span>
                  <span className="font-semibold text-slate-900">{formData.account_name || '—'} • {formData.account_number || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Ownership & Payment Schedule */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <div className="bg-slate-50/80 px-3.5 py-2 font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200">
              <Icons.Building className="w-3.5 h-3.5 text-[#006B3E]" />
              <span>Ownership &amp; Payment Schedule</span>
            </div>
            <div className="p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <span className="text-[11px] text-slate-400 block">Package Type</span>
                <span className="font-semibold text-slate-900">{formData.package_type} ({formData.number_of_ownership} share)</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Total Price</span>
                <span className="font-bold text-[#006B3E]">৳ {formData.total_price.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Booking Money</span>
                <span className="font-semibold text-slate-900">৳ {formData.booking_money.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Remaining Dues</span>
                <span className="font-semibold text-slate-900">৳ {formData.dues_amount.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Installments</span>
                <span className="font-semibold text-slate-900">
                  {formData.number_of_installments} x ৳ {formData.installment_amount.toLocaleString('en-IN')} ({formData.installment_type})
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Booking Date</span>
                <span className="font-semibold text-slate-900">{formData.booking_date || '—'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[11px] text-slate-400 block">Amount in Words</span>
                <span className="font-semibold text-slate-800">{formData.amount_in_words}</span>
              </div>
            </div>
          </div>

          {/* Section 4: Uploaded Documents Verification */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <div className="bg-slate-50/80 px-3.5 py-2 font-bold text-slate-800 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Icons.Upload className="w-3.5 h-3.5 text-[#006B3E]" />
                <span>Uploaded Documents Verification</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                {Object.keys(uploadedDocs).length} Document(s) Attached
              </span>
            </div>
            <div className="p-3 sm:p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { type: 'applicant_photo', label: 'Applicant Photograph', required: true },
                { type: 'nid_front', label: 'NID Front / Passport Page', required: true },
                { type: 'nid_back', label: 'NID Back Side', required: false },
                { type: 'nominee_photo', label: 'Nominee Photograph', required: true },
                { type: 'nominee_nid', label: 'Nominee NID / Passport', required: true },
                { type: 'tin_certificate', label: 'e-TIN Certificate', required: false },
              ].map((doc) => {
                const uploaded = getUploadedDoc(doc.type);
                const isImage = isImageDoc(uploaded);
                const isPdf = isPdfDoc(uploaded);

                return (
                  <div
                    key={doc.type}
                    className={`p-2.5 sm:p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                      uploaded
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : doc.required
                        ? 'border-amber-200 bg-amber-50/25'
                        : 'border-slate-200/70 bg-slate-50/40'
                    }`}
                  >
                    {/* Visual Thumbnail / Icon Box */}
                    {uploaded ? (
                      isImage && uploaded.url ? (
                        <div
                          onClick={() =>
                            setPreviewModalDoc({
                              title: doc.label,
                              name: uploaded.name,
                              url: uploaded.url,
                              mimeType: uploaded.mimeType,
                            })
                          }
                          className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 cursor-pointer shadow-xs group"
                          title="Click to zoom image"
                        >
                          <img
                            src={uploaded.url}
                            alt={doc.label}
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Icons.Eye className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      ) : isPdf ? (
                        <div
                          onClick={() =>
                            setPreviewModalDoc({
                              title: doc.label,
                              name: uploaded.name,
                              url: uploaded.url,
                              mimeType: uploaded.mimeType,
                            })
                          }
                          className="w-16 h-16 rounded-xl bg-rose-50 border border-rose-200 flex flex-col items-center justify-center shrink-0 cursor-pointer text-rose-600 hover:bg-rose-100 transition-colors shadow-xs"
                          title="Click to preview PDF"
                        >
                          <Icons.FileText className="w-5 h-5 mb-0.5" />
                          <span className="text-[10px] font-bold">PDF</span>
                        </div>
                      ) : (
                        <div
                          onClick={() =>
                            setPreviewModalDoc({
                              title: doc.label,
                              name: uploaded.name,
                              url: uploaded.url,
                              mimeType: uploaded.mimeType,
                            })
                          }
                          className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 cursor-pointer text-slate-500 shadow-xs"
                        >
                          <Icons.FileText className="w-5 h-5" />
                        </div>
                      )
                    ) : (
                      <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center shrink-0 text-slate-400">
                        <Icons.Upload className="w-5 h-5 mb-0.5" />
                        <span className="text-[9px] font-medium">Missing</span>
                      </div>
                    )}

                    {/* Details and Actions */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-slate-900 truncate text-xs">{doc.label}</span>
                        {uploaded ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                            ✓ Ready
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                            {doc.required ? 'Required' : 'Optional'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate" title={uploaded?.name}>
                        {uploaded ? uploaded.name : 'No document uploaded yet'}
                      </p>

                      {uploaded && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewModalDoc({
                                title: doc.label,
                                name: uploaded.name,
                                url: uploaded.url,
                                mimeType: uploaded.mimeType,
                              })
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#006B3E] hover:text-[#005230] bg-[#006B3E]/10 hover:bg-[#006B3E]/20 px-2 py-0.5 rounded transition-colors"
                          >
                            <Icons.Eye className="w-3 h-3" />
                            <span>Preview</span>
                          </button>
                          {uploaded.size ? (
                            <span className="text-[10px] text-slate-400">{formatFileSize(uploaded.size)}</span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-2.5">
            <Button
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => setIsReviewModalOpen(false)}
              className="w-full sm:w-auto justify-center"
            >
              Back to Edit
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={isSubmitting}
              isLoading={isSubmitting}
              onClick={async () => {
                setIsReviewModalOpen(false);
                await handleSubmit();
              }}
              leftIcon={<Icons.Check className="w-4 h-4" />}
              className="w-full sm:w-auto justify-center font-bold bg-[#006B3E] hover:bg-[#005230]"
            >
              Confirm &amp; Final Submit
            </Button>
          </div>
        </div>
      </Modal>

      {/* Document Preview Lightbox Modal */}
      <Modal
        isOpen={!!previewModalDoc}
        onClose={() => setPreviewModalDoc(null)}
        title={previewModalDoc?.title || 'Document Preview'}
        description={previewModalDoc?.name}
        maxWidth="xl"
      >
        <div className="space-y-4 pt-1">
          <div className="bg-slate-900/5 rounded-xl border border-slate-200/80 p-2 sm:p-3 flex items-center justify-center min-h-[220px] max-h-[70vh] overflow-auto">
            {previewModalDoc && isImageDoc(previewModalDoc) ? (
              <img
                src={previewModalDoc.url}
                alt={previewModalDoc.title}
                className="max-h-[62vh] w-auto max-w-full rounded-lg object-contain shadow-sm mx-auto"
              />
            ) : previewModalDoc && isPdfDoc(previewModalDoc) ? (
              <iframe
                src={previewModalDoc.url}
                title={previewModalDoc.title}
                className="w-full h-[62vh] rounded-lg border border-slate-200 bg-white"
              />
            ) : (
              <div className="text-center py-8">
                <Icons.FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-700 font-semibold">{previewModalDoc?.name}</p>
                <p className="text-[11px] text-slate-400 mt-1">Preview not directly supported for this format.</p>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
            {previewModalDoc?.url && (
              <a
                href={previewModalDoc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#006B3E] hover:text-[#005230] px-3 py-1.5 rounded-lg border border-[#006B3E]/20 hover:bg-[#006B3E]/5 transition-colors"
              >
                <Icons.ExternalLink className="w-3.5 h-3.5" />
                <span>Open in New Window</span>
              </a>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPreviewModalDoc(null)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Mobile App Stepper */}
      <div className="md:hidden bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#006B3E] uppercase tracking-wider text-[11px] bg-[#006B3E]/10 px-2 py-0.5 rounded">
            Step {currentStep} of {steps.length}
          </span>
          <span className="font-bold text-slate-800">{steps[currentStep - 1]?.title}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-[#006B3E] h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
        {/* Quick Step Buttons for Mobile */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto pt-0.5 pb-1">
          {steps.slice(0, 8).map((s) => {
            const isComplete = (visitedSteps.has(s.number) || Boolean(existingApplication)) && isStepComplete(s.number);
            const isCurrent = currentStep === s.number;
            const isVisited = visitedSteps.has(s.number) || s.number < currentStep;
            const isIncomplete = isVisited && !isComplete && !isCurrent;

            return (
              <button
                key={s.number}
                type="button"
                onClick={() => goToStep(s.number)}
                className={`w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-colors flex items-center justify-center ${
                  isCurrent
                    ? 'border-2 border-[#006B3E] text-[#006B3E] bg-white ring-2 ring-[#006B3E]/20 shadow-xs'
                    : isComplete
                    ? 'bg-[#006B3E] text-white border-2 border-[#006B3E]'
                    : isIncomplete
                    ? 'border-2 border-red-500 text-red-600 bg-red-50 ring-1 ring-red-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title={
                  isIncomplete
                    ? `${s.title} (Incomplete - Missing required info)`
                    : s.title
                }
              >
                {isComplete ? <Icons.Check className="w-3.5 h-3.5 text-white" /> : s.number}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Stepper */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl p-4 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[720px]">
          {steps.map((s, idx) => {
            const isComplete = (visitedSteps.has(s.number) || Boolean(existingApplication)) && isStepComplete(s.number);
            const isCurrent = currentStep === s.number;
            const isVisited = visitedSteps.has(s.number) || s.number < currentStep;
            const isIncomplete = isVisited && !isComplete && !isCurrent;

            return (
              <React.Fragment key={s.number}>
                <button
                  type="button"
                  onClick={() => s.number <= 8 && goToStep(s.number)}
                  className="flex flex-col items-center text-center group cursor-pointer focus:outline-none"
                  title={
                    isIncomplete
                      ? `Step ${s.number}: ${s.title} (Incomplete - missing required info)`
                      : `Jump to ${s.title}`
                  }
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      isCurrent
                        ? 'border-2 border-[#006B3E] text-[#006B3E] bg-white ring-4 ring-[#006B3E]/15 group-hover:scale-105'
                        : isComplete
                        ? 'bg-[#006B3E] text-white border-2 border-[#006B3E] group-hover:scale-105'
                        : isIncomplete
                        ? 'border-2 border-red-500 text-red-600 bg-red-50 ring-2 ring-red-100 shadow-2xs group-hover:bg-red-100/70 group-hover:scale-105'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 group-hover:bg-slate-200'
                    }`}
                  >
                    {isComplete ? <Icons.Check className="w-4 h-4 text-white" /> : s.number}
                  </div>
                  <span
                    className={`text-[11px] font-medium mt-1.5 whitespace-nowrap transition-colors ${
                      isCurrent
                        ? 'text-slate-900 font-bold'
                        : isIncomplete
                        ? 'text-red-600 font-semibold'
                        : isComplete
                        ? 'text-[#006B3E] font-medium'
                        : 'text-slate-500 group-hover:text-slate-800'
                    }`}
                  >
                    {s.title}
                  </span>
                </button>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      isComplete ? 'bg-[#006B3E]' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <Alert type={statusMessage.type} className="animate-in fade-in duration-200">
          {statusMessage.text}
        </Alert>
      )}

      {/* Wizard Form Content */}
      <Card>
        {/* STEP 1: Applicant Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900">Step 1: Applicant Personal Details</h3>
              <p className="text-xs text-slate-500">Enter personal details as shown on your National ID or Passport.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
                label="Full Name (English Block Letters)"
                required
                value={formData.full_name_en}
                onChange={(e) => setFormData({ ...formData, full_name_en: e.target.value.toUpperCase() })}
                error={errors.full_name_en}
                placeholder="MD. RAHIM AHMED"
              />
              <Input
                label="Full Name (In Bangla)"
                value={formData.full_name_bn}
                onChange={(e) => setFormData({ ...formData, full_name_bn: e.target.value })}
                placeholder="মোঃ রহিম আহমেদ"
              />
              <Input
                label="Application Date"
                type="date"
                value={formData.application_date}
                onChange={(e) => setFormData({ ...formData, application_date: e.target.value })}
              />
              <Input
                label="Father's Name"
                required
                value={formData.father_name}
                onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                error={errors.father_name}
                placeholder="Father's Full Name"
              />
              <Input
                label="Mother's Name"
                required
                value={formData.mother_name}
                onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                error={errors.mother_name}
                placeholder="Mother's Full Name"
              />
              <Input
                label="Spouse's Name (Optional)"
                value={formData.spouse_name}
                onChange={(e) => setFormData({ ...formData, spouse_name: e.target.value })}
                placeholder="Spouse Name if applicable"
              />
              <Input
                label="Mobile Number (Primary)"
                required
                value={formData.mobile_number}
                onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                error={errors.mobile_number}
                placeholder="017XXXXXXXX"
              />
              <Input
                label="Alternative Phone Number"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="02XXXXXXXX or Mobile"
              />
              <Input
                label="Personal Email Address"
                type="email"
                value={formData.personal_email}
                onChange={(e) => setFormData({ ...formData, personal_email: e.target.value })}
                placeholder="applicant@example.com"
              />
              <Input
                label="Date of Birth"
                type="date"
                required
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                error={errors.date_of_birth}
              />
              <Input
                label="Nationality"
                required
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
              />
              <Input
                label="Religion"
                value={formData.religion}
                onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                placeholder="Islam / Hinduism / etc."
              />
              <Input
                label="NID / Passport Number"
                required
                value={formData.nid_or_passport}
                onChange={(e) => setFormData({ ...formData, nid_or_passport: e.target.value })}
                error={errors.nid_or_passport}
                placeholder="NID or Passport number"
              />
              <Input
                label="e-TIN Number (Optional)"
                value={formData.tin_number}
                onChange={(e) => setFormData({ ...formData, tin_number: e.target.value })}
                placeholder="12-digit TIN"
              />
              <Input
                label="Assigned Ownership ID (If any)"
                value={formData.ownership_id}
                onChange={(e) => setFormData({ ...formData, ownership_id: e.target.value })}
                placeholder="Leave blank if new"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <Textarea
                label="Present / Mailing Address"
                required
                rows={3}
                value={formData.present_address}
                onChange={(e) => setFormData({ ...formData, present_address: e.target.value })}
                error={errors.present_address}
                placeholder="House, Road, Area, Thana, District, Postal Code"
              />
              <Textarea
                label="Permanent Address"
                required
                rows={3}
                value={formData.permanent_address}
                onChange={(e) => setFormData({ ...formData, permanent_address: e.target.value })}
                error={errors.permanent_address}
                placeholder="Village / Road, Post Office, Thana, District"
              />
            </div>
          </div>
        )}

        {/* STEP 2: Profession / Occupation */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900">Step 2: Profession &amp; Occupation</h3>
              <p className="text-xs text-slate-500">Provide professional and employment details.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Company / Organization Name (Optional)"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                error={errors.company_name}
                placeholder="e.g. Grameenphone Ltd / Business Owner (Optional)"
              />
              <Input
                label="Designation"
                required
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                error={errors.designation}
                placeholder="e.g. Senior Manager / Managing Director"
              />
              <Input
                label="Office Contact / Cell Number (Optional)"
                value={formData.office_phone}
                onChange={(e) => setFormData({ ...formData, office_phone: e.target.value })}
                placeholder="Office Phone or extension"
              />
              <div className="sm:col-span-2">
                <Textarea
                  label="Office / Workplace Address (Optional)"
                  rows={2}
                  value={formData.office_address}
                  onChange={(e) => setFormData({ ...formData, office_address: e.target.value })}
                  placeholder="Plot/Road, Commercial Area, City (Optional)"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Nominee Information */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Step 3: Nominee Information</h3>
                <p className="text-xs text-slate-500">Provide nominee details. A primary nominee is required.</p>
              </div>
              {formData.nominees.length === 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Icons.Plus className="w-4 h-4" />}
                  onClick={() =>
                    setFormData({
                      ...formData,
                      nominees: [
                        ...formData.nominees,
                        {
                          nominee_order: 2,
                          full_name: '',
                          relation: '',
                          father_or_husband_name: '',
                          nid_or_passport: '',
                          cell_number: '',
                          date_of_birth: '',
                        },
                      ],
                    })
                  }
                >
                  Add Second Nominee
                </Button>
              )}
            </div>

            {formData.nominees.map((nom, idx) => (
              <div key={idx} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#006B3E]">
                    Nominee {idx + 1} {idx === 0 ? '(Primary - Required)' : '(Secondary - Optional)'}
                  </span>
                  {idx > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-rose-600 hover:text-rose-700"
                      leftIcon={<Icons.Trash className="w-3.5 h-3.5" />}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          nominees: formData.nominees.filter((_, i) => i !== idx),
                        })
                      }
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Input
                    label="Full Name"
                    required={idx === 0}
                    value={nom.full_name}
                    onChange={(e) => {
                      const updated = [...formData.nominees];
                      updated[idx].full_name = e.target.value;
                      setFormData({ ...formData, nominees: updated });
                    }}
                    error={idx === 0 ? errors.nominee_1_name : undefined}
                    placeholder="Nominee's full name"
                  />
                  <Input
                    label="Relation with Applicant"
                    required={idx === 0}
                    value={nom.relation}
                    onChange={(e) => {
                      const updated = [...formData.nominees];
                      updated[idx].relation = e.target.value;
                      setFormData({ ...formData, nominees: updated });
                    }}
                    error={idx === 0 ? errors.nominee_1_relation : undefined}
                    placeholder="e.g. Spouse, Son, Mother"
                  />
                  <Input
                    label="Father's / Husband's Name"
                    value={nom.father_or_husband_name}
                    onChange={(e) => {
                      const updated = [...formData.nominees];
                      updated[idx].father_or_husband_name = e.target.value;
                      setFormData({ ...formData, nominees: updated });
                    }}
                    placeholder="Father/Husband Name"
                  />
                  <Input
                    label="NID / Passport Number"
                    required={idx === 0}
                    value={nom.nid_or_passport}
                    onChange={(e) => {
                      const updated = [...formData.nominees];
                      updated[idx].nid_or_passport = e.target.value;
                      setFormData({ ...formData, nominees: updated });
                    }}
                    error={idx === 0 ? errors.nominee_1_nid : undefined}
                    placeholder="NID or Passport"
                  />
                  <Input
                    label="Cell Number"
                    required={idx === 0}
                    value={nom.cell_number}
                    onChange={(e) => {
                      const updated = [...formData.nominees];
                      updated[idx].cell_number = e.target.value;
                      setFormData({ ...formData, nominees: updated });
                    }}
                    error={idx === 0 ? errors.nominee_1_phone : undefined}
                    placeholder="017XXXXXXXX"
                  />
                  <Input
                    label="Date of Birth (Optional)"
                    type="date"
                    value={nom.date_of_birth || ''}
                    onChange={(e) => {
                      const updated = [...formData.nominees];
                      updated[idx].date_of_birth = e.target.value;
                      setFormData({ ...formData, nominees: updated });
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STEP 4: Bank Details */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900">Step 4: Bank Account Details</h3>
              <p className="text-xs text-slate-500">
                Bank account for dividend, profit distribution, and official transactions.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Account Holder Name"
                required
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                error={errors.account_name}
                placeholder="Account name as registered in bank"
              />
              <Input
                label="Account Number"
                required
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                error={errors.account_number}
                placeholder="Bank Account Number"
              />
              <Input
                label="Bank Name"
                required
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                error={errors.bank_name}
                placeholder="e.g. Dutch-Bangla Bank PLC, BRAC Bank"
              />
              <Input
                label="Branch Name"
                required
                value={formData.branch_name}
                onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                error={errors.branch_name}
                placeholder="e.g. Gulshan Branch"
              />
            </div>
          </div>
        )}

        {/* STEP 5: Ownership & Pricing */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900">Step 5: Ownership Package &amp; Pricing</h3>
              <p className="text-xs text-slate-500">
                Select your desired ownership package for {currentBusiness.name}.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {['Bronze', 'Silver', 'Gold', 'Platinum'].map((pkg) => {
                const isSelected = Boolean(formData.package_type && formData.package_type.toLowerCase() === pkg.toLowerCase());
                const bizPackages = getDivisionPackages(currentBusiness.code);
                const spec = bizPackages.find((s) => s.name.toLowerCase() === pkg.toLowerCase());
                const matchedPkg = packages.find((p) => p.package_type.toLowerCase() === pkg.toLowerCase());
                const price = matchedPkg ? matchedPkg.base_price : (spec ? spec.price : 350000);
                const booking = spec ? spec.bookingMoney : Math.round(price * 0.25);
                const units = spec ? spec.units : 1;

                return (
                  <div
                    key={pkg}
                    onClick={() => updatePricing(pkg, 1, formData.discount_amount, price, booking)}
                    className={`cursor-pointer p-4 rounded-xl border text-center transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#006B3E] bg-[#006B3E]/5 ring-2 ring-[#006B3E]'
                        : 'border-slate-200 hover:border-slate-300 bg-white shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Package</span>
                        <span className="text-[10px] font-semibold text-[#006B3E] bg-[#006B3E]/10 px-1.5 py-0.5 rounded">
                          {spec?.sharesText || `${units}x Unit`}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 mt-1">{pkg}</h4>
                      <p className="text-base font-extrabold text-[#006B3E] mt-2">
                        ৳ {price.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                        Booking: <span className="text-slate-800 font-semibold">৳ {booking.toLocaleString('en-IN')}</span>
                      </p>
                    </div>

                    {spec && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 text-left">
                        {spec.space && (
                          <p className="text-[10px] text-slate-500 mb-0.5">
                            <span className="font-semibold text-slate-700">Space:</span> {spec.space}
                          </p>
                        )}
                        <p className="text-[10px] text-emerald-700 font-medium leading-tight">
                          {spec.perks}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              <Input
                label="Number of Ownerships"
                type="number"
                min={1}
                max={20}
                value={formData.number_of_ownership}
                onChange={(e) => {
                  const qty = parseInt(e.target.value) || 1;
                  updatePricing(formData.package_type, qty, formData.discount_amount, formData.price_per_ownership);
                }}
              />
              <Input
                label="Price Per Ownership (BDT)"
                type="number"
                value={formData.price_per_ownership}
                onChange={(e) => {
                  const p = parseFloat(e.target.value) || 0;
                  updatePricing(formData.package_type, formData.number_of_ownership, formData.discount_amount, p);
                }}
              />
              <Input
                label="Special Discount (BDT)"
                type="number"
                value={formData.discount_amount}
                onChange={(e) => {
                  const d = parseFloat(e.target.value) || 0;
                  updatePricing(formData.package_type, formData.number_of_ownership, d, formData.price_per_ownership);
                }}
              />
            </div>

            {/* Calculated Total Box */}
            <div className="bg-[#006B3E]/5 border border-[#006B3E]/20 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-slate-600 block">Total Ownership Price</span>
                <span className="text-2xl font-bold text-[#006B3E]">
                  ৳ {formData.total_price.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="text-right sm:max-w-md">
                <span className="text-xs text-slate-500 block">Amount in Words</span>
                <span className="text-xs font-semibold text-slate-800">{formData.amount_in_words || 'Please select an ownership package'}</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Payment Information */}
        {currentStep === 6 && (() => {
          const bizCode = (currentBusiness?.code || '').toUpperCase().trim();
          const isHospitalOrDfi = bizCode === 'SCH' || bizCode === 'DFI';
          const maxAllowedEmis = isHospitalOrDfi ? 24 : 36;
          const bookingTotal = Number(formData.booking_money) || 0;
          const tokenPaid = Number(formData.token_money) || 0;
          const bookingRemainingDue = Math.max(0, bookingTotal - tokenPaid);

          return (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-semibold text-slate-900">Step 6: Payment Schedule &amp; Installments</h3>
                <p className="text-xs text-slate-500">
                  Configure token payment, one-time booking money, and regular installment plan.
                </p>
              </div>

              {/* Part 1: Token & Booking Money (Given At A Time) */}
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">1. Booking &amp; Token Money</span>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Paid At A Time
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    Total Package: <strong className="text-slate-800">৳ {formData.total_price.toLocaleString('en-IN')}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Token Money Paid (BDT)"
                    type="number"
                    value={formData.token_money || ''}
                    placeholder="Current amount given"
                    helperText="Amount paid right now (deducted from Booking Money)"
                    onChange={(e) => {
                      const tm = parseFloat(e.target.value) || 0;
                      const effectiveBooking = Math.max(formData.booking_money, tm);
                      const dues = Math.max(0, formData.total_price - effectiveBooking);
                      const instAmt = formData.number_of_installments > 0 ? Math.round(dues / formData.number_of_installments) : 0;
                      setFormData({ ...formData, token_money: tm, dues_amount: dues, installment_amount: instAmt });
                    }}
                  />
                  <Input
                    label="Total Booking Money (BDT)"
                    type="number"
                    value={formData.booking_money || ''}
                    helperText="Official package booking money"
                    onChange={(e) => {
                      const bm = parseFloat(e.target.value) || 0;
                      const effectiveBooking = Math.max(bm, formData.token_money);
                      const dues = Math.max(0, formData.total_price - effectiveBooking);
                      const instAmt = formData.number_of_installments > 0 ? Math.round(dues / formData.number_of_installments) : 0;
                      setFormData({
                        ...formData,
                        booking_money: bm,
                        dues_amount: dues,
                        installment_amount: instAmt,
                      });
                    }}
                  />
                  <Input
                    label="Booking Payment Date"
                    type="date"
                    value={formData.booking_date}
                    helperText="Date by which remaining booking money is due"
                    onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
                  />
                </div>

                {/* Booking Money Clean Breakdown Notice */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white p-3 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Token Money Paid Today</span>
                    <span className="font-bold text-slate-800 text-sm">
                      ৳ {tokenPaid.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Remaining Booking Due</span>
                    <span className="font-bold text-amber-700 text-sm">
                      ৳ {bookingRemainingDue.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Total Booking Commitment</span>
                    <span className="font-bold text-[#006B3E] text-sm">
                      ৳ {bookingTotal.toLocaleString('en-IN')} <span className="text-[10px] font-normal text-slate-500">(1-time payment)</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Part 2: Regular Installment Plan on Remaining Rest Amount */}
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">2. Regular Installment Plan (On Remaining Rest Amount)</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Max {maxAllowedEmis} EMIs available for {currentBusiness?.name || 'this division'}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Dues: ৳ {formData.dues_amount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Select
                    label="Installment Frequency"
                    value={formData.installment_type}
                    onChange={(e) => setFormData({ ...formData, installment_type: e.target.value as any })}
                    options={[
                      { value: 'monthly', label: 'Monthly' },
                      { value: 'quarterly', label: 'Quarterly' },
                      { value: 'half_yearly', label: 'Half-Yearly' },
                      { value: 'yearly', label: 'Yearly' },
                    ]}
                  />
                  <Input
                    label="Number of Installments (EMIs)"
                    type="number"
                    min={1}
                    max={maxAllowedEmis}
                    value={formData.number_of_installments || ''}
                    helperText={`Allowed: 1 to ${maxAllowedEmis} EMIs`}
                    onChange={(e) => {
                      let n = parseInt(e.target.value) || 0;
                      if (n > maxAllowedEmis) n = maxAllowedEmis;
                      const instAmt = n > 0 ? Math.round(formData.dues_amount / n) : 0;
                      setFormData({ ...formData, number_of_installments: n, installment_amount: instAmt });
                    }}
                  />
                  <Input
                    label="Regular EMI Amount (BDT)"
                    type="number"
                    value={formData.installment_amount || ''}
                    onChange={(e) => setFormData({ ...formData, installment_amount: parseFloat(e.target.value) || 0 })}
                  />
                  <Input
                    label="Installment Starting Date"
                    type="date"
                    value={formData.installment_start_date}
                    onChange={(e) => setFormData({ ...formData, installment_start_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Summary Balance Card */}
              <div className="bg-[#006B3E]/5 border border-[#006B3E]/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-slate-500 block">Remaining Rest Amount (Installment Dues)</span>
                  <span className="text-2xl font-bold text-[#006B3E]">
                    ৳ {formData.dues_amount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11px] text-slate-600 block mt-0.5">
                    Total Package: <strong>৳ {formData.total_price.toLocaleString('en-IN')}</strong> · Total Booking: <strong>৳ {bookingTotal.toLocaleString('en-IN')}</strong>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Installment Plan Summary</span>
                  <span className="text-xs font-semibold text-slate-800 block">
                    {formData.number_of_installments > 0
                      ? `${formData.number_of_installments} EMIs of ৳ ${(formData.installment_amount || 0).toLocaleString('en-IN')} (${formData.installment_type || 'Monthly'})`
                      : 'Select installments or pay lump sum'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Starts on {formData.installment_start_date || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* STEP 7: Documents & Attachments */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900">Step 7: Document Uploads &amp; Attachments</h3>
              <p className="text-xs text-slate-500">
                Upload clear scanned copies or photographs (JPG, PNG, PDF up to 10MB). Uploaded items can be previewed immediately.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { type: 'applicant_photo', label: 'Applicant Photograph', required: true, hint: 'Passport size clear photo' },
                { type: 'nid_front', label: 'NID Front / Passport Page', required: true, hint: 'Clear photo or scan' },
                { type: 'nid_back', label: 'NID Back Side', required: false, hint: 'Back side of NID card' },
                { type: 'nominee_photo', label: 'Nominee Photograph', required: true, hint: 'Nominee passport size photo' },
                { type: 'nominee_nid', label: 'Nominee NID / Passport', required: true, hint: 'Nominee identity document' },
                { type: 'tin_certificate', label: 'e-TIN Certificate (Optional)', required: false, hint: 'Official TIN certificate copy' },
              ].map((doc) => {
                const uploaded = uploadedDocs[doc.type];
                const isCurrentUploading = uploadingDocType === doc.type;
                const isImage = isImageDoc(uploaded);
                const isPdf = isPdfDoc(uploaded);

                return (
                  <div
                    key={doc.type}
                    className={`p-3.5 sm:p-4 border rounded-2xl bg-white flex flex-col justify-between transition-all duration-200 ${
                      uploaded
                        ? 'border-emerald-200 shadow-2xs ring-1 ring-emerald-500/10'
                        : doc.required
                        ? 'border-slate-200 hover:border-slate-300 shadow-2xs'
                        : 'border-slate-200/80 bg-slate-50/30'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          {doc.label} {doc.required && <span className="text-rose-500">*</span>}
                        </span>
                        {uploaded ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Icons.Check className="w-2.5 h-2.5 text-emerald-600" />
                            Uploaded
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">
                            {doc.required ? 'Required' : 'Optional'}
                          </span>
                        )}
                      </div>

                      {/* Document Preview Box (When Uploaded) */}
                      {uploaded ? (
                        <div className="mb-3 space-y-2">
                          {isImage && uploaded.url ? (
                            /* Image Preview Thumbnail with quick action overlay */
                            <div className="relative h-36 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group">
                              <img
                                src={uploaded.url}
                                alt={doc.label}
                                className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 sm:transition-opacity flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewModalDoc({
                                      title: doc.label,
                                      name: uploaded.name,
                                      url: uploaded.url,
                                      mimeType: uploaded.mimeType,
                                    })
                                  }
                                  className="px-2.5 py-1.5 bg-white/95 text-slate-800 rounded-lg text-xs font-semibold shadow-md flex items-center gap-1 hover:bg-white transition-colors"
                                >
                                  <Icons.Eye className="w-3.5 h-3.5 text-[#006B3E]" />
                                  <span>Preview</span>
                                </button>
                              </div>
                            </div>
                          ) : isPdf ? (
                            /* PDF Preview Card */
                            <div
                              onClick={() =>
                                setPreviewModalDoc({
                                  title: doc.label,
                                  name: uploaded.name,
                                  url: uploaded.url,
                                  mimeType: uploaded.mimeType,
                                })
                              }
                              className="h-36 w-full rounded-xl border border-rose-200 bg-rose-50/40 p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-rose-50 transition-colors group"
                            >
                              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                                <Icons.FileText className="w-5 h-5" />
                              </div>
                              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wide">
                                PDF Document
                              </span>
                              <span className="text-[10px] text-slate-600 line-clamp-1 max-w-[90%] mt-0.5 font-medium">
                                {uploaded.name}
                              </span>
                              <span className="mt-2 text-[10px] font-bold text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-200 inline-flex items-center gap-1">
                                <Icons.Eye className="w-3 h-3" /> Click to Preview
                              </span>
                            </div>
                          ) : (
                            /* Other Format */
                            <div
                              onClick={() =>
                                setPreviewModalDoc({
                                  title: doc.label,
                                  name: uploaded.name,
                                  url: uploaded.url,
                                  mimeType: uploaded.mimeType,
                                })
                              }
                              className="h-36 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                              <Icons.FileText className="w-8 h-8 text-slate-400 mb-1" />
                              <span className="text-[11px] font-semibold text-slate-700 line-clamp-1">
                                {uploaded.name}
                              </span>
                              <span className="text-[10px] text-slate-400 mt-1">Tap to preview</span>
                            </div>
                          )}

                          {/* File Details Strip */}
                          <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
                            <span className="truncate max-w-[170px] font-medium text-slate-700" title={uploaded.name}>
                              {uploaded.name}
                            </span>
                            {uploaded.size ? (
                              <span className="shrink-0 text-slate-400 text-[10px]">
                                {formatFileSize(uploaded.size)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        /* Empty State Upload Dropzone */
                        <div className="mb-3 border-2 border-dashed border-slate-200 rounded-xl p-4 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                          <Icons.Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                          <p className="text-[11px] font-semibold text-slate-700">Tap to upload file</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, PDF up to 10MB</p>
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      {uploaded && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewModalDoc({
                              title: doc.label,
                              name: uploaded.name,
                              url: uploaded.url,
                              mimeType: uploaded.mimeType,
                            })
                          }
                          className="flex-1 py-1.5 px-2 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center justify-center gap-1.5"
                        >
                          <Icons.Eye className="w-3.5 h-3.5 text-[#006B3E]" />
                          <span>Preview</span>
                        </button>
                      )}

                      <label
                        className={`cursor-pointer inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          uploaded
                            ? 'flex-1 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                            : 'w-full bg-[#006B3E] hover:bg-[#005230] text-white shadow-2xs'
                        }`}
                      >
                        {isCurrentUploading ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Icons.Spinner className="w-3.5 h-3.5 text-current animate-spin" />
                            <span>Uploading...</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <Icons.Upload className="w-3.5 h-3.5" />
                            <span>{uploaded ? 'Replace' : 'Upload File'}</span>
                          </span>
                        )}
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          disabled={isCurrentUploading}
                          onChange={(e) => handleFileUpload(doc.type, e)}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 8: Declaration & Review */}
        {currentStep === 8 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900">Step 8: Declaration &amp; Final Review</h3>
              <p className="text-xs text-slate-500">
                Review your application thoroughly and agree to Sunset Group terms.
              </p>
            </div>

            {/* Terms Viewer */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-56 overflow-y-auto text-xs text-slate-700 space-y-2">
              <h4 className="font-bold text-slate-900">
                Terms and Conditions — {currentBusiness.name} (Version {terms?.version || '1.0'})
              </h4>
              <p>
                {terms?.content ||
                  '1. The applicant hereby declares that all information given in this application is true, accurate, and complete. 2. Allocation of ownership shares is subject to timely payments of booking money and installments. 3. Ownership rights, certificates, and dividends will be issued strictly in accordance with company bylaws. 4. In case of cancellation or default, refund guidelines of Sunset Group will strictly apply.'}
              </p>
            </div>

            {/* Declaration Checkbox */}
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.declaration_accepted}
                  onChange={(e) => setFormData({ ...formData, declaration_accepted: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#006B3E] focus:ring-[#006B3E]"
                />
                <span className="text-xs text-slate-800 leading-relaxed">
                  I solemnly declare that the particulars furnished above are true and correct to the best of my knowledge and belief. I agree to abide by the rules and regulations of Sunset Group and {currentBusiness.name}.
                </span>
              </label>
              {errors.declaration && (
                <p className="text-xs text-rose-600 font-semibold mt-2">{errors.declaration}</p>
              )}
            </div>

            {/* Structured Summary Review */}
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
              <div className="p-3 bg-slate-50 font-bold text-slate-800 flex items-center justify-between">
                <span>Application Overview &amp; Verification</span>
                <span className="text-[11px] text-slate-500 font-normal">Click review below to confirm submission</span>
              </div>
              <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <span className="text-slate-500">Applicant:</span>
                <span className="font-semibold text-slate-900">{formData.full_name_en}</span>
                <span className="text-slate-500">Mobile:</span>
                <span className="font-semibold text-slate-900">{formData.mobile_number}</span>
                <span className="text-slate-500">NID / Passport:</span>
                <span className="font-semibold text-slate-900">{formData.nid_or_passport}</span>
                <span className="text-slate-500">DOB:</span>
                <span className="font-semibold text-slate-900">{formData.date_of_birth}</span>
              </div>
              <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <span className="text-slate-500">Package:</span>
                <span className="font-semibold text-slate-900">{formData.package_type} ({formData.number_of_ownership} Share)</span>
                <span className="text-slate-500">Total Price:</span>
                <span className="font-bold text-[#006B3E]">৳ {formData.total_price.toLocaleString('en-IN')}</span>
                <span className="text-slate-500">Booking Money:</span>
                <span className="font-semibold text-slate-900">
                  ৳ {formData.booking_money.toLocaleString('en-IN')}
                  {formData.token_money > 0 ? ` (Token: ৳ ${formData.token_money.toLocaleString('en-IN')})` : ''}
                </span>
                <span className="text-slate-500">Remaining Rest Dues:</span>
                <span className="font-semibold text-slate-900">
                  ৳ {formData.dues_amount.toLocaleString('en-IN')}
                  {formData.number_of_installments > 0 ? ` (${formData.number_of_installments} EMIs)` : ''}
                </span>
              </div>
              <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <span className="text-slate-500">Primary Nominee:</span>
                <span className="font-semibold text-slate-900">{formData.nominees?.[0]?.full_name || '—'}</span>
                <span className="text-slate-500">Relation:</span>
                <span className="font-semibold text-slate-900">{formData.nominees?.[0]?.relation || '—'}</span>
                <span className="text-slate-500">Bank Account:</span>
                <span className="font-semibold text-slate-900">{formData.bank_name || '—'}</span>
                <span className="text-slate-500">Branch:</span>
                <span className="font-semibold text-slate-900">{formData.branch_name || '—'}</span>
              </div>
              {/* Uploaded Documents List in Step 8 */}
              <div className="p-3">
                <span className="text-slate-500 font-semibold block mb-2">Uploaded Attachments:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { type: 'applicant_photo', label: 'Applicant Photo' },
                    { type: 'nid_front', label: 'NID Front' },
                    { type: 'nid_back', label: 'NID Back' },
                    { type: 'nominee_photo', label: 'Nominee Photo' },
                    { type: 'nominee_nid', label: 'Nominee NID' },
                    { type: 'tin_certificate', label: 'e-TIN' },
                  ].map((doc) => {
                    const uploaded = getUploadedDoc(doc.type);
                    const isImage = isImageDoc(uploaded);
                    const isPdf = isPdfDoc(uploaded);

                    return (
                      <div
                        key={doc.type}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80 gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {uploaded ? (
                            isImage && uploaded.url ? (
                              <img
                                src={uploaded.url}
                                alt={doc.label}
                                className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                              />
                            ) : isPdf ? (
                              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                                <Icons.FileText className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                                <Icons.FileText className="w-4 h-4" />
                              </div>
                            )
                          ) : (
                            <div className="w-8 h-8 rounded-lg border border-dashed border-slate-300 flex items-center justify-center shrink-0 text-slate-400">
                              <Icons.Upload className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <span className="text-slate-700 font-medium truncate">{doc.label}:</span>
                        </div>
                        {uploaded ? (
                          <span className="text-emerald-700 font-semibold truncate text-[11px] shrink-0">
                            ✓ {uploaded.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px] shrink-0">Not uploaded</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Action Banner on Step 8 */}
            <div className="p-3.5 sm:p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-emerald-950">Ready to complete and confirm?</h4>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Make sure you have accepted the declaration above, then click below to review your full application before submission.
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  if (validateAllBeforeSubmit()) {
                    setIsReviewModalOpen(true);
                  }
                }}
                isLoading={isSubmitting}
                leftIcon={<Icons.Check className="w-4 h-4" />}
                className="w-full sm:w-auto shrink-0 justify-center font-bold bg-[#006B3E] hover:bg-[#005230] shadow-sm text-xs sm:text-sm min-h-[42px]"
              >
                Review &amp; Submit Application
              </Button>
            </div>
          </div>
        )}

        {/* STEP 9: Confirmation */}
        {currentStep === 9 && (
          <div className="text-center py-8 space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 bg-emerald-100 text-[#006B3E] rounded-full flex items-center justify-center mx-auto">
              <Icons.CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Application Submitted Successfully</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your application has been received and forwarded to our Customer Relations team for document verification.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 my-4">
              <span className="text-xs text-slate-500 block">Application Reference Number</span>
              <span className="text-lg font-mono font-bold text-[#006B3E] mt-1 block">
                {referenceNumber || existingApplication?.reference_number || (existingApplication as any)?.application_number || 'SKH-2026-00003'}
              </span>
              <div className="mt-3 flex items-center justify-center gap-2">
                <Badge status="submitted">Submitted</Badge>
                <span className="text-xs text-slate-400">&bull;</span>
                <span className="text-xs text-slate-500">{new Date().toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 font-bold text-slate-800 border-slate-300 hover:bg-slate-50"
                onClick={() => setIsReceiptModalOpen(true)}
                leftIcon={<Icons.Printer className="w-4 h-4 text-[#006B3E]" />}
              >
                Print / Save Receipt
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => router.push('/customer/dashboard')}
                rightIcon={<Icons.ArrowRight className="w-4 h-4" />}
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        {currentStep < 9 && (
          <div className="mt-8 pt-5 border-t border-slate-200 w-full">
            {/* Mobile Layout (< sm): App-like full width primary button & balanced secondary controls */}
            <div className="sm:hidden flex flex-col gap-2.5 w-full">
              {/* Primary Action Button */}
              <div>
                {currentStep < 8 ? (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleNext}
                    rightIcon={<Icons.ArrowRight className="w-4 h-4" />}
                    className="w-full justify-center text-sm font-bold shadow-md bg-[#006B3E] hover:bg-[#005230] min-h-[44px]"
                  >
                    Next Step
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      if (validateAllBeforeSubmit()) {
                        setIsReviewModalOpen(true);
                      }
                    }}
                    isLoading={isSubmitting}
                    leftIcon={<Icons.Check className="w-4 h-4" />}
                    className="w-full justify-center text-sm font-bold shadow-md bg-[#006B3E] hover:bg-[#005230] min-h-[46px]"
                  >
                    Review &amp; Submit Application
                  </Button>
                )}
              </div>

              {/* Secondary Controls: Previous and Save Draft */}
              <div className="flex items-center gap-2">
                {currentStep > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrev}
                    leftIcon={<Icons.ArrowLeft className="w-3.5 h-3.5" />}
                    className="flex-1 justify-center text-xs text-slate-700 border-slate-200 min-h-[38px]"
                  >
                    Previous
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSaveDraft(false)}
                  isLoading={isSavingDraft}
                  leftIcon={<Icons.FileText className="w-3.5 h-3.5" />}
                  className="flex-1 justify-center text-xs text-slate-600 hover:text-slate-900 border border-slate-200/80 bg-slate-50/50 min-h-[38px]"
                >
                  Save Draft
                </Button>
              </div>
            </div>

            {/* Desktop Layout (>= sm): Horizontal flex */}
            <div className="hidden sm:flex items-center justify-between gap-3 w-full">
              <div>
                {currentStep > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrev}
                    leftIcon={<Icons.ArrowLeft className="w-4 h-4" />}
                  >
                    Previous
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSaveDraft(false)}
                  isLoading={isSavingDraft}
                  leftIcon={<Icons.FileText className="w-4 h-4" />}
                >
                  Save Draft
                </Button>

                {currentStep < 8 ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleNext}
                    rightIcon={<Icons.ArrowRight className="w-4 h-4" />}
                  >
                    Next Step
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                      if (validateAllBeforeSubmit()) {
                        setIsReviewModalOpen(true);
                      }
                    }}
                    isLoading={isSubmitting}
                    leftIcon={<Icons.Check className="w-4 h-4" />}
                    className="font-bold bg-[#006B3E] hover:bg-[#005230]"
                  >
                    Review &amp; Submit Application
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Official Receipt Modal */}
      <ApplicationReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        data={{
          referenceNumber: referenceNumber || existingApplication?.reference_number || 'SKH-2026-00001',
          submissionDate: existingApplication?.submission_date || new Date().toISOString(),
          status: 'submitted',
          businessName: currentBusiness.name,
          businessCode: currentBusiness.code,
          applicantInfo: {
            full_name_en: formData.full_name_en,
            full_name_bn: formData.full_name_bn,
            father_name: formData.father_name,
            mother_name: formData.mother_name,
            spouse_name: formData.spouse_name,
            mobile_number: formData.mobile_number,
            phone_number: formData.phone_number,
            personal_email: formData.personal_email,
            nid_or_passport: formData.nid_or_passport,
            date_of_birth: formData.date_of_birth,
            nationality: formData.nationality,
            religion: formData.religion,
            present_address: formData.present_address,
            permanent_address: formData.permanent_address,
            company_name: formData.company_name,
            designation: formData.designation,
            office_address: formData.office_address,
          },
          ownershipDetail: {
            package: formData.package_type,
            package_type: formData.package_type,
            number_of_ownership: Number(formData.number_of_ownership),
            price_per_ownership: Number(formData.price_per_ownership),
            discount: Number(formData.discount_amount),
            discount_amount: Number(formData.discount_amount),
            total_price: Number(formData.total_price),
            amount_in_words: formData.amount_in_words,
          },
          paymentDetail: {
            token_money: Number(formData.token_money),
            booking_money: Number(formData.booking_money),
            booking_date: formData.booking_date,
            booking_installment_count: Number(formData.booking_installment_count) || 1,
            booking_installment_amount: Number(formData.booking_installment_amount) || 0,
            installment_type: formData.installment_type,
            number_of_installments: Number(formData.number_of_installments),
            installment_amount: Number(formData.installment_amount),
            installment_start_date: formData.installment_start_date,
            dues_amount: Number(formData.dues_amount),
          },
          bankDetail: {
            account_name: formData.account_name,
            account_number: formData.account_number,
            bank_name: formData.bank_name,
            branch_name: formData.branch_name,
          },
          nominees: formData.nominees,
          declarationAccepted: Boolean(formData.declaration_accepted),
        }}
      />
    </div>
  );
};

