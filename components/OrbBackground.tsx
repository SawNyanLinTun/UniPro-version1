import React, { useEffect, useState } from 'react';

const OrbBackground: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 40,
        y: (e.clientY / window.innerHeight - 0.5) * 40,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-bg">
      <div
        className="orb absolute w-[560px] h-[560px] bg-accent opacity-20 rounded-full -top-[12%] -left-[8%] animate-float"
        style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)` }}
      />
      <div
        className="orb absolute w-[480px] h-[480px] bg-primary opacity-20 rounded-full -bottom-[12%] -right-[6%] animate-float"
        style={{ transform: `translate(${mousePos.x * 1.5}px, ${mousePos.y * 1.5}px)`, animationDelay: '-5s' }}
      />
      <div
        className="orb absolute w-[360px] h-[360px] bg-primary opacity-10 rounded-full top-[42%] right-[18%] animate-float"
        style={{ transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)`, animationDelay: '-10s' }}
      />
    </div>
  );
};

export default OrbBackground;
