
import React from 'react';
import { Radar, RadarChart, PolarGrid, Legend, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Score } from '../types';

interface RadarChartData {
  subject: string;
  [key:string]: string | number;
}

interface RadarChartComponentProps {
  data: {
    name: string;
    scores: Score;
  }[];
  categories: (keyof Score)[];
}

// Sophisticated, muted palette
const comparisonColors = ["#78716c", "#a8a29e", "#d6d3d1", "#57534e", "#e7e5e4", "#292524"]; // Stone shades

export const RadarChartComponent: React.FC<RadarChartComponentProps> = ({ data, categories }) => {
  const chartData: RadarChartData[] = categories.map(category => {
    const entry: RadarChartData = { subject: String(category) };
    data.forEach(item => {
      entry[item.name] = item.scores[category as keyof Score] ?? 50;
    });
    return entry;
  });

  const evolurePrimaryColor = "#1c1917"; // Stone 900 - Strong Black/Brown for the main plan
  const evolureSecondaryColor = "#a8a29e"; // Stone 400 - Muted grey for base serum
  
  const getSortOrder = (name: string): number => {
    if (name === '美容液のみ') {
      return 1; 
    }
    if (name === 'アンプル追加後' || name === 'あなたのEVOLUREプラン' || name === 'EVOLUREプラン') {
      return 3; // Top layer for main plan
    }
    return 2; 
  };

  const sortedData = [...data].sort((a, b) => getSortOrder(a.name) - getSortOrder(b.name));
  
  const colorMap = new Map<string, string>();
  let compIndex = 0;
  data.forEach(item => {
    if (item.name === '美容液のみ') {
      colorMap.set(item.name, evolureSecondaryColor);
    } else if (item.name === 'アンプル追加後' || item.name === 'あなたのEVOLUREプラン' || item.name === 'EVOLUREプラン') {
      colorMap.set(item.name, evolurePrimaryColor);
    } else {
      if (!colorMap.has(item.name)) {
        colorMap.set(item.name, comparisonColors[compIndex % comparisonColors.length]);
        compIndex++;
      }
    }
  });


  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
        <PolarGrid stroke="#e7e5e4" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#44403c', fontSize: 12, fontFamily: 'Inter' }} />
        <PolarRadiusAxis angle={30} domain={[50, 100]} tick={{ fill: '#a8a29e', fontSize: 10 }} axisLine={{ stroke: '#e7e5e4' }}/>
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#e7e5e4',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            color: '#1c1917',
            padding: '12px'
          }}
          labelStyle={{ color: '#1c1917', fontWeight: 'bold', marginBottom: '8px', fontFamily: 'Noto Serif JP' }}
           itemStyle={{ fontWeight: 'normal', fontSize: '12px' }}
        />
        <Legend wrapperStyle={{ color: '#44403c', paddingTop: '20px', fontSize: '12px' }}/>
        {sortedData.map((item) => {
          const color = colorMap.get(item.name) || '#000000';
          return <Radar key={item.name} name={item.name} dataKey={item.name} stroke={color} fill={color} fillOpacity={0.4} strokeWidth={2} />;
        })}
      </RadarChart>
    </ResponsiveContainer>
  );
};
