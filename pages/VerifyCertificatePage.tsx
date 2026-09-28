import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, ShieldX, ShieldAlert, Building2, Calendar, Loader2, BadgeCheck } from 'lucide-react';
import { api, ApiCertificateVerify, SignedCertificate } from '../services/api';
import { verifyEd25519InBrowser } from '../services/certificateVerify';
import { useLanguage } from '../contexts/LanguageContext';
import { TranslationKey } from '../i18n/translations';

type State =
  | { kind: 'loading' }
  | { kind: 'notFound' }
  | { kind: 'loaded'; data: ApiCertificateVerify; cert: SignedCertificate | null; browserCheck: boolean | null };

function formatDate(iso: string, locale: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const VerifyCertificatePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useLanguage();
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    if (!id) {
      setState({ kind: 'notFound' });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await api.verifyCertificate(id);
        let cert: SignedCertificate | null = null;
        try {
          cert = JSON.parse(data.signedData) as SignedCertificate;
        } catch {
          cert = null;
        }
        // Check the signature ourselves too, instead of only trusting the server's answer.
        const browserCheck = await verifyEd25519InBrowser(data.signedData, data.signature, data.publicKey);
        if (!cancelled) setState({ kind: 'loaded', data, cert, browserCheck });
      } catch {
        if (!cancelled) setState({ kind: 'notFound' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const verdict = useMemo(() => {
    if (state.kind !== 'loaded') return null;
    const { data, browserCheck, cert } = state;
    // The browser's own check wins when it could run; otherwise use the server's.
    const signatureOk = (browserCheck ?? data.signatureValid) && cert !== null && cert.id === data.id;
    if (!signatureOk) return 'invalid' as const;
    if (data.status === 'revoked') return 'revoked' as const;
    return 'valid' as const;
  }, [state]);

  if (state.kind === 'loading') {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 flex items-center justify-center gap-3 text-text-secondary">
        <Loader2 size={18} className="animate-spin" /> {t('verify.checking')}
      </div>
    );
  }

  if (state.kind === 'notFound') {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <ShieldAlert size={40} className="mx-auto mb-6 text-text-muted" />
        <h1 className="font-display text-2xl font-bold mb-3">{t('verify.notFound')}</h1>
        <p className="text-text-secondary text-sm">{t('verify.notFoundBody')}</p>
      </div>
    );
  }

  const { data, cert, browserCheck } = state;
  const banner = {
    valid: { icon: <ShieldCheck size={28} />, title: 'verify.valid', body: 'verify.validBody', cls: 'bg-success-muted text-success' },
    revoked: { icon: <ShieldX size={28} />, title: 'verify.revoked', body: null, cls: 'bg-error-muted text-error' },
    invalid: { icon: <ShieldX size={28} />, title: 'verify.invalid', body: 'verify.invalidBody', cls: 'bg-error-muted text-error' },
  }[verdict ?? 'invalid'];

  return (
    <div className="px-6 md:px-20 py-8 animate-[fadeIn_0.5s_ease-out]">
      <div className="max-w-3xl mx-auto">
        <p className="font-mono text-[0.6rem] text-text-muted uppercase tracking-widest mb-4">{t('verify.title')}</p>

        <div className={`rounded-[28px] p-6 md:p-8 flex items-start gap-4 mb-8 ${banner.cls}`}>
          <div className="shrink-0">{banner.icon}</div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
              {t(banner.title as TranslationKey)}
            </h1>
            {banner.body && <p className="text-sm mt-2 text-text-secondary">{t(banner.body as TranslationKey)}</p>}
            {verdict === 'revoked' && data.revokeReason && (
              <p className="text-sm mt-2 text-text-secondary">
                {data.revokeReason}
                {data.revokedAt ? ` · ${formatDate(data.revokedAt, locale)}` : ''}
              </p>
            )}
          </div>
        </div>

        {cert && (
          <div className="glass-card rounded-[32px] p-6 md:p-10">
            <p className="font-mono text-[0.6rem] text-text-muted uppercase tracking-widest mb-2">{t('verify.student')}</p>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight mb-8 break-words">
              {cert.student.name || '—'}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div>
                <p className="font-mono text-[0.6rem] text-text-muted uppercase tracking-widest mb-2">{t('verify.company')}</p>
                <p className="font-bold flex items-center gap-2 flex-wrap">
                  <Building2 size={16} className="text-text-muted" /> {cert.company.name}
                  {cert.company.verified && (
                    <span className="inline-flex items-center gap-1 text-[0.65rem] font-mono uppercase tracking-wider text-success">
                      <BadgeCheck size={14} /> {t('verify.companyVerified')}
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="font-mono text-[0.6rem] text-text-muted uppercase tracking-widest mb-2">{t('verify.role')}</p>
                <p className="font-bold">{cert.internship.role}</p>
              </div>
              <div>
                <p className="font-mono text-[0.6rem] text-text-muted uppercase tracking-widest mb-2">{t('cert.period')}</p>
                <p className="flex items-center gap-2 text-text-secondary">
                  <Calendar size={16} /> {formatDate(cert.period.start, locale)} – {formatDate(cert.period.end, locale)}
                </p>
              </div>
              <div>
                <p className="font-mono text-[0.6rem] text-text-muted uppercase tracking-widest mb-2">{t('cert.confirmedBy')}</p>
                <p className="text-text-secondary">{cert.confirmedBy.name}</p>
              </div>
            </div>

            <p className="font-mono text-[0.6rem] text-text-muted uppercase tracking-widest mb-3">{t('cert.skills')}</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {cert.skills.map((s) => (
                <span key={s.id} className="px-4 py-2 rounded-full bg-primary-muted text-primary text-sm font-semibold">
                  {s.name} · {t(`cert.level.${s.level}` as TranslationKey)}
                </span>
              ))}
            </div>

            {cert.confirmedBy.comment && (
              <blockquote className="border-l-2 border-border-strong pl-4 text-text-secondary text-sm italic mb-8">
                {cert.confirmedBy.comment}
              </blockquote>
            )}

            <p className="text-xs text-text-muted mb-6">{t('verify.statement')}</p>

            <details className="text-xs text-text-muted">
              <summary className="cursor-pointer font-mono uppercase tracking-widest">{t('verify.technical')}</summary>
              <div className="mt-4 space-y-2 break-all font-mono">
                <p>{browserCheck === null ? t('verify.serverChecked') : t('verify.browserChecked')}</p>
                <p>ID: {data.id}</p>
                <p>{t('cert.issued')}: {formatDate(cert.issuedAt, locale)}</p>
                <p>Algorithm: {data.algorithm} · Key: {data.keyId}</p>
                <p>Public key: {data.publicKey}</p>
                <p>Signature: {data.signature}</p>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyCertificatePage;
