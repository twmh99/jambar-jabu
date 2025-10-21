import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Tooltip } from "recharts";

export default function Analytics() {
  // Dummy data simulasi — nanti bisa diambil dari API summary
  const productivityData = [
    { week: "M1", value: 75 },
    { week: "M2", value: 82 },
    { week: "M3", value: 88 },
    { week: "M4", value: 91 },
  ];

  const overtimeData = [
    { name: "Jam Lembur", value: 18 },
    { name: "Jam Normal", value: 82 },
  ];

  const totalOvertime = overtimeData.find((d) => d.name === "Jam Lembur").value;
  const avgProductivity = (
    productivityData.reduce((acc, d) => acc + d.value, 0) / productivityData.length
  ).toFixed(1);

  const COLORS = ["#f7c948", "#0b2545"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 📊 Kinerja Pegawai */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Kinerja Pegawai (Sparkline)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end gap-2">
            <h2 className="text-3xl font-semibold text-[hsl(var(--primary))]">
              {avgProductivity}%
            </h2>
            <span className="text-sm text-[hsl(var(--muted-foreground))]">
              rata-rata produktivitas bulan ini
            </span>
          </div>

          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={productivityData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#f7c948"
                  strokeWidth={3}
                  dot={{ fill: "#f7c948", r: 4 }}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, "Produktivitas"]}
                  labelFormatter={(label) => `Minggu ${label}`}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 🕓 Rasio Lembur */}
      <Card>
        <CardHeader>
          <CardTitle>Rasio Lembur</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center">
          <div className="relative w-40 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={overtimeData}
                  dataKey="value"
                  innerRadius={50}
                  outerRadius={70}
                  stroke="none"
                  paddingAngle={3}
                >
                  {overtimeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value}%`, name]} />
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold text-[hsl(var(--primary))]">
                {totalOvertime}%
              </span>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                Lembur
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
