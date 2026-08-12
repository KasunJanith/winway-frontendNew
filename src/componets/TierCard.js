import React from "react";
import { Card, Statistic, Typography } from "antd";

const { Text } = Typography;

/**
 * TierCard - reusable loyalty tier display card
 * 
 * @param {string} title - Tier name (e.g., Platinum Tier)
 * @param {number|string} value - Tier count
 * @param {string} color - Tier highlight color
 * @param {number|string} threshold - Minimum ticket threshold
 * @param {ReactNode} icon - Icon for the tier
 */
const TierCard = ({ title, value, color, threshold, icon }) => {
  return (
    <Card
      style={{
        borderRadius: 12,
        background: "linear-gradient(145deg, #f9f9f9, #ffffff)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}
    >
      <Statistic
        title={
          <div style={{ lineHeight: 1.2 }}>
            <span style={{ fontSize: 14, color, fontWeight: 600 }}>{title}</span>
            <br />
            <Text type="secondary" style={{ fontSize: 14 }}>
              ≥ {threshold} Tickets
            </Text>
          </div>
        }
        value={value}
        valueStyle={{ color, fontWeight: 700 }}
        prefix={icon}
      />
    </Card>
  );
};

export default TierCard;
