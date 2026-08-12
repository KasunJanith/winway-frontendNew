import React, { useEffect, useState } from "react";
import axios from "axios";
import { Progress, Tooltip, Typography, message } from "antd";
import { TrophyOutlined } from "@ant-design/icons";

import { ENV } from "../config/env";
const API_BASE = ENV.API_BASE_LOCAL;
const { Text } = Typography;


const TierBreakdown = ({ ticketCount, currentTier }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🎯 Fetch tier thresholds from backend
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE}/api/settings`);
        const map = Object.fromEntries(
          res.data.map((s) => [s.key, parseInt(s.value, 10)])
        );
        setSettings({
          silver: map.LOYALTY_ENTRY_SILVER_TICKETS,
          gold: map.LOYALTY_ENTRY_GOLD_TICKETS,
          platinum: map.LOYALTY_ENTRY_PLATINUM_TICKETS,
        });
      } catch (err) {
        message.error("Failed to load tier settings!");
      } finally {
        setLoading(false);
      }
    };
    // fetchSettings();
  }, []);

  if (!settings || loading) return null;

  // 🧮 Thresholds
  const tickets = Number(ticketCount || 0);
  const silver = settings.silver || 1000;
  const gold = settings.gold || 3000;
  const platinum = settings.platinum || 5000;

  // 🪄 Determine next tier target
  let nextTier = "Silver";
  let nextTarget = silver;

  if (tickets >= silver && tickets < gold) {
    nextTier = "Gold";
    nextTarget = gold;
  } else if (tickets >= gold && tickets < platinum) {
    nextTier = "Platinum";
    nextTarget = platinum;
  } else if (tickets >= platinum) {
    nextTier = "Max Tier Achieved";
    nextTarget = platinum;
  }

  // ✅ Progress % toward next tier
  const progress =
    nextTier === "Max Tier Achieved"
      ? 100
      : Math.min((tickets / nextTarget) * 100, 100);

  // 🎨 Tier color themes
  const tierColors = {
    blue: { gradient: { "0%": "#3b82f6", "100%": "#60a5fa" }, text: "#1d4ed8" },
    silver: {
      gradient: { "0%": "#c0c0c0", "100%": "#9e9e9e" },
      text: "#71717a",
    },
    gold: { gradient: { "0%": "#facc15", "100%": "#f59e0b" }, text: "#b58900" },
    platinum: {
      gradient: { "0%": "#7b2ff7", "100%": "#b37feb" },
      text: "#7b2ff7",
    },
  };

  const tierKey = (currentTier || "blue").toLowerCase();
  const { gradient, text } = tierColors[tierKey] || tierColors.blue;

  return (
    <div
      style={{
        textAlign: "center",
        padding: "30px 0",
      }}
    >
      <Tooltip
        color="#7b2ff7"
        title={`Tickets: ${tickets.toLocaleString()} / ${nextTarget.toLocaleString()}`}
      >
        <Progress
          type="circle"
          percent={parseFloat(progress.toFixed(1))}
          strokeWidth={10}
          size={180}
          strokeColor={gradient}
          trailColor="#f0f0f0"
          format={() => (
            <div style={{ textAlign: "center" }}>
              <TrophyOutlined style={{ color: text, fontSize: 22 }} />
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: text,
                  textTransform: "capitalize",
                }}
              >
                {currentTier || "Blue"}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#555",
                  marginTop: 4,
                }}
              >
                {tickets.toLocaleString()} Tickets
              </div>
            </div>
          )}
        />
      </Tooltip>

      {/* Next Tier Message */}
      {nextTier !== "Max Tier Achieved" && (
        <div
          style={{
            marginTop: 16,
            fontSize: 13,
            color: "#555",
            fontWeight: 500,
          }}
        >
          <span>
            <Text strong style={{ color: "#7b2ff7" }}>
              {nextTarget - tickets}
            </Text>{" "}
            more tickets to reach{" "}
            <Text strong style={{ color: "#7b2ff7" }}>
              {nextTier}
            </Text>{" "}
            tier 🏆
          </span>
        </div>
      )}

      {nextTier === "Max Tier Achieved" && (
        <div
          style={{
            marginTop: 16,
            fontSize: 13,
            fontWeight: 600,
            color: "#7b2ff7",
          }}
        >
          🎉 You’ve reached the highest tier — Platinum!
        </div>
      )}
    </div>
  );
};

export default TierBreakdown;
