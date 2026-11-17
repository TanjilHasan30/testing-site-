import React, { useCallback, useEffect, useState } from 'react';
import { Baby, Bell, CheckSquare, Plus, Ruler, Scale, Shield, Syringe, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  calculateBabyAgeMonths,
  evaluateGrowthBand,
  formatCount,
  validateBabyReminderInput,
} from '../lib/domain';
import type { BabyProfile, BabyReminder } from '../types/platform';

const MILESTONES = [
  { key: 'social_smile', en: 'Social Smile (2m)', bn: 'সামাজিক হাসি (২ মাস)' },
  { key: 'head_steady', en: 'Holds Head Steady (4m)', bn: 'মাথা সোজা রাখা (৪ মাস)' },
  { key: 'rolls_over', en: 'Rolls Over (5m)', bn: 'পাশ ফেরা (৫ মাস)' },
  { key: 'sits_with_support', en: 'Sits With Support (6m)', bn: 'সাহায্য নিয়ে বসা (৬ মাস)' },
  { key: 'babbles', en: 'Babbles Consonants (8m)', bn: 'আধো আধো শব্দ বলা (৮ মাস)' },
  { key: 'stands_holding', en: 'Pulls to Stand (10m)', bn: 'ধরে দাঁড়ানো (১০ মাস)' },
];

export const BabyTrackerPage: React.FC = () => {
  const { lang, apiFetch, showToast } = useApp();
  const [babies, setBabies] = useState<BabyProfile[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [showAddBaby, setShowAddBaby] = useState(false);
  const [babyName, setBabyName] = useState('');
  const [babyDob, setBabyDob] = useState('2026-06-01');
  const [babyGender, setBabyGender] = useState<'girl' | 'boy' | 'unspecified'>('girl');

  const [weightKg, setWeightKg] = useState('7.9');
  const [heightCm, setHeightCm] = useState('67.5');
  const [sleepHours, setSleepHours] = useState('13');
  const [feedingNotes, setFeedingNotes] = useState('');

  const [remTitle, setRemTitle] = useState('');
  const [remCategory, setRemCategory] = useState<BabyReminder['category']>('vaccine');
  const [remDueDate, setRemDueDate] = useState('2026-11-28');
  const [remDueTime, setRemDueTime] = useState('10:00');

  const loadBabies = useCallback(async () => {
    const list = await apiFetch<BabyProfile[]>('/api/v1/babies');
    setBabies(list);
    if (list.length > 0 && !list.some((b) => b.id === activeId)) {
      setActiveId(list[0].id);
    }
  }, [apiFetch, activeId]);

  useEffect(() => {
    loadBabies();
  }, [loadBabies]);

  const activeBaby = babies.find((b) => b.id === activeId) ?? babies[0];

  const handleAddBaby = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await apiFetch<BabyProfile>('/api/v1/babies', {
      method: 'POST',
      body: JSON.stringify({ name: babyName, dob: babyDob, gender: babyGender }),
    });
    setBabies((prev) => [...prev, created]);
    setActiveId(created.id);
    setBabyName('');
    setShowAddBaby(false);
    showToast(lang === 'bn' ? 'শিশুর প্রোফাইল তৈরি হয়েছে' : 'Child profile added privately');
  };

  const handleDeleteBaby = async (id: string) => {
    await apiFetch(`/api/v1/babies/${id}`, { method: 'DELETE' });
    setBabies((prev) => prev.filter((b) => b.id !== id));
    showToast(lang === 'bn' ? 'তথ্য স্থায়ীভাবে মুছে ফেলা হয়েছে' : 'Child profile deleted');
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBaby) return;
    const log = await apiFetch<BabyProfile['logs'][number]>(`/api/v1/babies/${activeBaby.id}/logs`, {
      method: 'POST',
      body: JSON.stringify({
        weightKg: Number(weightKg),
        heightCm: Number(heightCm),
        sleepHours: Number(sleepHours),
        feedingNotes,
      }),
    });
    setBabies((prev) =>
      prev.map((b) => (b.id === activeBaby.id ? { ...b, logs: [...b.logs, log] } : b))
    );
    setFeedingNotes('');
    showToast(lang === 'bn' ? 'গ্রোথ রেকর্ড সংরক্ষিত হয়েছে' : 'Growth measurement logged');
  };

  const handleToggleVaccine = async (vacId: string) => {
    if (!activeBaby) return;
    const updated = await apiFetch<BabyProfile>(`/api/v1/babies/${activeBaby.id}/vaccinations/${vacId}`, {
      method: 'POST',
    });
    setBabies((prev) => prev.map((b) => (b.id === activeBaby.id ? updated : b)));
  };

  const handleToggleMilestone = async (key: string) => {
    if (!activeBaby) return;
    const updated = await apiFetch<BabyProfile>(`/api/v1/babies/${activeBaby.id}/milestones`, {
      method: 'POST',
      body: JSON.stringify({ milestoneKey: key }),
    });
    setBabies((prev) => prev.map((b) => (b.id === activeBaby.id ? updated : b)));
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBaby) return;
    const errMsg = validateBabyReminderInput({ title: remTitle, dueDate: remDueDate });
    if (errMsg) {
      showToast(errMsg);
      return;
    }
    try {
      const created = await apiFetch<BabyReminder>(`/api/v1/babies/${activeBaby.id}/reminders`, {
        method: 'POST',
        body: JSON.stringify({
          title: remTitle.trim(),
          category: remCategory,
          dueDate: remDueDate,
          dueTime: remDueTime || undefined,
        }),
      });
      setBabies((prev) =>
        prev.map((b) =>
          b.id === activeBaby.id ? { ...b, reminders: [created, ...(b.reminders ?? [])] } : b
        )
      );
      setRemTitle('');
      showToast(lang === 'bn' ? 'রিমাইন্ডার সংরক্ষিত হয়েছে' : 'Reminder saved');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to add reminder');
    }
  };

  const handleToggleReminder = async (remId: string) => {
    if (!activeBaby) return;
    const updated = await apiFetch<BabyReminder>(
      `/api/v1/babies/${activeBaby.id}/reminders/${remId}`,
      { method: 'PATCH' }
    );
    setBabies((prev) =>
      prev.map((b) =>
        b.id === activeBaby.id
          ? { ...b, reminders: (b.reminders ?? []).map((r) => (r.id === remId ? updated : r)) }
          : b
      )
    );
  };

  const handleDeleteReminder = async (remId: string) => {
    if (!activeBaby) return;
    await apiFetch(`/api/v1/babies/${activeBaby.id}/reminders/${remId}`, { method: 'DELETE' });
    setBabies((prev) =>
      prev.map((b) =>
        b.id === activeBaby.id
          ? { ...b, reminders: (b.reminders ?? []).filter((r) => r.id !== remId) }
          : b
      )
    );
  };

  const ageMonths = activeBaby ? calculateBabyAgeMonths(activeBaby.dob) : 0;
  const latestLog = activeBaby?.logs[activeBaby.logs.length - 1];
  const growthEval = latestLog ? evaluateGrowthBand(latestLog.ageMonths, latestLog.weightKg) : null;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#EFF8F3] border border-[#B8DCCB] rounded-3xl p-5 sm:p-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-semibold text-[#29243B]">
            {lang === 'bn' ? 'বেবি গ্রোথ ও টিকা ট্র্যাকার' : 'Private Baby Growth & Vaccination Tracker'}
          </h1>
          <p className="text-xs text-[#1E5A40] mt-1.5 flex items-center gap-1.5 font-medium">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            {lang === 'bn'
              ? 'শুধুমাত্র পরিবারের জন্য ব্যক্তিগত। WHO রেফারেন্স মানদণ্ড অনুযায়ী — এটি চিকিৎসকের রোগ নির্ণয়ের বিকল্প নয়।'
              : 'Private family-only records. WHO reference comparison only — never an automated medical diagnosis.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddBaby((s) => !s)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#29243B] hover:bg-[#E83F58] text-white text-xs font-semibold self-start transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          {lang === 'bn' ? 'শিশু যোগ করুন' : 'Add Child'}
        </button>
      </div>

      {showAddBaby && (
        <form
          onSubmit={handleAddBaby}
          className="bg-white rounded-3xl p-5 border border-[#ECEAF0] shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label htmlFor="baby-name" className="block text-xs font-semibold text-[#29243B] mb-1">
              {lang === 'bn' ? 'নাম বা ডাকনাম' : 'Child Name'}
            </label>
            <input
              id="baby-name"
              required
              value={babyName}
              onChange={(e) => setBabyName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B]"
            />
          </div>
          <div>
            <label htmlFor="baby-dob" className="block text-xs font-semibold text-[#29243B] mb-1">
              {lang === 'bn' ? 'জন্ম তারিখ' : 'Date of Birth'}
            </label>
            <input
              id="baby-dob"
              type="date"
              required
              value={babyDob}
              onChange={(e) => setBabyDob(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B]"
            />
          </div>
          <div>
            <label htmlFor="baby-gender" className="block text-xs font-semibold text-[#29243B] mb-1">
              Gender
            </label>
            <select
              id="baby-gender"
              value={babyGender}
              onChange={(e) => setBabyGender(e.target.value as 'girl' | 'boy' | 'unspecified')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B]"
            >
              <option value="girl">Girl</option>
              <option value="boy">Boy</option>
              <option value="unspecified">Prefer not to say</option>
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-[#E83F58] hover:bg-[#D93B52] text-white text-xs font-semibold transition-colors"
          >
            Save Child Profile
          </button>
        </form>
      )}

      {/* Child Switcher */}
      <div className="flex flex-wrap items-center gap-2">
        {babies.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setActiveId(b.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold transition-colors ${
              activeBaby?.id === b.id
                ? 'bg-[#29243B] text-white'
                : 'bg-white border border-[#ECEAF0] text-[#29243B] hover:border-[#B8A5F5]'
            }`}
          >
            <Baby className="w-4 h-4" />
            <span>{b.name}</span>
          </button>
        ))}
      </div>

      {activeBaby && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Growth Summary & Chart */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white rounded-3xl p-6 border border-[#ECEAF0] shadow-[0_6px_22px_rgba(41,36,59,0.04)] space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-display font-semibold text-[#29243B]">{activeBaby.name}</h2>
                  <p className="text-xs text-[#777486] tabular-nums mt-0.5">
                    {lang === 'bn'
                      ? `বয়স: ${formatCount(ageMonths, lang)} মাস · জন্ম: ${activeBaby.dob}`
                      : `Age: ${ageMonths} months · DOB: ${activeBaby.dob}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteBaby(activeBaby.id)}
                  aria-label={`Delete ${activeBaby.name}`}
                  className="p-2 rounded-xl text-[#777486] hover:text-[#E83F58] hover:bg-[#FFE3D9]/50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0]">
                  <p className="text-[11px] text-[#777486] flex items-center gap-1 font-medium">
                    <Scale className="w-3.5 h-3.5 text-[#E83F58]" />
                    {lang === 'bn' ? 'সর্বশেষ ওজন' : 'Latest Weight'}
                  </p>
                  <p className="text-xl font-bold text-[#29243B] tabular-nums mt-1">
                    {latestLog ? `${latestLog.weightKg} kg` : '—'}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-[#ECEAF0]">
                  <p className="text-[11px] text-[#777486] flex items-center gap-1 font-medium">
                    <Ruler className="w-3.5 h-3.5 text-[#1E5A40]" />
                    {lang === 'bn' ? 'উচ্চতা' : 'Latest Height'}
                  </p>
                  <p className="text-xl font-bold text-[#29243B] tabular-nums mt-1">
                    {latestLog ? `${latestLog.heightCm} cm` : '—'}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[#EFF8F3] border border-[#B8DCCB]">
                  <p className="text-[11px] text-[#1E5A40] font-medium">WHO Reference</p>
                  <p className="text-xs font-bold text-[#1E5A40] mt-1.5">
                    {growthEval
                      ? growthEval.band === 'within_reference'
                        ? lang === 'bn'
                          ? 'স্বাভাবিক পরিসরের মধ্যে'
                          : 'Within reference band'
                        : `${growthEval.band.replace('_', ' ')}`
                      : 'Add first log'}
                  </p>
                </div>
              </div>

              {activeBaby.logs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#777486]">
                    {lang === 'bn' ? 'ওজন বৃদ্ধির গ্রাফ (কেজি)' : 'Weight Trajectory (kg)'}
                  </p>
                  <div className="h-36 w-full bg-[#FAF9F6] rounded-2xl p-3 border border-[#ECEAF0] flex items-end gap-3">
                    {activeBaby.logs.map((log) => {
                      const heightPct = Math.min(100, Math.max(20, (log.weightKg / 14) * 100));
                      return (
                        <div key={log.id} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                          <span className="text-[10px] font-semibold tabular-nums text-[#29243B]">
                            {log.weightKg}kg
                          </span>
                          <div
                            className="w-full max-w-[36px] rounded-t-xl bg-[#FF6478]"
                            style={{ height: `${heightPct}%` }}
                          />
                          <span className="text-[10px] text-[#777486] tabular-nums">{log.ageMonths}m</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Log Measurement Form */}
              <form onSubmit={handleAddLog} className="pt-4 border-t border-[#ECEAF0] space-y-3">
                <p className="text-xs font-semibold text-[#29243B]">
                  {lang === 'bn' ? 'নতুন পরিমাপ যোগ করুন' : 'Log New Measurement'}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="log-weight" className="block text-[11px] text-[#777486] mb-1">
                      Weight (kg)
                    </label>
                    <input
                      id="log-weight"
                      type="number"
                      step="0.1"
                      required
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B] tabular-nums"
                    />
                  </div>
                  <div>
                    <label htmlFor="log-height" className="block text-[11px] text-[#777486] mb-1">
                      Height (cm)
                    </label>
                    <input
                      id="log-height"
                      type="number"
                      step="0.5"
                      required
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B] tabular-nums"
                    />
                  </div>
                  <div>
                    <label htmlFor="log-sleep" className="block text-[11px] text-[#777486] mb-1">
                      Sleep (hrs)
                    </label>
                    <input
                      id="log-sleep"
                      type="number"
                      step="0.5"
                      value={sleepHours}
                      onChange={(e) => setSleepHours(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm text-[#29243B] tabular-nums"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={feedingNotes}
                    onChange={(e) => setFeedingNotes(e.target.value)}
                    placeholder={lang === 'bn' ? 'খাবার ও ঘুমের নোট...' : 'Feeding & sleep notes...'}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-xs text-[#29243B]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-[#29243B] hover:bg-[#E83F58] text-white text-xs font-semibold transition-colors"
                  >
                    {lang === 'bn' ? 'সংরক্ষণ' : 'Save Log'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Vaccinations & Milestones */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-3xl p-5 border border-[#ECEAF0] shadow-[0_6px_22px_rgba(41,36,59,0.04)] space-y-3">
              <h3 className="text-base font-display font-semibold text-[#29243B] flex items-center gap-2">
                <Syringe className="w-4 h-4 text-[#E83F58]" />
                {lang === 'bn' ? 'ইপিআই টিকা সূচি ও রিমাইন্ডার' : 'Vaccination Schedule'}
              </h3>
              <div className="space-y-2">
                {activeBaby.vaccinations.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleToggleVaccine(v.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-colors ${
                      v.status === 'completed'
                        ? 'bg-[#EFF8F3] border-[#B8DCCB]'
                        : 'bg-[#FAF9F6] border-[#ECEAF0] hover:border-[#B8A5F5]'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#29243B]">
                        {lang === 'bn' ? v.vaccineNameBn : v.vaccineNameEn}
                      </p>
                      <p className="text-[11px] text-[#777486] tabular-nums mt-0.5">
                        Due: {v.dueAgeMonths}m {v.completedDate ? `· Done ${v.completedDate}` : ''}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold ${
                        v.status === 'completed' ? 'text-[#1E5A40]' : 'text-[#E83F58]'
                      }`}
                    >
                      {v.status === 'completed'
                        ? lang === 'bn' ? 'সম্পন্ন' : 'Done'
                        : lang === 'bn' ? 'বাকি' : 'Pending'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-[#ECEAF0] shadow-[0_6px_22px_rgba(41,36,59,0.04)] space-y-3">
              <h3 className="text-base font-display font-semibold text-[#29243B] flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#1E5A40]" />
                {lang === 'bn' ? 'বিকাশের মাইলস্টোন' : 'Development Milestones'}
              </h3>
              <div className="space-y-2">
                {MILESTONES.map((m) => {
                  const checked = activeBaby.milestonesCompleted.includes(m.key);
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => handleToggleMilestone(m.key)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border text-xs font-medium transition-colors ${
                        checked
                          ? 'bg-[#EFF8F3] border-[#B8DCCB] text-[#29243B]'
                          : 'bg-[#FAF9F6] border-[#ECEAF0] text-[#777486]'
                      }`}
                    >
                      <span>{m[lang]}</span>
                      <span className={checked ? 'text-[#1E5A40] font-bold' : 'text-[#777486]'}>
                        {checked ? '✓' : '○'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Care & Vaccine Reminders */}
            <div className="bg-white rounded-3xl p-5 border border-[#ECEAF0] shadow-[0_6px_22px_rgba(41,36,59,0.04)] space-y-3">
              <h3 className="text-base font-display font-semibold text-[#29243B] flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#FF6478]" />
                {lang === 'bn' ? 'যত্ন ও টিকার রিমাইন্ডার' : 'Care & Vaccine Reminders'}
              </h3>

              <form onSubmit={handleAddReminder} className="space-y-2.5 bg-[#FAF9F6] p-3.5 rounded-2xl border border-[#ECEAF0]">
                <input
                  required
                  value={remTitle}
                  onChange={(e) => setRemTitle(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: সকাল ১০টায় ভিটামিন ডি ড্রপ' : 'e.g. Morning Vitamin D drop / Checkup'}
                  aria-label="Reminder title"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#ECEAF0] text-xs text-[#29243B]"
                />
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={remCategory}
                    onChange={(e) => setRemCategory(e.target.value as BabyReminder['category'])}
                    className="px-2 py-2 rounded-xl bg-white border border-[#ECEAF0] text-[11px] text-[#29243B]"
                  >
                    <option value="vaccine">Vaccine</option>
                    <option value="feeding">Feeding</option>
                    <option value="checkup">Checkup</option>
                    <option value="sleep">Sleep</option>
                  </select>
                  <input
                    type="date"
                    required
                    value={remDueDate}
                    onChange={(e) => setRemDueDate(e.target.value)}
                    className="px-2 py-2 rounded-xl bg-white border border-[#ECEAF0] text-[11px] text-[#29243B]"
                  />
                  <input
                    type="time"
                    value={remDueTime}
                    onChange={(e) => setRemDueTime(e.target.value)}
                    className="px-2 py-2 rounded-xl bg-white border border-[#ECEAF0] text-[11px] text-[#29243B]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-[#29243B] hover:bg-[#FF6478] text-white text-xs font-semibold transition-colors"
                >
                  {lang === 'bn' ? 'রিমাইন্ডার যোগ করুন' : 'Add Reminder'}
                </button>
              </form>

              <div className="space-y-2">
                {(activeBaby.reminders ?? []).length === 0 ? (
                  <p className="text-xs text-[#777486]">
                    {lang === 'bn' ? 'কোনো রিমাইন্ডার যোগ করা হয়নি।' : 'No active reminders yet.'}
                  </p>
                ) : (
                  (activeBaby.reminders ?? []).map((rem) => (
                    <div
                      key={rem.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${
                        rem.isCompleted
                          ? 'bg-[#E0F3EA]/65 border-[#B8DCCB]'
                          : 'bg-[#FAF9F6] border-[#ECEAF0]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => void handleToggleReminder(rem.id)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p
                          className={`text-xs font-semibold truncate ${
                            rem.isCompleted ? 'line-through text-[#1E5A40]' : 'text-[#29243B]'
                          }`}
                        >
                          {rem.title}
                        </p>
                        <p className="text-[11px] text-[#777486] tabular-nums">
                          {rem.category} · {rem.dueDate}
                          {rem.dueTime ? ` · ${rem.dueTime}` : ''}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteReminder(rem.id)}
                        aria-label={`Delete reminder ${rem.title}`}
                        className="p-1.5 rounded-lg text-[#777486] hover:text-[#E83F58]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
