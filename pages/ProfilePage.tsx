import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Briefcase,
  GraduationCap,
  BadgeCheck,
  Loader2,
  Pencil,
} from 'lucide-react';
import { api, ApiMe, ApiCompanyMe } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

const label = 'font-mono text-[0.6rem] text-text-muted uppercase tracking-widest';
const input =
  'w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary';
const primaryBtn =
  'inline-flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50';
const ghostBtn =
  'text-[0.6rem] font-mono border border-border px-4 py-2 rounded-lg hover:bg-surface-hover transition-colors disabled:opacity-50';

const StudentProfile: React.FC<{ accessToken: string | null }> = ({ accessToken }) => {
  const { t } = useLanguage();

  const [profile, setProfile] = useState<ApiMe | null>(null);
  const [appliedCount, setAppliedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [university, setUniversity] = useState('');
  const [major, setMajor] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [gpa, setGpa] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [me, applications] = await Promise.all([api.me(accessToken), api.listApplications(accessToken)]);
      setProfile(me);
      setAppliedCount(applications.length);
      setUniversity(me.university ?? '');
      setMajor(me.major ?? '');
      setGraduationYear(me.graduation_year != null ? String(me.graduation_year) : '');
      setGpa(me.gpa != null ? String(me.gpa) : '');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.updateMyStudentProfile(
        {
          university: university.trim() || null,
          major: major.trim() || null,
          graduation_year: graduationYear.trim() ? Number(graduationYear.trim()) : null,
          gpa: gpa.trim() ? Number(gpa.trim()) : null,
        },
        accessToken
      );
      await load();
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-text-secondary">
        <Loader2 size={18} className="animate-spin" /> {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-12">
      <div className="flex-1 space-y-12">
        <section className="glass-card p-12 rounded-[60px] flex items-center gap-10 flex-wrap">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-resin-purple flex items-center justify-center p-1 shrink-0">
            <div className="w-full h-full rounded-full bg-bg flex items-center justify-center overflow-hidden">
              <User size={64} className="text-text-muted" />
            </div>
          </div>
          <div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight mb-2">{profile?.full_name}</h1>
            <p className="font-mono text-sm text-text-muted">{profile?.email}</p>
            <div className="flex gap-4 mt-6">
              <button type="button" className={ghostBtn} onClick={() => setEditing((v) => !v)}>
                <span className="inline-flex items-center gap-1.5">
                  <Pencil size={12} /> {editing ? t('profile.cancel') : t('profile.edit')}
                </span>
              </button>
            </div>
          </div>
        </section>

        {error && <p className="text-sm text-error break-words">{error}</p>}

        <div className="glass-card p-10 rounded-[40px]">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-3 font-display">
            <GraduationCap size={20} className="text-primary" /> {t('profile.education')}
          </h3>

          {editing ? (
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className={`${label} block mb-2`}>{t('profile.university')}</span>
                  <input className={input} value={university} onChange={(e) => setUniversity(e.target.value)} />
                </label>
                <label className="block">
                  <span className={`${label} block mb-2`}>{t('profile.major')}</span>
                  <input className={input} value={major} onChange={(e) => setMajor(e.target.value)} />
                </label>
                <label className="block">
                  <span className={`${label} block mb-2`}>{t('profile.graduationYear')}</span>
                  <input
                    className={input}
                    type="number"
                    min={1900}
                    max={2100}
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className={`${label} block mb-2`}>{t('profile.gpa')}</span>
                  <input
                    className={input}
                    type="number"
                    min={0}
                    max={4}
                    step={0.01}
                    value={gpa}
                    onChange={(e) => setGpa(e.target.value)}
                  />
                </label>
              </div>
              <button type="submit" className={primaryBtn} disabled={saving}>
                {saving && <Loader2 size={16} className="animate-spin" />} {t('profile.save')}
              </button>
            </form>
          ) : (
            <div className="flex gap-4">
              <GraduationCap className="text-text-muted shrink-0" size={20} />
              <div>
                <p className="text-sm font-bold">{profile?.university || t('profile.notSet')}</p>
                <p className="text-xs text-text-muted">{profile?.major || t('profile.notSet')}</p>
                <p className="text-xs text-text-muted">
                  {profile?.graduation_year
                    ? `${t('profile.graduationYear')} ${profile.graduation_year}`
                    : t('profile.notSet')}
                </p>
                {profile?.gpa != null && (
                  <p className="text-xs text-text-muted">
                    {t('profile.gpa')}: {profile.gpa}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="glass-card p-10 rounded-[40px]">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-3 font-display">
            <Briefcase size={20} className="text-resin-purple" /> {t('profile.stats')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-surface-elevated rounded-2xl">
              <p className="text-[0.6rem] font-mono text-text-muted uppercase">{t('profile.applied')}</p>
              <p className="text-2xl font-black">{appliedCount}</p>
            </div>
            <div className="p-4 bg-surface-elevated rounded-2xl">
              <p className="text-[0.6rem] font-mono text-text-muted uppercase">{t('profile.skillsExtracted')}</p>
              <p className="text-2xl font-black">{profile?.skills?.length ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      <aside className="lg:w-80 space-y-8">
        <div className="glass-card p-8 rounded-[40px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-mono text-[0.6rem] uppercase text-primary tracking-widest">
              {t('profile.skills')}
            </h3>
            <Link to="/smartmatch" className="text-xs text-primary hover:underline">
              {t('profile.updateCv')}
            </Link>
          </div>
          {profile?.skills && profile.skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-surface-elevated rounded-full text-[0.6rem] font-mono border border-border"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">{t('profile.cvSkillsEmpty')}</p>
          )}
        </div>
      </aside>
    </div>
  );
};

const CompanyProfile: React.FC<{ accessToken: string | null }> = ({ accessToken }) => {
  const { t } = useLanguage();

  const [company, setCompany] = useState<ApiCompanyMe | null>(null);
  const [postingsCount, setPostingsCount] = useState(0);
  const [applicantsCount, setApplicantsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [me, jobs, applications] = await Promise.all([
        api.getMyCompany(accessToken),
        api.listMyJobs(accessToken),
        api.listApplications(accessToken),
      ]);
      setCompany(me);
      setPostingsCount(jobs.length);
      setApplicantsCount(applications.length);
      setCompanyName(me.company_name ?? '');
      setIndustry(me.industry ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.updateMyCompany({ company_name: companyName.trim(), industry: industry.trim() || null }, accessToken);
      await load();
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-text-secondary">
        <Loader2 size={18} className="animate-spin" /> {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-12">
      <div className="flex-1 space-y-12">
        <section className="glass-card p-12 rounded-[60px] flex items-center gap-10 flex-wrap">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-resin-purple flex items-center justify-center p-1 shrink-0">
            <div className="w-full h-full rounded-full bg-bg flex items-center justify-center overflow-hidden">
              <User size={64} className="text-text-muted" />
            </div>
          </div>
          <div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight mb-2">
              {company?.company_name || company?.full_name}
            </h1>
            <p className="font-mono text-sm text-text-muted">{company?.email}</p>
            <div className="flex gap-4 mt-6">
              <button type="button" className={ghostBtn} onClick={() => setEditing((v) => !v)}>
                <span className="inline-flex items-center gap-1.5">
                  <Pencil size={12} /> {editing ? t('profile.cancel') : t('profile.edit')}
                </span>
              </button>
            </div>
          </div>
        </section>

        {error && <p className="text-sm text-error break-words">{error}</p>}

        <div className="glass-card p-10 rounded-[40px]">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-3 font-display">
            <Briefcase size={20} className="text-primary" /> {t('postings.profileTitle')}
          </h3>

          {editing ? (
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className={`${label} block mb-2`}>{t('postings.companyName')}</span>
                  <input
                    className={input}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </label>
                <label className="block">
                  <span className={`${label} block mb-2`}>{t('postings.industry')}</span>
                  <input className={input} value={industry} onChange={(e) => setIndustry(e.target.value)} />
                </label>
              </div>
              <button type="submit" className={primaryBtn} disabled={saving || !companyName.trim()}>
                {saving && <Loader2 size={16} className="animate-spin" />} {t('profile.save')}
              </button>
            </form>
          ) : (
            <div>
              <p className="text-sm font-bold">{company?.company_name || t('profile.notSet')}</p>
              <p className="text-xs text-text-muted">{company?.industry || t('profile.notSet')}</p>
            </div>
          )}
        </div>

        <div className="glass-card p-10 rounded-[40px]">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-3 font-display">
            <Briefcase size={20} className="text-resin-purple" /> {t('profile.stats')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-surface-elevated rounded-2xl">
              <p className="text-[0.6rem] font-mono text-text-muted uppercase">{t('postings.mine')}</p>
              <p className="text-2xl font-black">{postingsCount}</p>
            </div>
            <div className="p-4 bg-surface-elevated rounded-2xl">
              <p className="text-[0.6rem] font-mono text-text-muted uppercase">{t('apps.totalCompany')}</p>
              <p className="text-2xl font-black">{applicantsCount}</p>
            </div>
          </div>
        </div>
      </div>

      <aside className="lg:w-80 space-y-8">
        <div className="glass-card p-8 rounded-[40px]">
          <h3 className="font-mono text-[0.6rem] uppercase text-primary mb-6 tracking-widest">
            {t('profile.verification')}
          </h3>
          {company?.verification_status ? (
            <span className="inline-flex items-center gap-2 text-success text-sm font-semibold">
              <BadgeCheck size={18} /> {t('profile.verified')}
            </span>
          ) : (
            <p className="text-sm text-text-muted">{t('profile.unverified')}</p>
          )}
        </div>
      </aside>
    </div>
  );
};

const ProfilePage: React.FC = () => {
  const { user, accessToken } = useAuth();

  if (!user) return null;

  return (
    <div className="px-8 md:px-20 animate-[fadeIn_0.5s_ease-out]">
      <div className="max-w-6xl mx-auto">
        {user.role === 'company' ? (
          <CompanyProfile accessToken={accessToken} />
        ) : (
          <StudentProfile accessToken={accessToken} />
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
