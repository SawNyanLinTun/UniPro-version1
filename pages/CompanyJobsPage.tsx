import React, { useCallback, useEffect, useState } from 'react';
import { Briefcase, Loader2, Plus, Power, RotateCcw } from 'lucide-react';
import { api, ApiJob, ApiJobCreate } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { TranslationKey } from '../i18n/translations';

const label = 'font-mono text-[0.6rem] text-text-muted uppercase tracking-widest';
const input =
  'w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary';
const primaryBtn =
  'inline-flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50';
const ghostBtn =
  'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border border-border hover:bg-surface-hover transition-colors disabled:opacity-50';

const WORK_TYPES: ApiJobCreate['work_type'][] = ['onsite', 'hybrid', 'remote'];

const emptyForm: ApiJobCreate = {
  title: '',
  description: '',
  location: '',
  work_type: 'onsite',
  duration: '',
  category: '',
  stipend: '',
  deadline: '',
  tags: [],
};

const CompanyJobsPage: React.FC = () => {
  const { t } = useLanguage();
  const { user, accessToken } = useAuth();

  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ApiJobCreate>(emptyForm);
  const [tagsText, setTagsText] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [company, mine] = await Promise.all([
        api.getMyCompany(accessToken),
        api.listMyJobs(accessToken),
      ]);
      setCompanyName(company.company_name ?? '');
      setIndustry(company.industry ?? '');
      setJobs(mine);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    setProfileSaving(true);
    setError(null);
    try {
      await api.updateMyCompany(
        { company_name: companyName.trim(), industry: industry.trim() || null },
        accessToken
      );
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProfileSaving(false);
    }
  };

  const canPost = companyName.trim().length > 0 && !posting;

  const postJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPost) return;
    setPosting(true);
    setPostError(null);
    try {
      const tags = tagsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await api.postJob({ ...form, tags }, accessToken);
      setForm(emptyForm);
      setTagsText('');
      await load();
    } catch (e) {
      setPostError(e instanceof Error ? e.message : String(e));
    } finally {
      setPosting(false);
    }
  };

  const toggleStatus = async (job: ApiJob) => {
    setBusyId(job.id);
    setError(null);
    try {
      await api.updateJob(job.id, { status: job.status === 'open' ? 'closed' : 'open' }, accessToken);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  if (user && user.role !== 'company') {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-bold mb-3">{t('postings.companyOnly')}</h1>
        <p className="text-text-secondary text-sm">{t('postings.companyOnlyBody')}</p>
      </div>
    );
  }

  return (
    <div className="px-6 md:px-20 animate-[fadeIn_0.5s_ease-out]">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <Briefcase size={36} className="text-primary shrink-0" />
          <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight">{t('postings.title')}</h1>
        </div>
        <p className="text-text-secondary max-w-2xl mb-10">{t('postings.subtitle')}</p>

        {error && <p className="text-sm text-error mb-6 break-words">{error}</p>}

        {loading ? (
          <div className="flex items-center gap-2 text-text-secondary">
            <Loader2 size={18} className="animate-spin" /> {t('common.loading')}
          </div>
        ) : (
          <div className="space-y-12">
            <section>
              <h2 className="font-display text-2xl font-bold mb-4">{t('postings.profileTitle')}</h2>
              <form onSubmit={saveProfile} className="glass-card rounded-[28px] p-6 md:p-8 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className={`${label} block mb-2`}>{t('postings.companyName')}</span>
                    <input
                      className={input}
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                      maxLength={255}
                    />
                  </label>
                  <label className="block">
                    <span className={`${label} block mb-2`}>{t('postings.industry')}</span>
                    <input
                      className={input}
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      maxLength={255}
                    />
                  </label>
                </div>
                <button type="submit" className={primaryBtn} disabled={profileSaving || !companyName.trim()}>
                  {profileSaving && <Loader2 size={16} className="animate-spin" />}
                  {profileSaved ? t('postings.profileSaved') : t('postings.saveProfile')}
                </button>
              </form>
            </section>

            <section>
              <h2 className="font-display text-2xl font-bold mb-4">{t('postings.newTitle')}</h2>
              {!companyName.trim() && (
                <p className="text-sm text-accent mb-4">{t('postings.profileRequired')}</p>
              )}
              <form onSubmit={postJob} className="glass-card rounded-[28px] p-6 md:p-8 space-y-4">
                <label className="block">
                  <span className={`${label} block mb-2`}>{t('postings.jobTitle')}</span>
                  <input
                    className={input}
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    required
                    maxLength={255}
                  />
                </label>

                <label className="block">
                  <span className={`${label} block mb-2`}>{t('postings.description')}</span>
                  <textarea
                    className={`${input} min-h-[100px]`}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    required
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className={`${label} block mb-2`}>{t('postings.location')}</span>
                    <input
                      className={input}
                      value={form.location}
                      onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="block">
                    <span className={`${label} block mb-2`}>{t('postings.workType')}</span>
                    <select
                      className={input}
                      value={form.work_type}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, work_type: e.target.value as ApiJobCreate['work_type'] }))
                      }
                    >
                      {WORK_TYPES.map((wt) => (
                        <option key={wt} value={wt}>
                          {t(`postings.workType.${wt}` as TranslationKey)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className={`${label} block mb-2`}>{t('postings.duration')}</span>
                    <input
                      className={input}
                      value={form.duration}
                      onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                      placeholder={t('postings.durationPlaceholder')}
                      required
                    />
                  </label>
                  <label className="block">
                    <span className={`${label} block mb-2`}>{t('postings.category')}</span>
                    <input
                      className={input}
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                      required
                    />
                  </label>
                  <label className="block">
                    <span className={`${label} block mb-2`}>{t('postings.stipend')}</span>
                    <input
                      className={input}
                      value={form.stipend}
                      onChange={(e) => setForm((f) => ({ ...f, stipend: e.target.value }))}
                      placeholder={t('postings.stipendPlaceholder')}
                      required
                    />
                  </label>
                  <label className="block">
                    <span className={`${label} block mb-2`}>{t('postings.deadline')}</span>
                    <input
                      type="date"
                      className={input}
                      value={form.deadline}
                      onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                      required
                    />
                  </label>
                </div>

                <label className="block">
                  <span className={`${label} block mb-2`}>{t('postings.tags')}</span>
                  <input
                    className={input}
                    value={tagsText}
                    onChange={(e) => setTagsText(e.target.value)}
                    placeholder={t('postings.tagsPlaceholder')}
                  />
                </label>

                {postError && <p className="text-sm text-error break-words">{postError}</p>}

                <button type="submit" className={primaryBtn} disabled={!canPost}>
                  {posting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {t('postings.submit')}
                </button>
              </form>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-2xl font-bold">{t('postings.mine')}</h2>
              {jobs.length === 0 ? (
                <p className="text-text-muted text-sm">{t('postings.empty')}</p>
              ) : (
                jobs.map((job) => (
                  <div
                    key={job.id}
                    className="glass-card rounded-[24px] p-6 flex flex-wrap items-start justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-1">
                        <p className="font-bold text-lg break-words">{job.title}</p>
                        <span
                          className={`px-3 py-1 rounded-full text-[0.6rem] font-mono uppercase tracking-widest ${
                            job.status === 'open' ? 'bg-success-muted text-success' : 'bg-surface text-text-muted'
                          }`}
                        >
                          {job.status === 'open' ? t('postings.status.open') : t('postings.status.closed')}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted font-mono uppercase">
                        {job.category} · {job.location} · {job.duration}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={ghostBtn}
                      disabled={busyId === job.id}
                      onClick={() => toggleStatus(job)}
                    >
                      {busyId === job.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : job.status === 'open' ? (
                        <Power size={16} />
                      ) : (
                        <RotateCcw size={16} />
                      )}
                      {job.status === 'open' ? t('postings.close') : t('postings.reopen')}
                    </button>
                  </div>
                ))
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyJobsPage;
