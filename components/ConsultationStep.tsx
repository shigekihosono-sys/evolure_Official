
import React from 'react';

interface ConsultationStepProps {
  step: number;
  title: string;
  children: React.ReactNode;
}

export const ConsultationStep: React.FC<ConsultationStepProps> = ({ step, title, children }) => (
  <div className="animate-fade-in-up">
    <div className="flex items-center gap-4 mb-6">
       <div className="w-10 h-10 rounded-full bg-stone-900 text-white font-serif font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-md">
        {step}
      </div>
      <h2 className="text-2xl font-bold text-stone-900 font-serif tracking-tight">{title}</h2>
    </div>
    <div className="pl-4 md:pl-14">
        {children}
    </div>
  </div>
);
