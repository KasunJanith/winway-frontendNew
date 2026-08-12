import React, { useEffect, useState } from "react";
import { Modal, Card, Tag, Spin, message } from "antd";
import axios from "axios";
import {
  UserAddOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
} from "@ant-design/icons";
import { ENV } from "../config/env";
import { getMonthlyUpgrades, getMonthlyUpgradeSummary } from "../api/endPoints";
const API_BASE = ENV.API_BASE_LOCAL;

const removeUnderscore = (text) => text?.replace(/_/g, " ");

const monthStrToDate = (monthStr) => {
  if (!monthStr) return new Date();
  const [year, month] = monthStr.split("_");
  return new Date(`${month} 1, ${year}`);
};

const EvaluationHistoryModal = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);

    try {
   const res = await getMonthlyUpgradeSummary();

      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];

      const sorted = [...data].sort((a, b) => {
        if (a.Evaluation === "First Evaluation") return -1;
        if (b.Evaluation === "First Evaluation") return 1;

        return (
          monthStrToDate(a.Evaluation) -
          monthStrToDate(b.Evaluation)
        );
      });

      setHistory(sorted);
      setSelected(sorted[sorted.length - 1]);

    } catch (e) {
      console.error(e);
      message.error("Failed to load loyalty history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={720}
      style={{ borderRadius: 16 }}
      title={
        <div
          style={{
            background: "#001529",
            color: "white",
            textAlign: "center",
            padding: "16px",
            margin: "-20px -24px 20px -24px",
            fontWeight: 600,
            fontSize: 18,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        >
          Evaluation History
        </div>
      }
    >
      <Card
        style={{
          borderRadius: 16,
          border: "1px solid #f0f0f0",
          background: "linear-gradient(135deg,#ffffff,#fafafa)",
          boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
        }}
        bodyStyle={{ padding: 24 }}
      >
        {loading ? (
          <div style={{ textAlign: "center" }}>
            <Spin />
          </div>
        ) : (
          <>
            {/* Timeline */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "12px",
                marginBottom: 24,
              }}
            >
              {history.map((item, index) => {
                const month =
                  item.Evaluation === "First Evaluation"
                    ? "Entry"
                    : item.Evaluation;

                const isLatest = index === history.length - 1;

                return (
                  <React.Fragment key={month}>
                    <Tag
                      color={isLatest ? "success" : "processing"}
                      onClick={() => setSelected(item)}
                      style={{
                        fontSize: 14,
                        padding: "8px 18px",
                        borderRadius: 999,
                        fontWeight: isLatest ? 600 : 500,
                        cursor: "pointer",
                        boxShadow:
                          selected?.Evaluation === item.Evaluation
                            ? "0 0 0 2px #1677ff"
                            : "0 2px 8px rgba(0,0,0,0.08)",
                      }}
                    >
                      {month == "Entry"
                        ? "First Evaluation in 2025 November"
                        : removeUnderscore(month)}
                      {isLatest && " • Latest"}
                    </Tag>

                    {index < history.length - 1 && (
                      <span style={{ color: "#bfbfbf", fontSize: 18 }}>
                        →
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Stats Cards */}
            {selected && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4,1fr)",
                  gap: "16px",
                }}
              >
                {/* New Customers */}
                <Card
                  style={{
                    borderRadius: 12,
                    textAlign: "center",
                    border: "1px solid #e6f4ff",
                    background: "#f0f7ff",
                  }}
                >
                  <UserAddOutlined
                    style={{ fontSize: 26, color: "#1677ff" }}
                  />
                  <div style={{ fontSize: 24, fontWeight: 600 }}>
                    {selected.New_Customers}
                  </div>
                  <div style={{ color: "#595959" }}>New Customers</div>
                </Card>

                {/* Upgrades */}
                <Card
                  style={{
                    borderRadius: 12,
                    textAlign: "center",
                    border: "1px solid #d9f7be",
                    background: "#f6ffed",
                  }}
                >
                  <ArrowUpOutlined
                    style={{ fontSize: 26, color: "#52c41a" }}
                  />
                  <div style={{ fontSize: 24, fontWeight: 600 }}>
                    {selected.Upgrades}
                  </div>
                  <div style={{ color: "#389e0d" }}>Upgrades</div>
                </Card>

                {/* Downgrades */}
                <Card
                  style={{
                    borderRadius: 12,
                    textAlign: "center",
                    border: "1px solid #ffccc7",
                    background: "#fff2f0",
                  }}
                >
                  <ArrowDownOutlined
                    style={{ fontSize: 26, color: "#ff4d4f" }}
                  />
                  <div style={{ fontSize: 24, fontWeight: 600 }}>
                    {selected.Downgrades}
                  </div>
                  <div style={{ color: "#cf1322" }}>Downgrades</div>
                </Card>

                {/* Same */}
                <Card
                  style={{
                    borderRadius: 12,
                    textAlign: "center",
                    border: "1px solid #d9d9d9",
                    background: "#fafafa",
                  }}
                >
                  <MinusOutlined
                    style={{ fontSize: 26, color: "#8c8c8c" }}
                  />
                  <div style={{ fontSize: 24, fontWeight: 600 }}>
                    {selected.Same}
                  </div>
                  <div style={{ color: "#595959" }}>Same</div>
                </Card>
              </div>
            )}
          </>
        )}
      </Card>
    </Modal>
  );
};

export default EvaluationHistoryModal;