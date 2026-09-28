import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Calendar, Check, Copy, ExternalLink, Loader2, Plus, ShieldCheck, X } from 'lucide-react';
import {
  api,
  ApiApplication,
  ApiCertificate,
  ApiCertificateStatus,
  ApiSkillLevel,
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { TranslationKey } from '../i18n/translations';

const LEVELS: ApiSkillLevel[] = ['basic', 'good', 'strong'];

const statusStyle: Record<ApiCertificateStatus, string> = {
  awaiting_student: 'bg-primary-muted text-primary',
  issued: 'bg-success-muted text-success',
  disputed: 'bg-accent-muted text-accent',
  revoked: 'bg-error-muted text-error',
};

const label = 'font-mono text-[0.6rem] text-text-muted uppercase tracking-widest';
const input =
  'w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary';
const primaryBtn =
  'inline-flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50';
const ghostBtn =
  'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border border-border hover:bg-surface-hover transition-colors disabled:opacity-50';

function fmt(iso: string | null | undefined, locale: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Card shared by both views
// ---------------------------------------------------------------------------

const CertificateCard: React.FC<{
  cert: ApiCertificate;
  viewer: 'student' | 'company';
  busy: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onRevoke?: () => void;
  onResubmit?: () => void;
}> = ({ cert, viewer, busy, onAccept, onDecline, onRevoke, onResubmit }) => {
  const { t, locale } = useLanguage();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!cert.verifyUrl) return;
    try {
      await navigator.clipboard.writeText(cert.verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt(t('cert.copyLink'), cert.verifyUrl);
    }
  };

  return (
    <div className="glass-card rounded-[28px] p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="font-bold text-xl mb-1 break-words">{cert.role}</p>
          <p className="text-xs text-text-muted font-mono uppercase break-words">
            {viewer === 'student' ? cert.company : cert.studentName}
          </p>
        </div>
        <span className={`px-4 py-1.5 rounded-full text-[0.6rem] font-mono uppercase tracking-widest ${statusStyle[cert.status]}`}>
          {t(`cert.status.${cert.status}` as TranslationKey)}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <p className={`${label} mb-1`}>{t('cert.period')}</p>
          <p className="flex items-center gap-2 text-text-secondary">
            <Calendar size={14} /> {fmt(cert.startDate, locale)} – {fmt(cert.endDate, locale)}
          </p>
        </div>
        <div>
          <p className={`${label} mb-1`}>{t('cert.confirmedBy')}</p>
          <p className="text-text-secondary">{cert.supervisorName}</p>
        </div>
      </div>

      <p className={`${label} mb-2`}>{t('cert.skills')}</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {cert.skills.map((s) => (
          <span key={s.id} className="px-3 py-1.5 rounded-full bg-primary-muted text-primary text-xs font-semibold">
            {s.name} · {t(`cert.level.${s.level}` as TranslationKey)}
          </span>
        ))}
      </div>

      {cert.supervisorComment && (
        <p className="text-sm text-text-secondary italic border-l-2 border-border-strong pl-3 mb-4">{cert.supervisorComment}</p>
      )}
      {cert.studentNote && (
        <p className="text-sm text-accent mb-4">
          <span className="font-semibold">{t('cert.studentNote')}:</span> {cert.studentNote}
        </p>
      )}
      {cert.status === 'revoked' && cert.revokeReason && (
        <p className="text-sm text-error mb-4">{cert.revokeReason}</p>
      )}

      <div className="flex flex-wrap gap-3 mt-2">
        {viewer === 'student' && cert.status === 'awaiting_student' && (
          <>
            <button type="button" className={primaryBtn} disabled={busy} onClick={onAccept}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} {t('cert.accept')}
            </button>
            <button type="button" className={ghostBtn} disabled={busy} onClick={onDecline}>
              <X size={16} /> {t('cert.decline')}
            </button>
          </>
        )}
        {cert.verifyUrl && (
          <>
            <button type="button" className={ghostBtn} onClick={copy}>
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? t('cert.copied') : t('cert.copyLink')}
            </button>
            <Link to={`/verify/${cert.id}`} className={ghostBtn}>
              <ExternalLink size={16} /> {t('cert.openVerify')}
            </Link>
          </>
        )}
        {viewer === 'company' && cert.status === 'issued' && (
          <button type="button" className={`${ghostBtn} text-error`} disabled={busy} onClick={onRevoke}>
            {t('cert.revoke')}
          </button>
        )}
        {viewer === 'company' && cert.status === 'disputed' && (
          <button type="button" className={primaryBtn} disabled={busy} onClick={onResubmit}>
            {t('cert.resubmit')}
          </button>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Company: confirmation form (about 2 minutes)
// ---------------------------------------------------------------------------

type SkillRow = { name: string; level: ApiSkillLevel; checked: boolean };

const ConfirmForm: React.FC<{
  application: ApiApplication;
  existing?: ApiCertificate;
  onDone: () => void;
  onCancel: () => void;
}> = ({ application, existing, onDone, onCancel }) => {
  const { t } = useLanguage();
  const { accessToken } = useAuth();
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [start, setStart] = useState(existing?.startDate ?? '');
  const [end, setEnd] = useState(existing?.endDate ?? '');
  const [supervisor, setSupervisor] = useState(existing?.supervisorName ?? '');
  const [comment, setComment] = useState(existing?.supervisorComment ?? '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (existing) {
          setSkills(existing.skills.map((s) => ({ name: s.name, level: s.level, checked: true })));
        } else {
          const prefill = await api.certificatePrefill(application.id, accessToken);
          if (!cancelled) setSkills(prefill.suggestedSkills.map((name) => ({ name, level: 'good', checked: true })));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [application.id, existing, accessToken]);

  const addSkill = () => {
    const name = newSkill.trim();
    if (!name) return;
    if (!skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
      setSkills((prev) => [...prev, { name, level: 'good', checked: true }]);
    }
    setNewSkill('');
  };

  const chosen = skills.filter((s) => s.checked);
  const canSubmit = start && end && supervisor.trim() && chosen.length > 0 && !saving;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await api.confirmInternship(
        {
          application_id: application.id,
          start_date: start,
          end_date: end,
          skills: chosen.map(({ name, level }) => ({ name, level })),
          supervisor_name: supervisor.trim(),
          supervisor_comment: comment.trim() || null,
        },
        accessToken,
      );
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="glass-card rounded-[28px] p-6 md:p-8 space-y-6">
      <div>
        <p className="font-bold text-xl break-words">{application.role}</p>
        <p className="text-xs text-text-muted font-mono uppercase">{application.studentName}</p>
      </div>

      {existing?.studentNote && (
        <p className="text-sm text-accent">
          <span className="font-semibold">{t('cert.studentNote')}:</span> {existing.studentNote}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className={`${label} block mb-2`}>{t('cert.startDate')}</span>
          <input type="date" className={input} value={start} onChange={(e) => setStart(e.target.value)} required />
        </label>
        <label className="block">
          <span className={`${label} block mb-2`}>{t('cert.endDate')}</span>
          <input type="date" className={input} value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} required />
        </label>
      </div>

      <div>
        <p className={`${label} mb-1`}>{t('cert.skills')}</p>
        <p className="text-xs text-text-muted mb-3">{t('cert.skillsHint')}</p>
        {loading ? (
          <Loader2 size={18} className="animate-spin text-text-muted" />
        ) : (
          <div className="space-y-2">
            {skills.map((s, i) => (
              <div key={s.name} className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 flex-1 min-w-[140px] text-sm">
                  <input
                    type="checkbox"
                    checked={s.checked}
                    onChange={(e) =>
                      setSkills((prev) => prev.map((row, j) => (j === i ? { ...row, checked: e.target.checked } : row)))
                    }
                  />
                  <span className={s.checked ? '' : 'text-text-muted line-through'}>{s.name}</span>
                </label>
                <div className="flex gap-1">
                  {LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      disabled={!s.checked}
                      onClick={() => setSkills((prev) => prev.map((row, j) => (j === i ? { ...row, level: lvl } : row)))}
                      className={`px-3 py-1 rounded-full text-xs border transition-colors disabled:opacity-40 ${
                        s.level === lvl ? 'bg-primary text-white border-primary' : 'border-border hover:bg-surface-hover'
                      }`}
                    >
                      {t(`cert.level.${lvl}` as TranslationKey)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <input
                className={input}
                placeholder={t('cert.addSkill')}
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill();
                  }
                }}
              />
              <button type="button" className={ghostBtn} onClick={addSkill}>
                <Plus size={16} /> {t('cert.add')}
              </button>
            </div>
          </div>
        )}
      </div>

      <label className="block">
        <span className={`${label} block mb-2`}>{t('cert.supervisorName')}</span>
        <input className={input} value={supervisor} onChange={(e) => setSupervisor(e.target.value)} required maxLength={255} />
      </label>

      <label className="block">
        <span className={`${label} block mb-2`}>{t('cert.comment')}</span>
        <textarea className={`${input} min-h-[88px]`} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} />
      </label>

      {error && <p className="text-sm text-error break-words">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="submit" className={primaryBtn} disabled={!canSubmit}>
          {saving && <Loader2 size={16} className="animate-spin" />} {t('cert.submit')}
        </button>
        <button type="button" className={ghostBtn} onClick={onCancel}>
          {t('cert.cancel')}
        </button>
      </div>
    </form>
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const CertificatesPage: React.FC = () => {
  const { t } = useLanguage();
  const { user, accessToken } = useAuth();
  const viewer: 'student' | 'company' = user?.role === 'company' ? 'company' : 'student';

  const [certs, setCerts] = useState<ApiCertificate[]>([]);
  const [apps, setApps] = useState<ApiApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formFor, setFormFor] = useState<string | null>(null); // application id

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, a] = await Promise.all([
        api.listCertificates(accessToken),
        viewer === 'company' ? api.listApplications(accessToken) : Promise.resolve([] as ApiApplication[]),
      ]);
      setCerts(c);
      setApps(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [accessToken, viewer]);

  useEffect(() => {
    load();
  }, [load]);

  const certByApp = useMemo(() => new Map(certs.map((c) => [c.applicationId, c])), [certs]);
  const toConfirm = apps.filter((a) => a.status === 'accepted' && !certByApp.has(a.id));

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  const onDecline = (c: ApiCertificate) => {
    const note = window.prompt(t('cert.declinePrompt'));
    if (note === null) return;
    act(c.id, () => api.declineCertificate(c.id, note, accessToken));
  };

  const onRevoke = (c: ApiCertificate) => {
    const reason = window.prompt(t('cert.revokePrompt'));
    if (!reason?.trim()) return;
    act(c.id, () => api.revokeCertificate(c.id, reason.trim(), accessToken));
  };

  const issued = certs.filter((c) => c.status === 'issued').length;
  const pending = certs.filter((c) => c.status === 'awaiting_student' || c.status === 'disputed').length;
  const formApp = formFor ? apps.find((a) => a.id === formFor) : undefined;

  return (
    <div className="px-6 md:px-20 animate-[fadeIn_0.5s_ease-out]">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <Award size={36} className="text-primary shrink-0" />
          <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight">{t('cert.title')}</h1>
        </div>
        <p className="text-text-secondary max-w-2xl mb-10">
          {viewer === 'company' ? t('cert.subtitleCompany') : t('cert.subtitleStudent')}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-12 max-w-md">
          <div className="glass-card p-6 rounded-[24px]">
            <p className={`${label} mb-2`}>{t('cert.issuedCount')}</p>
            <p className="text-3xl font-black">{issued}</p>
          </div>
          <div className="glass-card p-6 rounded-[24px]">
            <p className={`${label} mb-2`}>{t('cert.pendingCount')}</p>
            <p className="text-3xl font-black">{pending}</p>
          </div>
        </div>

        {error && <p className="text-sm text-error mb-6 break-words">{error}</p>}

        {loading ? (
          <div className="flex items-center gap-2 text-text-secondary">
            <Loader2 size={18} className="animate-spin" /> {t('common.loading')}
          </div>
        ) : (
          <div className="space-y-12">
            {viewer === 'company' && (
              <section>
                <h2 className="font-display text-2xl font-bold mb-4">{t('cert.toConfirm')}</h2>
                {formApp ? (
                  <ConfirmForm
                    application={formApp}
                    existing={certByApp.get(formApp.id)}
                    onCancel={() => setFormFor(null)}
                    onDone={() => {
                      setFormFor(null);
                      load();
                    }}
                  />
                ) : toConfirm.length === 0 ? (
                  <p className="text-text-muted text-sm">{t('cert.noAccepted')}</p>
                ) : (
                  <div className="space-y-3">
                    {toConfirm.map((a) => (
                      <div key={a.id} className="glass-card rounded-[24px] p-5 flex flex-wrap items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-bold break-words">{a.role}</p>
                          <p className="text-xs text-text-muted font-mono uppercase">{a.studentName}</p>
                        </div>
                        <button type="button" className={primaryBtn} onClick={() => setFormFor(a.id)}>
                          {t('cert.confirm')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            <section className="space-y-4">
              {viewer === 'company' && <h2 className="font-display text-2xl font-bold">{t('cert.title')}</h2>}
              {certs.length === 0 ? (
                <p className="text-text-muted text-sm">{t('cert.empty')}</p>
              ) : (
                certs.map((c) => (
                  <CertificateCard
                    key={c.id}
                    cert={c}
                    viewer={viewer}
                    busy={busyId === c.id}
                    onAccept={() => act(c.id, () => api.acceptCertificate(c.id, accessToken))}
                    onDecline={() => onDecline(c)}
                    onRevoke={() => onRevoke(c)}
                    onResubmit={() => setFormFor(c.applicationId)}
                  />
                ))
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificatesPage;
