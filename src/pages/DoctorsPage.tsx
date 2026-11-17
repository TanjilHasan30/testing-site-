import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  Clock,
  Play,
  Send,
  ShieldAlert,
  ShieldCheck,
  Star,
  Stethoscope,
  Video,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { t } from '../i18n/translations';
import { formatBdt, resolveVideoMedia } from '../lib/domain';
import type { AppointmentItem, DoctorProfile, PostItem } from '../types/platform';

export const DoctorsPage: React.FC = () => {
  const { id: routeDoctorId } = useParams();
  const { lang, viewerName, apiFetch, showToast } = useApp();
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [eduVideos, setEduVideos] = useState<PostItem[]>([]);
  const [specFilter, setSpecFilter] = useState('all');
  const [doctorTab, setDoctorTab] = useState<'directory' | 'history'>('directory');
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(null);
  const [activeEduVideo, setActiveEduVideo] = useState<PostItem | null>(null);
  const [bookedSlots, setBookedSlots] = useState<{ date: string; slot: string }[]>([]);
  const [date, setDate] = useState('2026-11-23');
  const [slot, setSlot] = useState('');
  const [consultType, setConsultType] = useState<'video' | 'clinic'>('video');
  const [paymentMethod, setPaymentMethod] = useState<'bkash_sandbox' | 'nagad_sandbox' | 'card_sandbox'>('bkash_sandbox');
  const [notes, setNotes] = useState('');
  const [patientName, setPatientName] = useState(viewerName);
  const [bookingLoading, setBookingLoading] = useState(false);

  const [askTitle, setAskTitle] = useState('');
  const [askBody, setAskBody] = useState('');
  const [asking, setAsking] = useState(false);

  const loadDoctors = useCallback(async () => {
    try {
      const [docs, appts, videosRes] = await Promise.all([
        apiFetch<DoctorProfile[]>('/api/v1/doctors'),
        apiFetch<AppointmentItem[]>('/api/v1/appointments'),
        apiFetch<{ items: PostItem[] }>('/api/v1/feed?tab=videos&limit=6'),
      ]);
      const safeDocs = Array.isArray(docs) ? docs : [];
      const safeAppts = Array.isArray(appts) ? appts : [];
      const safeVideos = Array.isArray(videosRes?.items) ? videosRes.items : [];
      setDoctors(safeDocs);
      setAppointments(safeAppts);
      setEduVideos(safeVideos.slice(0, 3));
      if (routeDoctorId) {
        const found = safeDocs.find((d) => d.id === routeDoctorId);
        if (found) setSelectedDoctor(found);
      }
    } catch {
      // Fall back to empty state on transient fetch errors
    }
  }, [apiFetch, routeDoctorId]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  useEffect(() => {
    if (!selectedDoctor) return;
    apiFetch<{ doctor: DoctorProfile; bookedSlots: { date: string; slot: string }[] }>(
      `/api/v1/doctors/${selectedDoctor.id}`
    )
      .then((res) => {
        setBookedSlots(res.bookedSlots);
        setSlot(res.doctor.availableSlots[0] || '');
      })
      .catch(() => {});
  }, [selectedDoctor, apiFetch]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !slot) return;
    setBookingLoading(true);
    try {
      const created = await apiFetch<AppointmentItem>('/api/v1/appointments', {
        method: 'POST',
        body: JSON.stringify({
          doctorId: selectedDoctor.id,
          date,
          slot,
          consultationType: consultType,
          paymentMethod,
          patientName,
          notes,
        }),
      });
      setAppointments((prev) => [created, ...prev]);
      setBookedSlots((prev) => [...prev, { date, slot }]);
      setSelectedDoctor(null);
      setNotes('');
      showToast(lang === 'bn' ? 'অ্যাপয়েন্টমেন্ট নিশ্চিত হয়েছে!' : 'Appointment confirmed!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleCancelAppointment = async (apptId: string) => {
    const updated = await apiFetch<AppointmentItem>(`/api/v1/appointments/${apptId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'cancelled' }),
    });
    setAppointments((prev) => prev.map((a) => (a.id === apptId ? updated : a)));
    showToast(lang === 'bn' ? 'অ্যাপয়েন্টমেন্ট বাতিল ও রিফান্ড প্রক্রিয়া শুরু হয়েছে' : 'Appointment cancelled & sandbox refund processed');
  };

  const handleAskDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setAsking(true);
    try {
      await apiFetch('/api/v1/questions', {
        method: 'POST',
        body: JSON.stringify({ title: askTitle, body: askBody, category: 'newborn', isAnonymous: true }),
      });
      setAskTitle('');
      setAskBody('');
      showToast(lang === 'bn' ? 'ডাক্তারের কাছে আপনার প্রশ্ন পাঠানো হয়েছে' : 'Question posted for doctors in Community');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to send question');
    } finally {
      setAsking(false);
    }
  };

  const specs = [
    'all',
    'Paediatrician',
    'Gynaecologist',
    'Neonatologist',
    'Nutritionist',
    'Dermatologist',
    'Child Development Specialist',
  ];
  const filteredDoctors =
    specFilter === 'all' ? doctors : doctors.filter((d) => d.specialisation === specFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-8">
      {/* Mint Healthcare Header Banner */}
      <section className="rounded-3xl bg-[#EFF8F3] border border-[#B8DCCB] p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1E5A40]">
            <Stethoscope className="w-4 h-4" />
            <span>{lang === 'bn' ? 'বিশ্বস্ত মাতৃ ও শিশু স্বাস্থ্যসেবা' : 'Trusted Maternal & Paediatric Care'}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-[#29243B]">
            {t(lang, 'navDoctors')}
          </h1>
          <p className="text-sm text-[#29243B]/80">
            {lang === 'bn'
              ? 'শিশু বিশেষজ্ঞ, গাইনি ও পুষ্টিবিদদের সাথে অনলাইন ভিডিও বা ক্লিনিক অ্যাপয়েন্টমেন্ট বুক করুন।'
              : 'Book verified video or clinic consultations with paediatricians, gynaecologists, and nutritionists.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setDoctorTab('directory')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              doctorTab === 'directory'
                ? 'bg-[#29243B] text-white'
                : 'bg-white border border-[#B8DCCB] text-[#29243B]'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            {lang === 'bn' ? 'ডাক্তার তালিকা' : 'Specialists'}
          </button>
          <button
            type="button"
            onClick={() => setDoctorTab('history')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
              doctorTab === 'history'
                ? 'bg-[#29243B] text-white'
                : 'bg-white border border-[#B8DCCB] text-[#29243B]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            {lang === 'bn'
              ? `পরামর্শের ইতিহাস (${appointments.length})`
              : `Consultation History (${appointments.length})`}
          </button>
        </div>
      </section>

      {/* Emergency Care Guidance */}
      <div className="bg-white border border-[#ECEAF0] rounded-2xl p-4 flex items-start gap-3 text-xs text-[#29243B]">
        <AlertTriangle className="w-4 h-4 text-[#D93B52] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold">{t(lang, 'emergencyNotice')}</p>
          <p className="text-[#777486]">
            {lang === 'bn'
              ? 'ডিরেক্টরির ডেমো ডাক্তার প্রোফাইলগুলো অ্যাডমিন যাচাইকরণ সম্পন্ন না হওয়া পর্যন্ত ডেমো হিসেবে চিহ্নিত।'
              : 'Demo doctor directory profiles remain clearly marked until verified by authorized administrators.'}
          </p>
        </div>
      </div>

      {/* Specialisation Filter */}
      {doctorTab === 'directory' && (
        <div className="flex flex-wrap gap-2">
          {specs.map((sp) => (
            <button
              key={sp}
              type="button"
              onClick={() => setSpecFilter(sp)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                specFilter === sp
                  ? 'bg-[#29243B] text-white'
                  : 'bg-white border border-[#ECEAF0] text-[#777486] hover:border-[#B8DCCB] hover:text-[#29243B]'
              }`}
            >
              {sp === 'all' ? (lang === 'bn' ? 'সকল বিশেষজ্ঞ' : 'All Specialists') : sp}
            </button>
          ))}
        </div>
      )}

      {/* Verified / Demo Doctor Cards */}
      {doctorTab === 'directory' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doc) => (
            <article key={doc.id} className="bg-white rounded-3xl p-6 border border-[#ECEAF0] flex flex-col justify-between gap-5 shadow-[0_2px_12px_rgba(41,36,59,0.03)]">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <img
                    src={doc.avatarUrl}
                    alt={doc.nameEn}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-2xl object-cover shrink-0 bg-[#EFF8F3] border border-[#B8DCCB]"
                  />
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                      {doc.isVerified ? (
                        <span className="inline-flex items-center gap-1 text-[#1E5A40]">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {t(lang, 'verifiedDoctor')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#777486]">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          {lang === 'bn' ? 'অ্যাডমিন যাচাইকরণ অপেক্ষমাণ' : 'Demo · Pending Verification'}
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-semibold text-[#29243B] leading-snug">
                      {lang === 'bn' ? doc.nameBn : doc.nameEn}
                    </h2>
                    <p className="text-xs text-[#1E5A40] font-medium">
                      {doc.specialisation} · {doc.qualifications}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-[#777486] space-y-1.5">
                  <p className="text-[#29243B]/85 font-medium">{lang === 'bn' ? doc.hospitalBn : doc.hospitalEn}</p>
                  <p className="flex items-center gap-2 tabular-nums">
                    <span>{doc.experienceYears} {lang === 'bn' ? 'বছরের অভিজ্ঞতা' : 'yrs exp'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 text-[#29243B]">
                      <Star className="w-3.5 h-3.5 fill-[#FF6478] text-[#FF6478]" />
                      {doc.rating} ({doc.reviewsCount})
                    </span>
                  </p>
                  <p className="text-[11px]">
                    {lang === 'bn' ? 'সম্ভাব্য স্লট:' : 'Next slots:'} {doc.availableSlots.slice(0, 2).join(', ')}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-[#ECEAF0] flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] text-[#777486]">{lang === 'bn' ? 'পরামর্শ ফি' : 'Consultation Fee'}</p>
                  <p className="text-lg font-semibold text-[#29243B] tabular-nums">
                    {formatBdt(doc.consultationFeeBdt, lang)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDoctor(doc)}
                  className="px-4 py-2.5 rounded-xl bg-[#29243B] text-white text-xs font-semibold hover:bg-[#1E5A40] transition-colors"
                >
                  {t(lang, 'bookAppointment')}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Educational Video Feed + Ask a Doctor Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white rounded-3xl p-6 border border-[#ECEAF0] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#29243B]">
              {lang === 'bn' ? 'চিকিৎসকদের স্বাস্থ্য শিক্ষামূলক ভিডিও' : 'Doctor Educational Video Feed'}
            </h2>
            <Link to="/videos" className="text-xs font-semibold text-[#1E5A40] hover:underline">
              {lang === 'bn' ? 'সব ভিডিও দেখুন →' : 'Watch all →'}
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {eduVideos.map((v) => {
              const { posterSrc } = resolveVideoMedia(v.mediaUrls);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setActiveEduVideo(v)}
                  aria-label={`${lang === 'bn' ? 'ভিডিও দেখুন' : 'Play video'}: ${lang === 'bn' ? v.titleBn : v.titleEn}`}
                  className="group space-y-2 text-left"
                >
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#EFF8F3]">
                    <img
                      src={posterSrc}
                      alt={v.titleEn}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
                    />
                    <span className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-[#29243B]/80 text-white flex items-center justify-center">
                      <Play className="w-3.5 h-3.5 fill-white" />
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-[#29243B] line-clamp-2">
                    {lang === 'bn' ? v.titleBn : v.titleEn}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="lg:col-span-5 bg-[#EFF8F3] rounded-3xl p-6 border border-[#B8DCCB] space-y-4">
          <h2 className="text-lg font-semibold text-[#29243B]">
            {lang === 'bn' ? 'ডাক্তারকে প্রশ্ন করুন (গোপনীয়)' : 'Ask a Doctor (Anonymous Option)'}
          </h2>
          <p className="text-xs text-[#29243B]/75">
            {lang === 'bn'
              ? 'সাধারণ শিশু ও মাতৃস্বাস্থ্য সংক্রান্ত প্রশ্ন পাঠান — কমিউনিটিতে যাচাইকৃত উত্তর পাবেন।'
              : 'Submit a general maternal or child health question anonymously to our medical community.'}
          </p>
          <form onSubmit={handleAskDoctor} className="space-y-3">
            <input
              required
              value={askTitle}
              onChange={(e) => setAskTitle(e.target.value)}
              placeholder={lang === 'bn' ? 'আপনার প্রশ্নের বিষয়...' : 'Short medical question title...'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#B8DCCB] text-sm"
            />
            <textarea
              required
              rows={3}
              value={askBody}
              onChange={(e) => setAskBody(e.target.value)}
              placeholder={lang === 'bn' ? 'বিস্তারিত লক্ষণ বা প্রশ্ন লিখুন...' : 'Describe symptoms, age, or context...'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#B8DCCB] text-sm"
            />
            <button
              type="submit"
              disabled={asking}
              className="w-full py-2.5 rounded-xl bg-[#29243B] text-white text-xs font-semibold hover:bg-[#1E5A40] inline-flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {asking ? t(lang, 'loading') : lang === 'bn' ? 'প্রশ্ন পাঠান' : 'Submit to Doctor Q&A'}
            </button>
          </form>
        </section>
      </div>

      {/* Appointments History */}
      <section className="bg-white rounded-3xl p-6 border border-[#ECEAF0] space-y-4">
        <h2 className="text-lg font-semibold text-[#29243B] flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-[#1E5A40]" />
          {lang === 'bn' ? 'আপনার অ্যাপয়েন্টমেন্ট তালিকা' : 'Your Scheduled Consultations'}
        </h2>
        {appointments.length === 0 ? (
          <p className="text-sm text-[#777486]">
            {lang === 'bn' ? 'কোনো অ্যাপয়েন্টমেন্ট এখনো বুক করা হয়নি।' : 'No consultations booked yet.'}
          </p>
        ) : (
          <div className="divide-y divide-[#ECEAF0]">
            {appointments.map((appt) => {
              const doc = doctors.find((d) => d.id === appt.doctorId);
              return (
                <div key={appt.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#29243B]">
                      {doc ? (lang === 'bn' ? doc.nameBn : doc.nameEn) : appt.doctorId}
                    </p>
                    <p className="text-xs text-[#777486] tabular-nums">
                      {appt.date} · {appt.slot} · {appt.consultationType === 'video' ? 'Video Call' : 'In-Clinic'} ·{' '}
                      {formatBdt(appt.feeBdt, lang)} ({appt.paymentStatus})
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-semibold capitalize ${
                        appt.status === 'cancelled' ? 'text-[#D93B52]' : 'text-[#1E5A40]'
                      }`}
                    >
                      {appt.status}
                    </span>
                    {appt.status === 'confirmed' && (
                      <button
                        type="button"
                        onClick={() => handleCancelAppointment(appt.id)}
                        className="px-3 py-1.5 rounded-xl border border-[#ECEAF0] text-xs font-medium hover:bg-[#FFE3D9]"
                      >
                        {lang === 'bn' ? 'বাতিল ও রিফান্ড' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Booking Modal */}
      {selectedDoctor && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-[#29243B]/55 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleBook}
            className="bg-white w-full max-w-lg rounded-3xl p-6 space-y-4 border border-[#ECEAF0] max-h-[90vh] overflow-y-auto animate-sheet-in"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#29243B]">
                {lang === 'bn' ? selectedDoctor.nameBn : selectedDoctor.nameEn}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedDoctor(null)}
                className="text-xs font-semibold text-[#777486] hover:text-[#29243B]"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="appt-name" className="block text-xs font-semibold mb-1">
                  {lang === 'bn' ? 'রোগী / মায়ের নাম' : 'Patient Name'}
                </label>
                <input
                  id="appt-name"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm"
                />
              </div>
              <div>
                <label htmlFor="appt-date" className="block text-xs font-semibold mb-1">
                  {lang === 'bn' ? 'তারিখ' : 'Date'}
                </label>
                <input
                  id="appt-date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#1E5A40]" />
                {lang === 'bn' ? 'উপলব্ধ সময়সূচি' : 'Select Available Slot'}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedDoctor.availableSlots.map((s) => {
                  const taken = bookedSlots.some((b) => b.date === date && b.slot === s);
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={taken}
                      onClick={() => setSlot(s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold tabular-nums ${
                        taken
                          ? 'bg-[#ECEAF0] text-[#777486]/50 line-through cursor-not-allowed'
                          : slot === s
                            ? 'bg-[#29243B] text-white'
                            : 'bg-[#FAF9F6] border border-[#ECEAF0] text-[#29243B]'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Consultation Mode</label>
                <select
                  value={consultType}
                  onChange={(e) => setConsultType(e.target.value as 'video' | 'clinic')}
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm"
                >
                  <option value="video">Video Consultation</option>
                  <option value="clinic">In-Clinic Visit</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Payment (Sandbox)</label>
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as 'bkash_sandbox' | 'nagad_sandbox' | 'card_sandbox')
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm"
                >
                  <option value="bkash_sandbox">bKash (Sandbox Demo)</option>
                  <option value="nagad_sandbox">Nagad (Sandbox Demo)</option>
                  <option value="card_sandbox">Card (Sandbox Demo)</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="appt-notes" className="block text-xs font-semibold mb-1">
                {lang === 'bn' ? 'সংক্ষিপ্ত সমস্যা (গোপনীয়)' : 'Brief Reason for Visit (Private)'}
              </label>
              <textarea
                id="appt-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF9F6] border border-[#ECEAF0] text-sm"
              />
            </div>

            <p className="text-[11px] text-[#777486] flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-[#1E5A40]" />
              {t(lang, 'sandboxPaymentNotice')} · {formatBdt(selectedDoctor.consultationFeeBdt, lang)}
            </p>

            <button
              type="submit"
              disabled={bookingLoading || !slot}
              className="w-full py-2.5 rounded-xl bg-[#29243B] text-white text-sm font-semibold hover:bg-[#1E5A40] transition-colors"
            >
              {bookingLoading
                ? t(lang, 'loading')
                : lang === 'bn'
                  ? 'বুকিং ও স্যান্ডবক্স পেমেন্ট নিশ্চিত করুন'
                  : 'Confirm Booking & Sandbox Pay'}
            </button>
          </form>
        </div>
      )}
      {/* Doctor Educational Video Modal */}
      {activeEduVideo && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#29243B]/65 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden border border-[#ECEAF0] shadow-2xl space-y-3 p-4 animate-sheet-in">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[#29243B] truncate">
                {lang === 'bn' ? activeEduVideo.titleBn : activeEduVideo.titleEn}
              </p>
              <button
                type="button"
                onClick={() => setActiveEduVideo(null)}
                aria-label="Close video"
                className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[#FAF9F6]"
              >
                <X className="w-4 h-4 text-[#29243B]" />
              </button>
            </div>
            {(() => {
              const { videoSrc, posterSrc } = resolveVideoMedia(activeEduVideo.mediaUrls);
              return videoSrc ? (
                <video
                  src={videoSrc}
                  poster={posterSrc}
                  controls
                  autoPlay
                  playsInline
                  className="w-full aspect-[9/16] max-h-[65vh] rounded-2xl bg-[#29243B] object-cover"
                />
              ) : (
                <img
                  src={posterSrc}
                  alt={activeEduVideo.titleEn}
                  className="w-full aspect-[9/16] max-h-[65vh] rounded-2xl object-cover"
                />
              );
            })()}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[#777486]">{activeEduVideo.authorName}</span>
              <Link
                to={`/videos?v=${activeEduVideo.id}`}
                onClick={() => setActiveEduVideo(null)}
                className="font-semibold text-[#D93B52] hover:underline"
              >
                {lang === 'bn' ? 'রিলস ফিডে খুলুন →' : 'Open in Reels →'}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
