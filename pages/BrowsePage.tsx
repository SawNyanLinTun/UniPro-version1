import React, { useState, useMemo } from 'react';
import { Search, Coins } from 'lucide-react';
import InternshipCard from '../components/InternshipCard';
import { MOCK_INTERNSHIPS } from '../constants';
import { InternshipCategory } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

const BrowsePage: React.FC = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedLocation, setSelectedLocation] = useState<string>('All');

  // Location / category values stay English so they still match mock data
  const locations = ['All', 'Bangkok', 'Phuket', 'Chiang Mai', 'Nonthaburi'];
  const categories = ['All', ...Object.values(InternshipCategory)];

  const filteredInternships = useMemo(() => {
    return MOCK_INTERNSHIPS.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.company.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesLocation =
        selectedLocation === 'All' ||
        item.location.toLowerCase().includes(selectedLocation.toLowerCase());
      return matchesSearch && matchesCategory && matchesLocation;
    });
  }, [searchQuery, selectedCategory, selectedLocation]);

  const labelFor = (value: string) => (value === 'All' ? t('common.all') : value);

  return (
    <div className="px-8 md:px-20 animate-[fadeIn_0.5s_ease-out]">
      <div className="max-w-7xl mx-auto">
        <header className="mb-16">
          <h1 className="font-display text-5xl font-extrabold tracking-tight mb-6">{t('browse.title')}</h1>
          <div className="glass-input max-w-2xl flex items-center p-2 pl-6 rounded-full">
            <Search className="text-text-muted mr-4" size={20} />
            <input
              type="text"
              placeholder={t('browse.searchPlaceholder')}
              className="bg-transparent border-none outline-none flex-1 py-3 text-text placeholder:text-text-muted"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-12">
          <aside className="lg:w-72 space-y-10">
            <div>
              <h3 className="font-mono text-[0.7rem] uppercase text-primary mb-6 tracking-widest">
                {t('browse.categories')}
              </h3>
              <div className="flex flex-col gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-left text-sm py-2 px-4 rounded-xl transition-all ${
                      selectedCategory === cat
                        ? 'bg-surface-elevated text-text font-bold'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    {labelFor(cat)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-mono text-[0.7rem] uppercase text-primary mb-6 tracking-widest">
                {t('browse.location')}
              </h3>
              <div className="flex flex-col gap-3">
                {locations.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setSelectedLocation(loc)}
                    className={`text-left text-sm py-2 px-4 rounded-xl transition-all ${
                      selectedLocation === loc
                        ? 'bg-surface-elevated text-text font-bold'
                        : 'text-text-muted hover:text-text'
                    }`}
                  >
                    {labelFor(loc)}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="flex-1">
            <div className="flex justify-between items-center mb-10">
              <span className="font-mono text-xs text-text-muted uppercase tracking-widest">
                {t('browse.showing', { count: filteredInternships.length })}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 min-h-[400px]">
              {filteredInternships.map((internship, i) => (
                <InternshipCard key={internship.id} internship={internship} delay={`${i * 0.05}s`} />
              ))}
              {filteredInternships.length === 0 && (
                <div className="col-span-full py-24 text-center glass-card rounded-[40px] flex flex-col items-center">
                  <Coins size={40} className="text-text-muted mb-4" />
                  <p className="text-text-muted font-mono text-sm uppercase tracking-widest">
                    {t('browse.empty')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowsePage;
