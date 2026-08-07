import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card } from "../ui/card";

const data = [
  { name: "Jan", movements: 12000 },
  { name: "Feb", movements: 18000 },
  { name: "Mar", movements: 14500 },
  { name: "Apr", movements: 22000 },
  { name: "May", movements: 24000 },
  { name: "Jun", movements: 28000 },
];

export function TrendChart() {
  return (
    <Card className="h-[340px]">
      <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Stock Movement Trend</h3>
      <ResponsiveContainer width="100%" height="88%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="movementFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0f766e" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#0f766e" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey="movements" stroke="#0f766e" fill="url(#movementFill)" strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
