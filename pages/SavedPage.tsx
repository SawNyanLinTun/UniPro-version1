import React from 'react';
import { MOCK_INTERNSHIPS } from '../constants';
import InternshipCard from '../components/InternshipCard';
import { HeartOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const SavedPage: React.FC = () => {
  const { t } = useLanguage();
  const savedInternships = MOCK_INTERNSHIPS.slice(0, 3);

  return (
    <div className="px-8 md:px-20 animate-[fadeIn_0.5s_ease-out]">
      <div className="max-w-7xl mx-auto">
        <h1 className="font-display text-5xl font-extrabold tracking-tight mb-4">{t('saved.title')}</h1>
        <p className="text-text-secondary mb-16">{t('saved.subtitle')}</p>

        {savedInternships.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {savedInternships.map((internship, i) => (
              <InternshipCard key={internship.id} internship={internship} delay={`${i * 0.1}s`} />
            ))}
          </div>
        ) : (
          <div className="py-32 flex flex-col items-center justify-center glass-card rounded-[40px]">
            <HeartOff size={48} className="text-text-muted mb-6" />
            <p className="text-text-muted font-mono text-sm uppercase tracking-widest">{t('saved.empty')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedPage;
