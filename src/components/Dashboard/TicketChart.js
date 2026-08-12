import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const TicketChart = ({ data }) => {
  const formatted = Object.keys(data).map((key) => ({
    name: key,
    value: data[key] || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={formatted}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#7366FF" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default TicketChart;
