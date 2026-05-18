'use client'

import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

function generateBatteryData() {
  // Sleep from midnight to ~7am (battery charges), then drains through day
  const points = [
    { time: '12a', energy: 45 },
    { time: '1a',  energy: 52 },
    { time: '2a',  energy: 61 },
    { time: '3a',  energy: 70 },
    { time: '4a',  energy: 79 },
    { time: '5a',  energy: 87 },
    { time: '6a',  energy: 92 },
    { time: '7a',  energy: 95 },
    { time: '8a',  energy: 88 }, // morning routine
    { time: '9a',  energy: 82 },
    { time: '10a', energy: 76 },
    { time: '11a', energy: 70 },
    { time: '12p', energy: 64 },
    { time: '1p',  energy: 58 },
    { time: '2p',  energy: 52 },
    { time: '3p',  energy: 46 }, // afternoon dip
    { time: '4p',  energy: 42 },
    { time: '5p',  energy: 35 }, // workout
    { time: '6p',  energy: 28 },
    { time: '7p',  energy: 38 }, // post-workout recovery
    { time: '8p',  energy: 45 },
    { time: '9p',  energy: 48 },
    { time: '10p', energy: 44 },
    { time: '11p', energy: 40 },
  ]
  return points
}

export default function BodyBattery() {
  const data = generateBatteryData()

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-ink3 text-xs font-semibold uppercase tracking-wider">Energy (Body Battery)</p>
        <span className="text-xs bg-warn/15 text-warn font-medium px-2 py-0.5 rounded-full">Coming Soon</span>
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -32 }}>
          <defs>
            <linearGradient id="batteryGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 8 }} tickLine={false} axisLine={false} interval={5} />
          <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 8 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ background: '#131822', border: '1px solid #1f2937', borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: '#94a3b8' }}
            itemStyle={{ color: '#6366f1' }}
          />
          <Area type="monotone" dataKey="energy" stroke="#6366f1" strokeWidth={2} fill="url(#batteryGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
