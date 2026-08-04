import React from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { TranslationKey } from '../i18n/translations';

const ApplicationsPage: React.FC = () => {
  const { t } = useLanguage();

  // Application row data left unchanged
  const applications = [
    { id: '1', role: 'Software Engineer', company: 'Agoda', status: 'interview', date: 'Mar 15, 2024' },
    { id: '2', role: 'UI/UX Designer', company: 'Lineman Wongnai', status: 'under_review', date: 'Mar 12, 2024' },
    { id: '3', role: 'Data Analyst', company: 'Shopee', status: 'applied', date: 'Mar 10, 2024' },
  ];

  const statusStyle = {
    applied: { key: 'apps.status.applied' as TranslationKey, color: 'text-primary', bg: 'bg-primary-muted' },
    under_review: { key: 'apps.status.under_review' as TranslationKey, color: 'text-resin-purple', bg: 'bg-resin-purple/10' },
    interview: { key: 'apps.status.interview' as TranslationKey, color: 'text-accent', bg: 'bg-accent-muted' },
    accepted: { key: 'apps.status.accepted' as TranslationKey, color: 'text-success', bg: 'bg-success-muted' },
    rejected: { key: 'apps.status.rejected' as TranslationKey, color: 'text-error', bg: 'bg-error-muted' },
  };

  const stats = [
    { label: t('apps.total'), val: '08' },
    { label: t('apps.interviews'), val: '02' },
    { label: t('apps.underReview'), val: '04' },
    { label: t('apps.offers'), val: '01' },
  ];

  return (
    <div className="px-8 md:px-20 animate-[fadeIn_0.5s_ease-out]">
      <div className="max-w-7xl mx-auto">
        <h1 className="font-display text-5xl font-extrabold tracking-tight mb-12">{t('apps.title')}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-20">
          {stats.map((stat) => (
            <div key={stat.label} className="glass-card p-8 rounded-[32px]">
              <p className="font-mono text-[0.6rem] text-text-muted uppercase tracking-widest mb-2">
                {stat.label}
              </p>
              <p className="text-4xl font-black">{stat.val}</p>
            </div>
          ))}
        </div>

        <div className="glass-card rounded-[40px] overflow-hidden overflow-x-auto">
          <table className="w-full text-left min-w-[720px]">
            <thead className="border-b border-border font-mono text-[0.6rem] uppercase text-text-muted tracking-widest">
              <tr>
                <th className="px-10 py-6">{t('apps.colPosition')}</th>
                <th className="px-10 py-6">{t('apps.colStatus')}</th>
                <th className="px-10 py-6">{t('apps.colSubmitted')}</th>
                <th className="px-10 py-6 text-right">{t('apps.colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {applications.map((app) => {
                const status = statusStyle[app.status as keyof typeof statusStyle];
                return (
                  <tr key={app.id} className="group hover:bg-surface-hover/40 transition-colors cursor-pointer">
                    <td className="px-10 py-8">
                      <p className="font-bold text-lg mb-1">{app.role}</p>
                      <p className="text-xs text-text-muted font-mono uppercase">{app.company}</p>
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
                        <Calendar size={14} /> {app.date}
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <button type="button" className="text-text-muted group-hover:text-primary transition-colors">
                        <ArrowRight size={20} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ApplicationsPage;
