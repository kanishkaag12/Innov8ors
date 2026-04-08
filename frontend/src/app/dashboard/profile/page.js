'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { getStoredAuth, saveAuth } from '@/services/auth';
import { getProfile, updateProfile } from '@/services/api';

const EXPERIENCE_LEVELS = ['junior', 'mid', 'senior'];
const PROJECT_TYPES = ['fixed', 'hourly'];

const createFreelancerForm = (profile = {}) => ({
  fullName: profile.freelancerProfile?.fullName || profile.name || '',
  email: profile.email || '',
  headline: profile.freelancerProfile?.headline || '',
  bio: profile.freelancerProfile?.bio || '',
  location: profile.freelancerProfile?.location || '',
  availability: profile.freelancerProfile?.availability || '',
  skills: (profile.freelancerProfile?.skills || []).join(', '),
  interests: (profile.freelancerProfile?.interests || []).join(', '),
  primaryCategory: profile.freelancerProfile?.primaryCategory || '',
  preferredCategories: (profile.freelancerProfile?.preferredCategories || []).join(', '),
  preferredProjectType: profile.freelancerProfile?.preferredProjectType || '',
  experienceLevel: profile.freelancerProfile?.experienceLevel || '',
  preferredBudgetMin: profile.freelancerProfile?.preferredBudgetMin ?? '',
  preferredBudgetMax: profile.freelancerProfile?.preferredBudgetMax ?? '',
  portfolioLinks: (profile.freelancerProfile?.portfolioLinks || []).join(', '),
  languages: (profile.freelancerProfile?.languages || []).join(', ')
});

const createEmployerForm = (profile = {}) => ({
  fullName: profile.employerProfile?.fullName || profile.name || '',
  email: profile.email || '',
  companyName: profile.employerProfile?.companyName || profile.companyName || '',
  about: profile.employerProfile?.about || '',
  location: profile.employerProfile?.location || '',
  website: profile.employerProfile?.website || profile.website || '',
  industry: profile.employerProfile?.industry || '',
  hiringInterests: (profile.employerProfile?.hiringInterests || []).join(', '),
  preferredFreelancerCategories: (profile.employerProfile?.preferredFreelancerCategories || []).join(', '),
  companySize: profile.employerProfile?.companySize || profile.companySize || '',
  hiringGoals: profile.employerProfile?.hiringGoals || '',
  verificationInfo: profile.employerProfile?.verificationInfo || ''
});

const parseList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

function Field({ label, children, helper }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700">{label}</label>
      {children}
      {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
    />
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
    />
  );
}

function SelectInput(props) {
  return (
    <select
      {...props}
      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
    />
  );
}

export default function ProfilePage() {
  const [auth, setAuth] = useState(null);
  const [profile, setProfile] = useState(null);
  const [freelancerForm, setFreelancerForm] = useState(createFreelancerForm());
  const [employerForm, setEmployerForm] = useState(createEmployerForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const role = auth?.user?.role;
  const isFreelancer = role === 'freelancer';
  const pageTitle = isFreelancer ? 'Freelancer Profile' : 'Employer Profile';
  const pageDescription = isFreelancer
    ? 'Keep your freelancer profile accurate so AI matching and Find Work recommendations stay relevant.'
    : 'Manage your employer profile so projects show the right contact and company details.';

  useEffect(() => {
    const stored = getStoredAuth();
    setAuth(stored);

    if (!stored?.token) {
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        const response = await getProfile(stored.token);
        const nextProfile = response.data.profile;
        setProfile(nextProfile);
        setFreelancerForm(createFreelancerForm(nextProfile));
        setEmployerForm(createEmployerForm(nextProfile));
        saveAuth({ token: stored.token, user: nextProfile });
      } catch (error) {
        setFeedback({
          type: 'error',
          message: error?.response?.data?.message || 'Unable to load your profile right now.'
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const currentForm = useMemo(() => (isFreelancer ? freelancerForm : employerForm), [isFreelancer, freelancerForm, employerForm]);

  const handleFreelancerChange = (field, value) => {
    setFreelancerForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEmployerChange = (field, value) => {
    setEmployerForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    if (isFreelancer) {
      if (!freelancerForm.fullName.trim()) return 'Full name is required.';
      if (!freelancerForm.headline.trim()) return 'Headline is required.';
      if (!freelancerForm.bio.trim()) return 'Bio is required.';
      if (
        freelancerForm.preferredBudgetMin !== '' &&
        freelancerForm.preferredBudgetMax !== '' &&
        Number(freelancerForm.preferredBudgetMin) > Number(freelancerForm.preferredBudgetMax)
      ) {
        return 'Preferred budget minimum cannot be greater than preferred budget maximum.';
      }
      return '';
    }

    if (!employerForm.fullName.trim()) return 'Full name is required.';
    if (!employerForm.companyName.trim()) return 'Company name is required.';
    return '';
  };

  const handleSave = async () => {
    const stored = getStoredAuth();
    if (!stored?.token) {
      setFeedback({ type: 'error', message: 'Please log in to update your profile.' });
      return;
    }

    const validationMessage = validate();
    if (validationMessage) {
      setFeedback({ type: 'error', message: validationMessage });
      return;
    }

    setSaving(true);
    setFeedback({ type: '', message: '' });

    try {
      const payload = isFreelancer
        ? {
            freelancerProfile: {
              fullName: freelancerForm.fullName,
              headline: freelancerForm.headline,
              bio: freelancerForm.bio,
              location: freelancerForm.location,
              availability: freelancerForm.availability,
              skills: parseList(freelancerForm.skills),
              interests: parseList(freelancerForm.interests),
              primaryCategory: freelancerForm.primaryCategory,
              preferredCategories: parseList(freelancerForm.preferredCategories),
              preferredProjectType: freelancerForm.preferredProjectType,
              experienceLevel: freelancerForm.experienceLevel,
              preferredBudgetMin: freelancerForm.preferredBudgetMin,
              preferredBudgetMax: freelancerForm.preferredBudgetMax,
              portfolioLinks: parseList(freelancerForm.portfolioLinks),
              languages: parseList(freelancerForm.languages)
            }
          }
        : {
            employerProfile: {
              fullName: employerForm.fullName,
              companyName: employerForm.companyName,
              about: employerForm.about,
              location: employerForm.location,
              website: employerForm.website,
              industry: employerForm.industry,
              hiringInterests: parseList(employerForm.hiringInterests),
              preferredFreelancerCategories: parseList(employerForm.preferredFreelancerCategories),
              companySize: employerForm.companySize,
              hiringGoals: employerForm.hiringGoals,
              verificationInfo: employerForm.verificationInfo
            }
          };

      const response = await updateProfile(payload, stored.token);
      const updatedProfile = response.data.profile;

      setProfile(updatedProfile);
      setFreelancerForm(createFreelancerForm(updatedProfile));
      setEmployerForm(createEmployerForm(updatedProfile));
      saveAuth({ token: stored.token, user: updatedProfile });
      setAuth({ token: stored.token, user: updatedProfile });
      setFeedback({ type: 'success', message: 'Profile saved successfully.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error?.response?.data?.message || 'Failed to save profile.'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-600">
        <Loader2 className="mr-3 h-5 w-5 animate-spin" />
        Loading profile...
      </div>
    );
  }

  if (!auth?.token) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="mt-3 text-slate-600">Please log in to manage your profile.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">{pageTitle}</h1>
        <p className="mt-2 text-sm text-slate-600">{pageDescription}</p>
      </div>

      {feedback.message && (
        <div
          className={`rounded-2xl border px-4 py-4 text-sm font-medium ${
            feedback.type === 'success'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
              : feedback.type === 'error'
              ? 'border-rose-300 bg-rose-50 text-rose-800'
              : 'border-slate-300 bg-slate-50 text-slate-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {isFreelancer ? (
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Basic Info</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label="Full Name">
                <TextInput value={freelancerForm.fullName} onChange={(e) => handleFreelancerChange('fullName', e.target.value)} />
              </Field>
              <Field label="Email">
                <TextInput value={freelancerForm.email} readOnly disabled />
              </Field>
              <Field label="Headline">
                <TextInput
                  value={freelancerForm.headline}
                  onChange={(e) => handleFreelancerChange('headline', e.target.value)}
                  placeholder="Full-stack developer specializing in AI-powered marketplaces"
                />
              </Field>
              <Field label="Location">
                <TextInput value={freelancerForm.location} onChange={(e) => handleFreelancerChange('location', e.target.value)} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Bio">
                  <TextArea
                    rows={5}
                    value={freelancerForm.bio}
                    onChange={(e) => handleFreelancerChange('bio', e.target.value)}
                    placeholder="Describe your strengths, tools, industries, and project outcomes."
                  />
                </Field>
              </div>
              <Field label="Availability">
                <TextInput
                  value={freelancerForm.availability}
                  onChange={(e) => handleFreelancerChange('availability', e.target.value)}
                  placeholder="Available 20 hrs/week"
                />
              </Field>
              <Field label="Languages">
                <TextInput
                  value={freelancerForm.languages}
                  onChange={(e) => handleFreelancerChange('languages', e.target.value)}
                  placeholder="English, Hindi"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Professional Info</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label="Skills" helper="Comma-separated values used for AI matching.">
                <TextInput
                  value={freelancerForm.skills}
                  onChange={(e) => handleFreelancerChange('skills', e.target.value)}
                  placeholder="React, Node.js, MongoDB"
                />
              </Field>
              <Field label="Interests">
                <TextInput
                  value={freelancerForm.interests}
                  onChange={(e) => handleFreelancerChange('interests', e.target.value)}
                  placeholder="AI products, fintech, marketplaces"
                />
              </Field>
              <Field label="Primary Category">
                <TextInput
                  value={freelancerForm.primaryCategory}
                  onChange={(e) => handleFreelancerChange('primaryCategory', e.target.value)}
                  placeholder="Web Development"
                />
              </Field>
              <Field label="Preferred Categories">
                <TextInput
                  value={freelancerForm.preferredCategories}
                  onChange={(e) => handleFreelancerChange('preferredCategories', e.target.value)}
                  placeholder="Web Development, AI Development"
                />
              </Field>
              <Field label="Preferred Project Type">
                <SelectInput
                  value={freelancerForm.preferredProjectType}
                  onChange={(e) => handleFreelancerChange('preferredProjectType', e.target.value)}
                >
                  <option value="">Select project type</option>
                  {PROJECT_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option[0].toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Experience Level">
                <SelectInput
                  value={freelancerForm.experienceLevel}
                  onChange={(e) => handleFreelancerChange('experienceLevel', e.target.value)}
                >
                  <option value="">Select experience level</option>
                  {EXPERIENCE_LEVELS.map((option) => (
                    <option key={option} value={option}>
                      {option[0].toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Preferred Budget Min">
                <TextInput
                  type="number"
                  min="0"
                  value={freelancerForm.preferredBudgetMin}
                  onChange={(e) => handleFreelancerChange('preferredBudgetMin', e.target.value)}
                />
              </Field>
              <Field label="Preferred Budget Max">
                <TextInput
                  type="number"
                  min="0"
                  value={freelancerForm.preferredBudgetMax}
                  onChange={(e) => handleFreelancerChange('preferredBudgetMax', e.target.value)}
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Portfolio Links" helper="Comma-separated links to your portfolio, GitHub, Behance, or case studies.">
                  <TextInput
                    value={freelancerForm.portfolioLinks}
                    onChange={(e) => handleFreelancerChange('portfolioLinks', e.target.value)}
                    placeholder="https://github.com/you, https://portfolio.example.com"
                  />
                </Field>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Basic Info</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label="Full Name">
                <TextInput value={employerForm.fullName} onChange={(e) => handleEmployerChange('fullName', e.target.value)} />
              </Field>
              <Field label="Email">
                <TextInput value={employerForm.email} readOnly disabled />
              </Field>
              <Field label="Company Name">
                <TextInput value={employerForm.companyName} onChange={(e) => handleEmployerChange('companyName', e.target.value)} />
              </Field>
              <Field label="Website">
                <TextInput
                  value={employerForm.website}
                  onChange={(e) => handleEmployerChange('website', e.target.value)}
                  placeholder="https://company.example"
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="About">
                  <TextArea
                    rows={5}
                    value={employerForm.about}
                    onChange={(e) => handleEmployerChange('about', e.target.value)}
                    placeholder="Tell freelancers about your company, products, and hiring style."
                  />
                </Field>
              </div>
              <Field label="Location">
                <TextInput value={employerForm.location} onChange={(e) => handleEmployerChange('location', e.target.value)} />
              </Field>
              <Field label="Industry / Domain">
                <TextInput value={employerForm.industry} onChange={(e) => handleEmployerChange('industry', e.target.value)} />
              </Field>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Business Info</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label="Hiring Interests">
                <TextInput
                  value={employerForm.hiringInterests}
                  onChange={(e) => handleEmployerChange('hiringInterests', e.target.value)}
                  placeholder="React, UI/UX, AI engineering"
                />
              </Field>
              <Field label="Preferred Freelancer Categories">
                <TextInput
                  value={employerForm.preferredFreelancerCategories}
                  onChange={(e) => handleEmployerChange('preferredFreelancerCategories', e.target.value)}
                  placeholder="Web Development, Design"
                />
              </Field>
              <Field label="Company Size">
                <TextInput value={employerForm.companySize} onChange={(e) => handleEmployerChange('companySize', e.target.value)} />
              </Field>
              <Field label="Verification / Trust Info">
                <TextInput
                  value={employerForm.verificationInfo}
                  onChange={(e) => handleEmployerChange('verificationInfo', e.target.value)}
                  placeholder="LinkedIn verified, GST registered, etc."
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Hiring Goals">
                  <TextArea
                    rows={4}
                    value={employerForm.hiringGoals}
                    onChange={(e) => handleEmployerChange('hiringGoals', e.target.value)}
                    placeholder="What kinds of freelancers and outcomes are you looking for?"
                  />
                </Field>
              </div>
            </div>
          </section>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !currentForm}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}
