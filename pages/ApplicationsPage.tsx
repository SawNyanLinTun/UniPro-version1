import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { api, ApiApplication } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { TranslationKey } from '../i18n/translations';

const STATUSES: ApiApplication['status'][] = ['applied', 'under_review', 'interview', 'accepted', 'rejected'];

const statusStyle: Record<ApiApplication['status'], { key: TranslationKey; color: string; bg: string }> = {
  applied: { key: 'apps.status.applied', color: 'text-primary', bg: 'bg-primary-muted' },
  under_review: { key: 'apps.status.under_review', color: 'text-resin-purple', bg: 'bg-resin-purple/10' },
  interview: { key: 'apps.status.interview', color: 'text-accent', bg: 'bg-accent-muted' },
  accepted: { key: 'apps.status.accepted', color: 'text-success', bg: 'bg-success-muted' },
  rejected: { key: 'apps.status.rejected', color: 'text-error', bg: 'bg-error-muted' },
};

const ApplicationsPage: React.FC = () => {
  const { t } = useLanguage();
  const { user, accessToken } = useAuth();
  const viewer: 'student' | 'company' = user?.role === 'company' ? 'company' : 'student';

  const [applications, setApplications] = useState<ApiApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setApplications(await api.listApplications(accessToken));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (app: ApiApplication, status: ApiApplication['status']) => {
    if (status === app.status) return;
    setBusyId(app.id);
    setError(null);
    try {
      const updated = await api.updateApplicationStatus(app.id, status, accessToken);
      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  const stats = useMemo(
    () => [
      { label: viewer === 'company' ? t('apps.totalCompany') : t('apps.total'), val: applications.length },
      { label: t('apps.interviews'), val: applications.filter((a) => a.status === 'interview').length },
      { label: t('apps.underReview'), val: applications.filter((a) => a.status === 'under_review').length },
      { label: t('apps.offers'), val: applications.filter((a) => a.status === 'accepted').length },
    ],
    [applications, viewer, t]
  );

  return (
    <div className="px-8 md:px-20 animate-[fadeIn_0.5s_ease-out]">
      <div className="max-w-7xl mx-auto">
        <h1 className="font-display text-5xl font-extrabold tracking-tight mb-12">
          {viewer === 'company' ? t('apps.titleCompany') : t('apps.title')}
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-20">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-card p-8 rounded-[32px]">
              <p className="font-mono text-[0.6rem] text-text-muted uppercase tracking-widest mb-2">
                {stat.label}
              </p>
              <p className="text-4xl font-black">{String(stat.val).padStart(2, '0')}</p>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-error mb-6 break-words">{error}</p>}

        {loading ? (
          <div className="flex items-center gap-2 text-text-secondary">
            <Loader2 size={18} className="animate-spin" /> {t('common.loading')}
          </div>
        ) : applications.length === 0 ? (
          <p className="text-text-muted text-sm">
            {viewer === 'company' ? t('apps.emptyCompany') : t('apps.empty')}
          </p>
        ) : (
          <div className="glass-card rounded-[40px] overflow-hidden overflow-x-auto">
            <table className="w-full text-left min-w-[720px]">
              <thead className="border-b border-border font-mono text-[0.6rem] uppercase text-text-muted tracking-widest">
                <tr>
                  <th className="px-10 py-6">{t('apps.colPosition')}</th>
                  <th className="px-10 py-6">{t('apps.colStatus')}</th>
                  <th className="px-10 py-6">{t('apps.colSubmitted')}</th>
                  {viewer === 'company' && <th className="px-10 py-6 text-right">{t('apps.colActions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {applications.map((app) => {
                  const status = statusStyle[app.status];
                  return (
                    <tr key={app.id} className="group hover:bg-surface-hover/40 transition-colors">
                      <td className="px-10 py-8">
                        <p className="font-bold text-lg mb-1 break-words">
                          {viewer === 'company' ? app.studentName ?? '—' : app.role}
                        </p>
                        <p className="text-xs text-text-muted font-mono uppercase break-words">
                          {viewer === 'company' ? app.role : app.company}
                        </p>
                      </td>
                      <td className="px-10 py-8">
                        <span
                          className={`px-4 py-1.5 rounded-full text-[0.6rem] font-mono uppercase tracking-widest ${status.bg} ${status.color}`}
                        >
                          {t(status.key)}
                        </span>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <Calendar size={14} /> {app.appliedDate}
                        </div>
                      </td>
                      {viewer === 'company' && (
                        <td className="px-10 py-8 text-right">
                          <select
                            className="bg-surface border border-border rounded-full px-4 py-2 text-xs font-mono uppercase tracking-widest focus:outline-none focus:border-primary disabled:opacity-50"
                            value={app.status}
                            disabled={busyId === app.id}
                            onChange={(e) => changeStatus(app, e.target.value as ApiApplication['status'])}
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {t(statusStyle[s].key)}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicationsPage;
