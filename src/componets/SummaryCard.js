import React from "react";
import { Card, Statistic } from "antd";

/**
 * SummaryCard - reusable metric display card
 * 
 * @param {string} title - Card title text
 * @param {number|string} value - Value to display
 * @param {ReactNode} icon - Icon to show before value
 * @param {string} gradient - CSS linear-gradient background
 * @param {string} color - Theme color for title and value
 */
const SummaryCard = ({ title, value, icon, gradient, color }) => {
  return (
    <Card
      style={{
        borderRadius: 12,
        background: gradient,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}
    >
      <Statistic
        title={<span style={{ fontSize: 14, color }}>{title}</span>}
        value={value}
        valueStyle={{ fontWeight: 700, color }}
        prefix={icon}
      />
    </Card>
  );
};

export default SummaryCard;
