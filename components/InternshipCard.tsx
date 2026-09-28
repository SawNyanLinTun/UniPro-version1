
import React, { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Internship } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

export type ApplyState = 'hidden' | 'locked' | 'idle' | 'busy' | 'applied';

interface InternshipCardProps {
  internship: Internship;
  delay?: string;
  /** Omit (defaults to 'hidden') on pages that shouldn't show an Apply action, e.g. Saved. */
  applyState?: ApplyState;
  onApply?: () => void;
  onSignInRequired?: () => void;
}

const InternshipCard: React.FC<InternshipCardProps> = ({
  internship,
  delay = '0s',
  applyState = 'hidden',
  onApply,
  onSignInRequired,
}) => {
  const { t } = useLanguage();
  const [transform, setTransform] = useState('perspective(1000px) rotateX(0) rotateY(0)');
  const [distortionPos, setDistortionPos] = useState({ x: 0, y: 0, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 25;
    const rotateY = (centerX - x) / 25;

    setTransform(`perspective(1000px) translateY(-10px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`);
    setDistortionPos({ x, y, opacity: 1 });
  };

  const handleMouseLeave = () => {
    setTransform('perspective(1000px) translateY(0) rotateX(0) rotateY(0) scale(1)');
    setDistortionPos(prev => ({ ...prev, opacity: 0 }));
  };

  return (
    <div 
      className={`glass-card relative rounded-[32px] p-8 transition-all duration-500 cursor-pointer overflow-hidden opacity-0 translate-y-8 animate-[revealUp_0.8s_cubic-bezier(0.16,1,0.3,1)_forwards]`}
      style={{ 
        transform,
        animationDelay: delay
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        className="absolute pointer-events-none transition-opacity duration-300 w-40 h-40 rounded-full bg-gradient-to-r from-primary/15 to-transparent blur-xl"
        style={{ 
          left: `${distortionPos.x - 80}px`, 
          top: `${distortionPos.y - 80}px`,
          opacity: distortionPos.opacity
        }}
      />
      
      <div className="relative z-10">
        <span className="font-mono text-[0.65rem] bg-surface-elevated py-1 px-3 rounded text-text-muted mb-6 inline-block uppercase tracking-wider">
          {internship.category}
        </span>
        <h3 className="text-xl font-bold mb-3 leading-tight font-display">{internship.title}</h3>
        <p className="text-text-secondary text-sm leading-relaxed mb-6">
          {internship.description}
        </p>
        
        <div className="flex flex-wrap gap-2 mb-6">
          {internship.tags.map(tag => (
            <span key={tag} className="text-[0.6rem] font-mono text-primary/80 border border-primary/20 px-2 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-text-muted">
          <span className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-primary" />
            {internship.location}
          </span>
          <span className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-primary" />
            {internship.stipend}
          </span>
        </div>

        {applyState !== 'hidden' && (
          <div className="mt-6">
            {applyState === 'applied' ? (
              <span className="inline-flex items-center gap-2 text-success text-xs font-mono uppercase tracking-widest">
                <Check size={14} /> {t('browse.applied')}
              </span>
            ) : (
              <button
                type="button"
                disabled={applyState === 'busy'}
                onClick={(e) => {
                  e.stopPropagation();
                  if (applyState === 'locked') onSignInRequired?.();
                  else onApply?.();
                }}
                className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-full text-xs font-mono uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {applyState === 'busy' && <Loader2 size={14} className="animate-spin" />}
                {applyState === 'locked' ? t('browse.signInToApply') : t('browse.apply')}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <style>{`
        @keyframes revealUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default InternshipCard;
