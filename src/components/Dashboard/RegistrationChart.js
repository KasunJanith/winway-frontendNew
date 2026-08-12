import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const RegistrationChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="registrations" stroke="#FF8042" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default RegistrationChart;
