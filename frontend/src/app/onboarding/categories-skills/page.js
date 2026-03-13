'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  X, 
  ChevronDown, 
  Search, 
  Plus, 
  ArrowRight, 
  ArrowLeft,
  User,
  AlertCircle
} from 'lucide-react';
import { getStoredAuth, saveAuth } from '@/services/auth';
import { saveCategoriesAndSkills } from '@/services/api';

const mainCategories = [
  "Web, Mobile & Software Development",
  "Design & Creative",
  "Writing & Translation",
  "Sales & Marketing",
  "AI & Data Science",
  "Finance & Accounting"
];

const subCategoryMap = {
  "Web, Mobile & Software Development": [
    "Blockchain, NFT & Cryptocurrency",
    "AI Apps & Integration",
    "Desktop Application Development",
    "Ecommerce Development",
    "Game Design & Development",
    "Mobile Development",
    "Other - Software Development",
    "Product Management & Scrum",
    "QA Testing",
    "Scripts & Utilities",
    "Web & Mobile Design",
    "Web Development"
  ],
  "Design & Creative": [
    "Graphic Design",
    "UI/UX Design",
    "Illustration",
    "Video Production",
    "Motion Graphics",
    "Logo Design",
    "Photography"
  ]
};

const suggestedSkills = [
  "International Development",
  "Product Development",
  "Web Application",
  "Web Development",
  "Abaqus",
  "Agavi",
  "Autodesk Revit",
  "Brewmaxx",
  "Ecommerce",
  "Ecommerce Website"
];

export default function CategoriesAndSkillsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(mainCategories[0]);
  const [selectedSubCategories, setSelectedSubCategories] = useState([]);
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hourlyRate, setHourlyRate] = useState('0.00');

  const serviceFee = (parseFloat(hourlyRate) * 0.10).toFixed(2);
  const totalEarnings = (parseFloat(hourlyRate) - parseFloat(serviceFee)).toFixed(2);
  const isRateValid = parseFloat(hourlyRate) >= 3 && parseFloat(hourlyRate) <= 999;

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth || !auth.token) {
      router.replace('/login');
      return;
    }
    if (auth.user?.onboardingCompleted) {
      if (auth.user.role === 'freelancer') {
        router.replace('/dashboard/freelancer');
      } else {
        router.replace('/dashboard/employer');
      }
      return;
    }

    if (auth.user?.role !== 'freelancer') {
      router.replace('/dashboard/employer');
      return;
    }
    setUser(auth.user);
  }, [router]);

  const handleSubCategoryToggle = (sub) => {
    if (selectedSubCategories.includes(sub)) {
      setSelectedSubCategories(selectedSubCategories.filter(s => s !== sub));
    } else {
      setSelectedSubCategories([...selectedSubCategories, sub]);
    }
  };

  const handleAddSkill = (skill) => {
    const normalizedSkill = skill.trim();
    if (!normalizedSkill) return;
    if (skills.length >= 15) return;
    if (skills.some(s => s.toLowerCase() === normalizedSkill.toLowerCase())) {
        setSkillInput('');
        return;
    }
    setSkills([...skills, normalizedSkill]);
    setSkillInput('');
  };

  const removeSkill = (index) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill(skillInput);
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (selectedSubCategories.length === 0) {
      setError('Please select at least one sub-category.');
      return;
    }
    if (skills.length < 3) {
      setError('Please add at least 3 skills.');
      return;
    }
    if (!isRateValid) {
      setError('Please enter a valid hourly rate between $3.00 and $999.00.');
      return;
    }

    try {
      setLoading(true);
      const auth = getStoredAuth();
      const response = await saveCategoriesAndSkills({
        userId: auth.user._id,
        category: selectedCategory,
        subCategories: selectedSubCategories,
        skills: skills,
        hourlyRate: parseFloat(hourlyRate)
      });

      // Update local storage
      saveAuth({
        token: auth.token,
        user: response.data.user
      });

      router.push('/onboarding/profile-details');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900 overflow-x-hidden">
      {/* Header */}
      <header className="w-full px-8 py-4 flex items-center justify-between border-b border-slate-100 bg-white sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-black tracking-tighter cursor-default lowercase">synapEscrow</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
            <User size={20} />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center py-10 px-4 sm:px-6 w-full max-w-4xl mx-auto mb-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="w-full text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-6 tracking-tight">Great! Let's find you the right jobs</h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Based on your experience, we suggested some categories and skills to get you started.
          </p>
        </div>

        <div className="w-full space-y-16">
          {/* Category Selection Section */}
          <section className="space-y-8">
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Type of work you do</h2>
              <p className="text-slate-500">
                Choose the category that best describes your work. It's OK if it's not a perfect match. You can add more details on the next step.
              </p>
            </div>

            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Category</label>
                <div className="relative max-w-md">
                  <select 
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedSubCategories([]);
                    }}
                    className="w-full appearance-none px-4 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all font-medium text-slate-700 cursor-pointer shadow-sm"
                  >
                    {mainCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                </div>
              </div>

              {subCategoryMap[selectedCategory] && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                  {subCategoryMap[selectedCategory].map(sub => (
                    <label 
                      key={sub}
                      className="flex items-center gap-3 group cursor-pointer"
                    >
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox"
                          className="peer appearance-none h-6 w-6 border-2 border-slate-300 rounded hover:border-green-600 checked:bg-green-600 checked:border-green-600 transition-all cursor-pointer"
                          checked={selectedSubCategories.includes(sub)}
                          onChange={() => handleSubCategoryToggle(sub)}
                        />
                        <X size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                      </div>
                      <span className="text-[15px] font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{sub}</span>
                    </label>
                  ))}
                  <label className="flex items-center gap-3 group cursor-pointer">
                    <input type="checkbox" className="peer appearance-none h-6 w-6 border-2 border-slate-300 rounded hover:border-green-600 cursor-pointer" />
                    <span className="text-[15px] font-medium text-slate-600 group-hover:text-slate-900 transition-colors">Other - Software Development</span>
                  </label>
                </div>
              )}
            </div>
          </section>

          {/* Skills Section */}
          <section className="space-y-8">
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Skills</h2>
              <p className="text-slate-500">
                Add at least 3 skills that fit the type of work you want to do. You can always change them later.
              </p>
            </div>

            <div className="space-y-6">
              <div className="relative group">
                <div className="flex flex-wrap items-center gap-2 p-4 min-h-[64px] bg-white border border-slate-300 rounded-xl group-focus-within:ring-2 group-focus-within:ring-green-600/20 group-focus-within:border-green-600 transition-all shadow-sm">
                  {skills.map((skill, index) => (
                    <span key={index} className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-full text-sm font-bold animate-in zoom-in-75 duration-300">
                      {skill}
                      <button 
                        onClick={() => removeSkill(index)}
                        className="p-0.5 hover:bg-white/20 rounded-full transition-colors"
                      >
                        <X size={14} className="stroke-[3]" />
                      </button>
                    </span>
                  ))}
                  <input 
                    type="text"
                    className="flex-1 outline-none text-base font-medium text-slate-700 min-w-[200px] bg-transparent"
                    placeholder={skills.length === 0 ? "Enter skills here" : ""}
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>
                <div className="absolute right-2 -bottom-6 text-[11px] font-bold text-slate-400">
                  {skills.length}/15 skills
                </div>
              </div>

              <div className="pt-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {suggestedSkills.filter(s => !skills.includes(s)).map(skill => (
                    <button 
                      key={skill}
                      onClick={() => handleAddSkill(skill)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-300 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-95 shadow-sm group"
                    >
                      <Plus size={16} className="text-slate-400 group-hover:text-slate-600" />
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Hourly Rate Section */}
          <section className="space-y-8">
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Hourly rate</h2>
              <p className="text-slate-500 leading-relaxed">
                Clients will see your rate on your profile and in search results. You can adjust it for each job. <span className="text-green-600 font-medium cursor-pointer hover:underline">Service fees</span> vary and will always be shown before you accept a contract.
              </p>
            </div>

            <div className="space-y-6 max-w-3xl">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-12">
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-bold text-slate-800">Hourly rate</label>
                  </div>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                    <input 
                      type="number"
                      step="0.01"
                      className="w-full pl-8 pr-12 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all font-medium text-slate-700 shadow-sm text-right"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      placeholder="0.00"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">/hr</span>
                  </div>
                </div>

                <div className="hidden sm:flex items-center pt-8">
                  <span className="text-2xl text-slate-400 font-light">—</span>
                </div>

                <div className="flex-1 space-y-2">
                  <label className="text-sm font-bold text-slate-800">Upwork service fee</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                    <input 
                      type="text"
                      className="w-full pl-8 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-400 shadow-sm text-right cursor-not-allowed"
                      value={serviceFee}
                      readOnly
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">/hr</span>
                  </div>
                </div>

                <div className="hidden sm:flex items-center pt-8">
                  <span className="text-2xl text-slate-400 font-light">=</span>
                </div>

                <div className="flex-1 space-y-2">
                  <label className="text-sm font-bold text-slate-800">Total earnings</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                    <input 
                      type="text"
                      className="w-full pl-8 pr-12 py-3 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 shadow-sm text-right focus:outline-none cursor-default"
                      value={totalEarnings}
                      readOnly
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">/hr</span>
                  </div>
                </div>
              </div>

              {!isRateValid && (
                <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 animate-in fade-in slide-in-from-left-2">
                  <AlertCircle size={18} />
                  <span className="text-sm font-bold tracking-tight">Enter a rate between $3.00 and $999.00.</span>
                </div>
              )}
            </div>
          </section>

          {error && <p className="text-sm font-bold text-rose-600 animate-in shake duration-300 text-center">{error}</p>}
        </div>
      </main>

      {/* Persistent Sticky Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-4 flex items-center justify-between z-50">
        <button 
          onClick={() => router.back()}
          className="px-8 py-2 rounded-lg font-bold border border-slate-300 text-slate-600 hover:bg-slate-50 transition active:scale-95"
        >
          Back
        </button>
        <button 
          onClick={handleSubmit}
          disabled={loading || selectedSubCategories.length === 0 || skills.length < 3 || !isRateValid}
          className="px-12 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold transition shadow-sm disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none hover:scale-105 active:scale-95 min-w-[140px]"
        >
          {loading ? 'Saving...' : 'Next'}
        </button>
      </footer>
    </div>
  );
}
