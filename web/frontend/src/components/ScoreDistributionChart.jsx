import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function ScoreDistributionChart({ distribution }) {
  if (!distribution || distribution.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-[#1e293b]/50 border border-slate-700 rounded-xl text-slate-400">
        Không có dữ liệu phân bố điểm.
      </div>
    );
  }

  // Transform distribution data for recharts
  // [{ criteria_name, scores: [Number] }] -> [{ name, Min, Max, Avg, Count }]
  const data = distribution.map(d => {
    const scores = d.scores || [];
    if (scores.length === 0) {
      return {
        name: d.criteria_name,
        Min: 0,
        Max: 0,
        Avg: 0,
        Count: 0
      };
    }

    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const sum = scores.reduce((acc, s) => acc + s, 0);
    const avg = Math.round((sum / scores.length) * 100) / 100;

    return {
      name: d.criteria_name,
      Min: min,
      Max: max,
      Avg: avg,
      Count: scores.length
    };
  });

  // Check if all counts are 0
  const hasData = data.some(d => d.Count > 0);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[#1e293b]/50 border border-slate-700 rounded-xl text-slate-400 text-center">
        <p className="text-sm font-medium">Chưa có giám khảo nào nộp điểm calibration.</p>
        <p className="text-xs text-slate-500 mt-1">Biểu đồ phân bố điểm sẽ tự động hiển thị sau khi điểm được nộp.</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#111827] border border-slate-800 rounded-xl p-6 shadow-xl">
      <div className="mb-4">
        <h4 className="text-base font-semibold text-slate-200">Biểu đồ phân bố điểm Calibration</h4>
        <p className="text-xs text-slate-400 mt-1">
          So sánh điểm Thấp nhất (Min), Cao nhất (Max) và Trung bình (Avg) giữa các giám khảo
        </p>
      </div>

      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis 
              dataKey="name" 
              stroke="#9ca3af" 
              fontSize={12} 
              tickLine={false} 
            />
            <YAxis 
              stroke="#9ca3af" 
              fontSize={12} 
              domain={[0, 10]} 
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                borderColor: '#4b5563',
                borderRadius: '8px',
                color: '#f3f4f6'
              }}
            />
            <Legend verticalAlign="top" height={36} />
            <Bar dataKey="Min" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="Max" fill="#60a5fa" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="Avg" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
