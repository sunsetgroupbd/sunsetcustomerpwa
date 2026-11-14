'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Application, Business, PackagePricing, TermsAndConditions, Nominee } from '@/lib/types';
import { api } from '@/lib/api';
import { numberToWords } from '@/lib/number-to-words';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Icons } from '@/components/ui/Icons';

interface WizardProps {
  business: Business;
  existingApplication?: Application | null;
  onSuccess?: (application: Application) => void;
}

export const ApplicationWizard: React.FC<WizardProps> = ({
  business,
  existingApplication,
  onSuccess,
}) => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(existingApplication?.current_step || 1);
  const [applicationId, setApplicationId] = useState<string | null>(existingApplication?.id || null);
  const [referenceNumber, setReferenceNumber] = useState<string>(existingApplication?.reference_number || '');
  const [packages, setPackages] = useState<PackagePricing[]>([]);
  const [terms, setTerms] = useState<TermsAndConditions | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
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
    nid_or_passport: existingApplication?.applicant_info?.nid_or_passport || '',
    tin_number: existingApplication?.applicant_info?.tin_number || '',
    personal_email: existingApplication?.applicant_info?.personal_email || '',

    // Step 2: Profession / Occupation
    company_name: existingApplication?.applicant_info?.company_name || '',
    office_address: existingApplication?.applicant_info?.office_address || '',
    designation: existingApplication?.applicant_info?.designation || '',
    office_phone: existingApplication?.applicant_info?.office_phone || '',

    // Step 3: Nominees
    nominees: existingApplication?.nominees?.length
      ? existingApplication.nominees
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
    branch_name: existingApplication?.bank_detail?.branch_name || '',

    // Step 5: Ownership & Pricing
    package_type: existingApplication?.ownership_detail?.package_type || 'Silver',
    number_of_ownership: existingApplication?.ownership_detail?.number_of_ownership || 1,
    price_per_ownership: existingApplication?.ownership_detail?.price_per_ownership || 500000,
    discount_amount: existingApplication?.ownership_detail?.discount_amount || 0,
    total_price: existingApplication?.ownership_detail?.total_price || 500000,
    amount_in_words: existingApplication?.ownership_detail?.amount_in_words || 'Five Lakh Taka Only',

    // Step 6: Payment Information
    token_money: existingApplication?.payment_detail?.token_money || 50000,
    booking_money: existingApplication?.payment_detail?.booking_money || 150000,
    booking_date: existingApplication?.payment_detail?.booking_date || new Date().toISOString().split('T')[0],
    installment_type: existingApplication?.payment_detail?.installment_type || 'monthly',
    number_of_installments: existingApplication?.payment_detail?.number_of_installments || 12,
    installment_amount: existingApplication?.payment_detail?.installment_amount || 25000,
    installment_start_date: existingApplication?.payment_detail?.installment_start_date || '',
    dues_amount: existingApplication?.payment_detail?.dues_amount || 300000,

    // Step 8: Declaration
    declaration_accepted: false,
  });

  // Uploaded documents state
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, { id: string; name: string }>>({});
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);

  // Fetch package pricing and terms for this business
  useEffect(() => {
    async function loadConfig() {
      try {
        const [pkgData, termsData] = await Promise.all([
          api.businesses.getPackages(business.id).catch(() => []),
          api.businesses.getTerms(business.id).catch(() => null),
        ]);
        if (pkgData && pkgData.length > 0) {
          setPackages(pkgData);
          if (!existingApplication) {
            const firstPkg = pkgData[0];
            setFormData((prev) => ({
              ...prev,
              package_type: firstPkg.package_type,
              price_per_ownership: firstPkg.base_price,
              total_price: firstPkg.base_price * prev.number_of_ownership - prev.discount_amount,
              amount_in_words: numberToWords(firstPkg.base_price * prev.number_of_ownership - prev.discount_amount),
            }));
          }
        }
        if (termsData) {
          setTerms(termsData);
        }
      } catch (e) {
        console.error('Failed to load business packages or terms', e);
      }
    }
    loadConfig();
  }, [business.id, existingApplication]);

  // Recalculate Total Price and Words whenever package/qty/discount changes
  const updatePricing = (pkgType: string, qty: number, discount: number, pricePerUnit: number) => {
    const total = Math.max(0, qty * pricePerUnit - discount);
    const words = numberToWords(total);
    const dues = Math.max(0, total - (formData.token_money + formData.booking_money));
    const instAmt = formData.number_of_installments > 0 ? Math.round(dues / formData.number_of_installments) : 0;

    setFormData((prev) => ({
      ...prev,
      package_type: pkgType,
      number_of_ownership: qty,
      price_per_ownership: pricePerUnit,
      discount_amount: discount,
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

  // Validation
  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};

    if (step === 1) {
      if (!formData.full_name_en.trim()) errs.full_name_en = 'Full name (English) is required';
      if (!formData.father_name.trim()) errs.father_name = "Father's name is required";
      if (!formData.mother_name.trim()) errs.mother_name = "Mother's name is required";
      if (!formData.mobile_number.trim()) errs.mobile_number = 'Mobile number is required';
      if (!formData.date_of_birth) errs.date_of_birth = 'Date of birth is required';
      if (!formData.nid_or_passport.trim()) errs.nid_or_passport = 'NID or Passport number is required';
      if (!formData.present_address.trim()) errs.present_address = 'Present address is required';
      if (!formData.permanent_address.trim()) errs.permanent_address = 'Permanent address is required';
    } else if (step === 2) {
      if (!formData.company_name?.trim()) errs.company_name = 'Company name is required';
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
    } else if (step === 8) {
      if (!formData.declaration_accepted) {
        errs.declaration = 'You must accept the terms and conditions and declaration to submit.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Save draft to backend
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    setStatusMessage(null);
    try {
      const payload = {
        business_id: business.id,
        current_step: currentStep,
        applicant_info: {
          ownership_id: formData.ownership_id,
          application_date: formData.application_date,
          full_name_en: formData.full_name_en,
          full_name_bn: formData.full_name_bn,
          father_name: formData.father_name,
          mother_name: formData.mother_name,
          spouse_name: formData.spouse_name,
          present_address: formData.present_address,
          permanent_address: formData.permanent_address,
          mobile_number: formData.mobile_number,
          phone_number: formData.phone_number,
          date_of_birth: formData.date_of_birth,
          nationality: formData.nationality,
          religion: formData.religion,
          nid_or_passport: formData.nid_or_passport,
          tin_number: formData.tin_number,
          personal_email: formData.personal_email,
          company_name: formData.company_name,
          office_address: formData.office_address,
          designation: formData.designation,
          office_phone: formData.office_phone,
        },
        nominees: formData.nominees,
        bank_detail: {
          account_name: formData.account_name,
          account_number: formData.account_number,
          bank_name: formData.bank_name,
          branch_name: formData.branch_name,
        },
        ownership_detail: {
          package_type: formData.package_type,
          number_of_ownership: Number(formData.number_of_ownership),
          price_per_ownership: Number(formData.price_per_ownership),
          discount_amount: Number(formData.discount_amount),
          total_price: Number(formData.total_price),
          amount_in_words: formData.amount_in_words,
        },
        payment_detail: {
          token_money: Number(formData.token_money),
          booking_money: Number(formData.booking_money),
          booking_date: formData.booking_date,
          installment_type: formData.installment_type,
          number_of_installments: Number(formData.number_of_installments),
          installment_amount: Number(formData.installment_amount),
          installment_start_date: formData.installment_start_date,
          dues_amount: Number(formData.dues_amount),
        },
      };

      let result: Application;
      if (applicationId) {
        result = await api.applications.updateDraft(applicationId, payload as any);
      } else {
        result = await api.applications.createDraft(payload as any);
        setApplicationId(result.id);
        setReferenceNumber(result.reference_number);
      }
      setStatusMessage({ type: 'success', text: `Draft saved successfully (Ref: ${result.reference_number})` });
      return result;
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save draft' });
      return null;
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) return;

    // Automatically sync draft when moving steps
    const saved = await handleSaveDraft();
    if (saved || applicationId) {
      setCurrentStep((prev) => Math.min(prev + 1, 9));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit Application
  const handleSubmit = async () => {
    if (!validateStep(8)) return;
    if (!applicationId) {
      setStatusMessage({ type: 'error', text: 'Application draft not found. Please click Save Draft first.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const submitted = await api.applications.submit(applicationId, true);
      setReferenceNumber(submitted.reference_number);
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
      setUploadedDocs((prev) => ({
        ...prev,
        [docType]: { id: res.id, name: file.name },
      }));
      setStatusMessage({ type: 'success', text: `Uploaded ${file.name} successfully.` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'File upload failed' });
    } finally {
      setUploadingDocType(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Business Division */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold tracking-wider uppercase text-[#006B3E] bg-[#006B3E]/10 px-2 py-0.5 rounded">
            Division ID: {business.code}
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-1">{business.name}</h2>
          <p className="text-xs text-slate-500">Official Customer Ownership Registration Form</p>
        </div>
        {referenceNumber && (
          <div className="text-right">
            <span className="text-xs text-slate-500 block">Application Reference</span>
            <span className="text-sm font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 inline-block">
              {referenceNumber}
            </span>
          </div>
        )}
      </div>

      {/* Mobile App Stepper */}
      <div className="md:hidden bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-bold text-[#006B3E] uppercase tracking-wider text-[11px] bg-[#006B3E]/10 px-2 py-0.5 rounded">
            Step {currentStep} of {steps.length}
          </span>
          <span className="font-bold text-slate-800">{steps[currentStep - 1].title}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-[#006B3E] h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop Stepper */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-xl p-4 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[720px]">
          {steps.map((s, idx) => {
            const isCompleted = currentStep > s.number;
            const isCurrent = currentStep === s.number;
            const Icon = s.icon;
            return (
              <React.Fragment key={s.number}>
                <div className="flex flex-col items-center text-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                      isCompleted
                        ? 'bg-[#006B3E] text-white'
                        : isCurrent
                        ? 'border-2 border-[#006B3E] text-[#006B3E] bg-white ring-4 ring-[#006B3E]/10'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Icons.Check className="w-4 h-4 text-white" /> : s.number}
                  </div>
                  <span
                    className={`text-[11px] font-medium mt-1.5 whitespace-nowrap ${
                      isCurrent ? 'text-slate-900 font-semibold' : 'text-slate-500'
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      currentStep > idx + 1 ? 'bg-[#006B3E]' : 'bg-slate-200'
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
                label="Company / Organization Name"
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                error={errors.company_name}
                placeholder="e.g. Grameenphone Ltd / Business Owner"
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
                label="Office Contact / Cell Number"
                value={formData.office_phone}
                onChange={(e) => setFormData({ ...formData, office_phone: e.target.value })}
                placeholder="Office Phone or extension"
              />
              <div className="sm:col-span-2">
                <Textarea
                  label="Office / Workplace Address"
                  rows={2}
                  value={formData.office_address}
                  onChange={(e) => setFormData({ ...formData, office_address: e.target.value })}
                  placeholder="Plot/Road, Commercial Area, City"
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
                Select your desired ownership package for {business.name}.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {['Bronze', 'Silver', 'Gold', 'Platinum'].map((pkg) => {
                const isSelected = formData.package_type.toLowerCase() === pkg.toLowerCase();
                const matchedPkg = packages.find((p) => p.package_type.toLowerCase() === pkg.toLowerCase());
                const price = matchedPkg ? matchedPkg.base_price : pkg === 'Bronze' ? 300000 : pkg === 'Silver' ? 500000 : pkg === 'Gold' ? 800000 : 1200000;

                return (
                  <div
                    key={pkg}
                    onClick={() => updatePricing(pkg, formData.number_of_ownership, formData.discount_amount, price)}
                    className={`cursor-pointer p-4 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-[#006B3E] bg-[#006B3E]/5 ring-2 ring-[#006B3E]'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Package</span>
                    <h4 className="text-lg font-bold text-slate-900 mt-1">{pkg}</h4>
                    <p className="text-sm font-semibold text-[#006B3E] mt-2">
                      ৳ {price.toLocaleString('en-IN')}
                    </p>
                    <span className="text-[11px] text-slate-400 mt-1 block">per ownership share</span>
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
                <span className="text-xs font-semibold text-slate-800">{formData.amount_in_words}</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Payment Information */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900">Step 6: Payment Schedule &amp; Installments</h3>
              <p className="text-xs text-slate-500">Configure down payment and installment preferences.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Token Money (BDT)"
                type="number"
                value={formData.token_money}
                onChange={(e) => {
                  const tm = parseFloat(e.target.value) || 0;
                  const dues = Math.max(0, formData.total_price - (tm + formData.booking_money));
                  const instAmt = formData.number_of_installments > 0 ? Math.round(dues / formData.number_of_installments) : 0;
                  setFormData({ ...formData, token_money: tm, dues_amount: dues, installment_amount: instAmt });
                }}
              />
              <Input
                label="Booking Money (BDT)"
                type="number"
                value={formData.booking_money}
                onChange={(e) => {
                  const bm = parseFloat(e.target.value) || 0;
                  const dues = Math.max(0, formData.total_price - (formData.token_money + bm));
                  const instAmt = formData.number_of_installments > 0 ? Math.round(dues / formData.number_of_installments) : 0;
                  setFormData({ ...formData, booking_money: bm, dues_amount: dues, installment_amount: instAmt });
                }}
              />
              <Input
                label="Booking Money Date"
                type="date"
                value={formData.booking_date}
                onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100">
              <Select
                label="Installment Type"
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
                label="Number of Installments"
                type="number"
                min={1}
                max={60}
                value={formData.number_of_installments}
                onChange={(e) => {
                  const n = parseInt(e.target.value) || 1;
                  const instAmt = n > 0 ? Math.round(formData.dues_amount / n) : 0;
                  setFormData({ ...formData, number_of_installments: n, installment_amount: instAmt });
                }}
              />
              <Input
                label="Calculated Installment (BDT)"
                type="number"
                value={formData.installment_amount}
                onChange={(e) => setFormData({ ...formData, installment_amount: parseFloat(e.target.value) || 0 })}
              />
              <Input
                label="Installment Starting Date"
                type="date"
                value={formData.installment_start_date}
                onChange={(e) => setFormData({ ...formData, installment_start_date: e.target.value })}
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">Remaining Dues Balance</span>
                <span className="text-xl font-bold text-slate-900">
                  ৳ {formData.dues_amount.toLocaleString('en-IN')}
                </span>
              </div>
              <Badge variant="warning">Payable via selected installments</Badge>
            </div>
          </div>
        )}

        {/* STEP 7: Documents & Attachments */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900">Step 7: Document Uploads &amp; Attachments</h3>
              <p className="text-xs text-slate-500">
                Upload clear scanned copies or photographs (JPG, PNG, PDF up to 10MB).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { type: 'applicant_photo', label: 'Applicant Photograph', required: true },
                { type: 'nid_front', label: 'NID Front / Passport Page', required: true },
                { type: 'nid_back', label: 'NID Back Side', required: false },
                { type: 'nominee_photo', label: 'Nominee Photograph', required: true },
                { type: 'nominee_nid', label: 'Nominee NID / Passport', required: true },
                { type: 'tin_certificate', label: 'e-TIN Certificate (Optional)', required: false },
              ].map((doc) => {
                const uploaded = uploadedDocs[doc.type];
                const isCurrentUploading = uploadingDocType === doc.type;

                return (
                  <div
                    key={doc.type}
                    className="p-4 border border-slate-200 rounded-xl bg-white flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-800">
                          {doc.label} {doc.required && <span className="text-rose-500">*</span>}
                        </span>
                        {uploaded && <Badge status="verified">Uploaded</Badge>}
                      </div>
                      <p className="text-[11px] text-slate-500 mb-4">
                        {uploaded ? uploaded.name : 'No file selected yet.'}
                      </p>
                    </div>

                    <div>
                      <label className="cursor-pointer inline-flex items-center justify-center w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors">
                        {isCurrentUploading ? (
                          <Icons.Spinner className="w-4 h-4 text-[#006B3E]" />
                        ) : (
                          <>
                            <Icons.Upload className="w-3.5 h-3.5 mr-1.5" />
                            {uploaded ? 'Replace Document' : 'Upload File'}
                          </>
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
                Terms and Conditions — {business.name} (Version {terms?.version || '1.0'})
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
                  I solemnly declare that the particulars furnished above are true and correct to the best of my knowledge and belief. I agree to abide by the rules and regulations of Sunset Group and {business.name}.
                </span>
              </label>
              {errors.declaration && (
                <p className="text-xs text-rose-600 font-semibold mt-2">{errors.declaration}</p>
              )}
            </div>

            {/* Structured Summary Review */}
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
              <div className="p-3 bg-slate-50 font-bold text-slate-800">Summary Review</div>
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
                <span className="font-semibold text-slate-900">৳ {formData.booking_money.toLocaleString('en-IN')}</span>
                <span className="text-slate-500">Remaining Dues:</span>
                <span className="font-semibold text-slate-900">৳ {formData.dues_amount.toLocaleString('en-IN')}</span>
              </div>
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
                {referenceNumber || 'SKH-2026-00001'}
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
                className="flex-1"
                onClick={() => window.print()}
                leftIcon={<Icons.Download className="w-4 h-4" />}
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
          <div className="sticky bottom-16 md:static z-20 bg-white/95 md:bg-transparent backdrop-blur-md border-t border-slate-200 md:border-t md:border-slate-100 -mx-5 -mb-5 p-4 md:p-0 md:m-0 md:pt-5 md:mt-6 flex items-center justify-between shadow-md md:shadow-none">
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
                onClick={handleSaveDraft}
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
                  onClick={handleSubmit}
                  isLoading={isSubmitting}
                  leftIcon={<Icons.Check className="w-4 h-4" />}
                >
                  Submit Application
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

