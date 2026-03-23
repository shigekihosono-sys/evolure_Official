
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BarChartComponentProps {
  data: {
    subject: string;
    [key:string]: string | number;
  }[];
  hasAmpoules: boolean;
}

// Consistent color palettes with RadarChartComponent
const evolurePrimaryColor = "#3b82f6";
const evolureSecondaryColor = "#60a5fa";
const comparisonColors = ["#a855f7", "#ec4899", "#f97316", "#14b8a6", "#eab308", "#22d3ee"]; // purple, pink, orange, teal, yellow, cyan

const BASE_SCORE = 50;
const MAX_SCORE = 100;
const CHART_DOMAIN_MAX = MAX_SCORE - BASE_SCORE;

export const BarChartComponent: React.FC<BarChartComponentProps> = ({ data, hasAmpoules }) => {
  if (!data || data.length === 0) {
    return null;
  }

  const competitorKeys = useMemo(() => {
    if (!data || data.length === 0) return [];
    const firstEntryKeys = Object.keys(data[0]);
    return firstEntryKeys.filter(key => 
        key !== 'subject' && 
        key !== '美容液' && 
        key !== 'アンプル追加分' && 
        key !== 'あなたのEvolureプラン'
    );
  }, [data]);

  const transformedData = data.map(entry => {
    const newEntry: { [key: string]: string | number } = { subject: entry.subject };

    for (const key in entry) {
      if (key === 'subject') continue;

      const value = entry[key] as number;
      
      if (key === 'アンプル追加分') {
        newEntry[key] = value;
      } else if (typeof value === 'number') {
        newEntry[key] = Math.max(0, value - BASE_SCORE);
      }
    }
    return newEntry;
  });

  const yAxisTickFormatter = (tickValue: number) => {
    return (tickValue + BASE_SCORE).toString();
  };
  
   const customTooltipContent = (props: any) => {
    const { active, payload, label } = props;

    if (active && payload && payload.length) {
      const planData = { base: 0, boost: 0, hasPlan: false };
      const competitorData: { name: string; value: number, color: string }[] = [];

      payload.forEach((p: any) => {
        if (p.name === '美容液') {
          planData.base = p.value;
          planData.hasPlan = true;
        } else if (p.name === 'アンプル追加分') {
          planData.boost = p.value;
          planData.hasPlan = true;
        } else if (p.name === 'あなたのEvolureプラン') {
           planData.base = p.value;
           planData.hasPlan = true;
        }else {
          competitorData.push({ name: p.name, value: p.value, color: p.fill });
        }
      });
      
      return (
        <div className="p-3 rounded-lg shadow-lg" style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#e2e8f0',
            borderWidth: '1px',
            color: '#334155'
          }}>
          <p className="font-bold text-base text-slate-900 mb-2">{label}</p>
          <ul className="text-sm space-y-1">
            {planData.hasPlan && (
                <li style={{ color: evolurePrimaryColor }}>
                    <span className="font-semibold">
                      {hasAmpoules ? 'アンプル追加後' : 'あなたのEvolureプラン'}:
                    </span>
                    <span className="font-bold ml-2">
                      {(planData.base + planData.boost + BASE_SCORE).toFixed(0)}
                    </span>
                    {hasAmpoules && (
                      <span className="text-xs text-slate-500 ml-1">
                        (美容液: {(planData.base + BASE_SCORE).toFixed(0)}, 追加分: +{planData.boost.toFixed(0)})
                      </span>
                    )}
                </li>
            )}
            {competitorData.map((item, index) => (
              <li key={index} style={{ color: item.color }}>
                <span className="font-semibold">{item.name}:</span>
                <span className="font-bold ml-2">{(item.value + BASE_SCORE).toFixed(0)}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={transformedData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12 }} />
        <YAxis
          domain={[0, CHART_DOMAIN_MAX]}
          tickFormatter={yAxisTickFormatter}
          tick={{ fill: '#64748b' }}
          allowDataOverflow={true}
        />
        <Tooltip
          cursor={{fill: 'rgba(100, 116, 139, 0.1)'}}
          content={customTooltipContent}
        />
        <Legend wrapperStyle={{ color: '#334155' }}/>
        
        {hasAmpoules ? (
            <>
                <Bar name="美容液" dataKey="美容液" stackId="plan" fill={evolureSecondaryColor} />
                <Bar name="アンプル追加分" dataKey="アンプル追加分" stackId="plan" fill={evolurePrimaryColor} />
            </>
        ) : (
            <Bar name="あなたのEvolureプラン" dataKey="あなたのEvolureプラン" fill={evolurePrimaryColor} />
        )}
        
        {competitorKeys.map((key, index) => (
          <Bar key={key} name={key} dataKey={key} fill={comparisonColors[index % comparisonColors.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};
