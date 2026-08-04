import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const AboutPage: React.FC = () => {
  const { t } = useLanguage();

  const faqs = [
    { q: t('about.q1'), a: t('about.a1') },
    { q: t('about.q2'), a: t('about.a2') },
    { q: t('about.q3'), a: t('about.a3') },
  ];

  return (
    <div className="px-8 md:px-20 animate-[fadeIn_0.5s_ease-out]">
      <div className="max-w-4xl mx-auto py-24">
        <h1 className="font-display text-5xl font-extrabold tracking-tight mb-12">{t('about.title')}</h1>

        <div className="max-w-none text-text-secondary leading-relaxed text-lg space-y-8">
          <p>{t('about.body')}</p>

          <h2 className="text-3xl font-bold text-text mt-16 mb-6 font-display">{t('about.dna')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="p-8 glass-card rounded-[32px]">
              <h3 className="text-xl font-bold mb-4 text-primary font-display">{t('about.card1Title')}</h3>
              <p className="text-sm text-text-secondary">{t('about.card1Body')}</p>
            </div>
            <div className="p-8 glass-card rounded-[32px]">
              <h3 className="text-xl font-bold mb-4 text-resin-purple font-display">{t('about.card2Title')}</h3>
              <p className="text-sm text-text-secondary">{t('about.card2Body')}</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-text mt-16 mb-6 font-display">{t('about.faq')}</h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="glass-card p-8 rounded-[32px]">
                <h4 className="font-bold mb-2 text-text">{faq.q}</h4>
                <p className="text-sm text-text-muted">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
