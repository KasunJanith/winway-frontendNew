import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const PurchaseTrend = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <XAxis dataKey="day" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="total" stroke="#00C49F" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default PurchaseTrend;
