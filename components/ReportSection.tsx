
import React from 'react';

interface ReportSectionProps {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
}

export const ReportSection: React.FC<ReportSectionProps> = ({ icon, title, children }) => (
    <section>
      <div className="flex items-center gap-4 mb-5">
        <div className="flex-shrink-0 w-12 h-12 bg-stone-100 text-stone-800 rounded-2xl flex items-center justify-center border border-stone-200">
            {icon}
        </div>
        <h4 className="text-xl font-bold text-stone-900 font-serif tracking-tight">{title}</h4>
      </div>
      <div className="prose prose-stone prose-sm max-w-prose text-stone-600 leading-relaxed pl-6 border-l-2 border-stone-200 ml-6 pb-2 medical-chart-report-content">
        {children}
      </div>
    </section>
  );
