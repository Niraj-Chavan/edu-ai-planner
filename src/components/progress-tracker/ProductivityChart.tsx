
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const data = [
  { day: 'Mon', completed: 6, total: 8 },
  { day: 'Tue', completed: 7, total: 9 },
  { day: 'Wed', completed: 5, total: 7 },
  { day: 'Thu', completed: 8, total: 10 },
  { day: 'Fri', completed: 4, total: 6 },
  { day: 'Sat', completed: 3, total: 5 },
  { day: 'Sun', completed: 2, total: 3 },
];

const ProductivityChart = () => {
  // Calculate productivity percentage for each day
  const chartData = data.map(item => ({
    day: item.day,
    productivity: Math.round((item.completed / item.total) * 100),
  }));

  // Calculate average productivity
  const avgProductivity = Math.round(
    chartData.reduce((acc, item) => acc + item.productivity, 0) / chartData.length
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Productivity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col">
          <div className="text-4xl font-bold text-accent">{avgProductivity}%</div>
          <p className="text-sm text-muted-foreground mb-4">Average productivity this week</p>
          
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <XAxis 
                  dataKey="day" 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, 100]}
                />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Productivity']}
                  contentStyle={{ 
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                  }}
                />
                <defs>
                  <linearGradient id="productivityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="productivity" 
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  fill="url(#productivityGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductivityChart;
