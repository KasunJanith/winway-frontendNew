import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#7366FF"];

const TierChart = ({ data }) => {
  const formatted = data.map((d) => ({
    name: d.tier || "Unknown",
    value: d.count,
  }));

  return (
    <PieChart width={350} height={250}>
      <Pie
        data={formatted}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius={80}
        label
      >
        {formatted.map((_, i) => (
          <Cell key={i} fill={COLORS[i % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  );
};

export default TierChart;
