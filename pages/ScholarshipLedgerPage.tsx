import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Building2, BadgeCheck, ExternalLink, Loader2, Shield } from 'lucide-react';
import { api, ApiCertificatePublic } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { TranslationKey } from '../i18n/translations';

const ghostBtn =
  'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border border-border hover:bg-surface-hover transition-colors';

function formatDate(iso: string, locale: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const ScholarshipLedgerPage: React.FC = () => {
  const { t, locale } = useLanguage();
  const [items, setItems] = useState<ApiCertificatePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('All');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.listPublicCertificates();
        if (!cancelled) setItems(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(items.map((i) => i.category).filter(Boolean))).sort()],
    [items]
  );

  const rows = useMemo(
    () => (category === 'All' ? items : items.filter((i) => i.category === category)),
    [items, category]
  );

  return (
    <div className="px-8 md:px-20 animate-[fadeIn_0.5s_ease-out]">
      <div className="max-w-7xl mx-auto">
        <header className="mb-14 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 glass-card rounded-full text-primary text-[0.6rem] font-mono uppercase tracking-widest mb-6">
            <Shield size={14} /> {t('sch.badge')}
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight mb-4 font-display">{t('sch.title')}</h1>
          <p className="text-text-secondary text-lg leading-relaxed">{t('sch.subtitle')}</p>
        </header>

        {categories.length > 1 && (
          <div className="flex flex-wrap gap-3 mb-10">
            {categories.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`px-5 py-2 rounded-full text-xs font-mono uppercase tracking-widest border transition-colors ${
                  category === key
                    ? 'bg-primary text-white border-primary'
                    : 'border-border text-text-secondary hover:text-text hover:border-border-strong'
                }`}
              >
                {key === 'All' ? t('common.all') : key}
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-error mb-6 break-words">{error}</p>}

        {loading ? (
          <div className="flex items-center gap-2 text-text-secondary">
            <Loader2 size={18} className="animate-spin" /> {t('common.loading')}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-text-muted text-sm">{t('cert.empty')}</p>
        ) : (
          <div className="grid gap-6">
            {rows.map((item) => (
              <article
                key={item.id}
                className="glass-card rounded-[28px] p-8 flex flex-col md:flex-row md:items-start gap-6"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary-muted text-primary flex items-center justify-center shrink-0">
                  <GraduationCap size={26} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold">{item.maskedName}</h2>
                    {item.category && (
                      <span className="text-[0.65rem] font-mono uppercase tracking-widest text-text-muted px-3 py-1 rounded-full border border-border">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary mb-3">{item.role}</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-text-muted uppercase mb-4">
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 size={12} /> {item.company}
                    </span>
                    {item.companyVerified && (
                      <span className="inline-flex items-center gap-1 text-success">
                        <BadgeCheck size={12} /> {t('verify.companyVerified')}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.skills.map((s) => (
                      <span
                        key={s.id}
                        className="px-3 py-1.5 rounded-full bg-primary-muted text-primary text-xs font-semibold"
                      >
                        {s.name} · {t(`cert.level.${s.level}` as TranslationKey)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-row md:flex-col items-start md:items-end justify-between md:justify-start gap-3 shrink-0">
                  {item.issuedAt && (
                    <p className="text-[0.6rem] font-mono uppercase tracking-widest text-text-muted whitespace-nowrap">
                      {t('cert.issued')}: {formatDate(item.issuedAt, locale)}
                    </p>
                  )}
                  <Link to={`/verify/${item.id}`} className={`${ghostBtn} whitespace-nowrap`}>
                    <ExternalLink size={16} /> {t('cert.openVerify')}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScholarshipLedgerPage;
