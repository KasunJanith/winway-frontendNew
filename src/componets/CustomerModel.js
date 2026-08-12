// CustomerModel.jsx — FINAL VERSION WITH RECHARTS HORIZONTAL BAR CHART
import React from "react";
import {
  Modal,
  Card,
  Row,
  Col,
  Descriptions,
  Avatar,
  Tag,
  Button,
  Space,
} from "antd";
import { PhoneOutlined, UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

// 📊 Recharts
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  PieChart,
  Pie,
} from "recharts";

function CustomerModel({ open, onClose, customer, settings }) {
  if (!customer) return null;

  const {
    Current_Customer_Details,
    Iniotial_Ticket_Breakdown_Details,
    Monthly_Update_Details,
  } = customer;

  const tierColors = {
    Platinum: "#9B5DE5",
    Gold: "#E6B800",
    Silver: "#C0C0C0",
    Blue: "#2563EB",
    Warning: "#FFA500",
    Rejected: "#E63946",
  };
  console.log(customer);

  const currentTier = Current_Customer_Details?.Current_Loyalty_Tier;
  const currentTierColor = tierColors[currentTier] || "#7b2ff7";

  // Extract initial breakdown into chart-friendly structure
  const initialBreakdown = Object.entries(Iniotial_Ticket_Breakdown_Details)
    .filter(
      ([key]) =>
        ![
          "MobileNumber",
          "Last_Update",
          "Iniotial_Tier",
          "Iniotial_Ticket_Count",
        ].includes(key)
    )
    .map(([key, val], i) => ({
      key: i,
      lottery: key.replace(/_/g, " "),
      count: Number(val),
    }))
    .filter((item) => item.count > 0); // 🔥 SHOW ONLY LOTTERIES WITH TICKETS

  const chartColors = [
    "#7b2ff7", // purple
    "#6200ea", // deep violet
    "#9575cd", // soft purple
    "#ba68c8", // soft pink-purple
    "#ab47bc", // magenta
    "#4fc3f7", // sky blue
    "#29b6f6", // bright blue
    "#26c6da", // teal cyan
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={1200}
      footer={[
        <Space key="footer" style={{ width: "100%", justifyContent: "end" }}>
          <Button onClick={onClose}>Close</Button>
        </Space>,
      ]}
      title={
        <div
          style={{
            background: "linear-gradient(90deg,#001529,#00509e)",
            color: "white",
            padding: "18px 0",
            margin: "-24px -24px 16px -24px",
            textAlign: "center",
            fontWeight: 700,
            fontSize: 20,
            borderBottom: "3px solid #7b2ff7",
          }}
        >
          {Current_Customer_Details?.FirstName}{" "}
          {Current_Customer_Details?.LastName} — Loyalty Profile
        </div>
      }
    >
      {/* HEADER */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8} style={{ textAlign: "center" }}>
          <Avatar
            size={110}
            icon={<UserOutlined />}
            style={{
              background: currentTierColor,
              fontSize: 38,
              fontWeight: 700,
              color: "white",
            }}
          />
        </Col>

        <Col xs={24} md={16}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              background: "linear-gradient(145deg,#ffffff,#f5f7ff)",
              boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
            }}
          >
            <Descriptions column={2}>
              <Descriptions.Item label="Mobile">
                <PhoneOutlined /> {Current_Customer_Details?.MobileNumber}
              </Descriptions.Item>

              <Descriptions.Item label="Email">
                {Current_Customer_Details?.Email}
              </Descriptions.Item>

              <Descriptions.Item label="Gender">
                {Current_Customer_Details?.Gender}
              </Descriptions.Item>

              <Descriptions.Item label="Registered Date">
                {dayjs(Current_Customer_Details?.RegisteredDate).format(
                  "MMM D, YYYY"
                )}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* MAIN LAYOUT */}
      <Row gutter={[16, 16]}>
        {/* LEFT SIDE — HORIZONTAL BAR CHART */}
        <Col xs={12} md={14}>
          <Card
            bordered={false}
            style={{
              borderRadius: 16,
              background: "white",
              padding: 0,
              height: "100%",
              boxShadow: "0 4px 14px rgba(0,0,0,0.07)",
            }}
          >
            {/* HEADER */}
            <div
              style={{
                background: "linear-gradient(90deg,#001529,#003b80)",
                padding: "14px 20px",
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                color: "white",
                fontWeight: 700,
                fontSize: 17,
                letterSpacing: 0.4,
              }}
            >
              Ticket Distribution At Entry
            </div>

            {/* TOP SUMMARY */}

            {/* 📊 RECHARTS PIE CHART */}
            <div style={{ width: "100%", height: 360, padding: "10px 0" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(value) => Number(value).toLocaleString()}
                    contentStyle={{
                      borderRadius: 10,
                      boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
                    }}
                  />

                  <Pie
                    data={initialBreakdown}
                    dataKey="count"
                    nameKey="lottery"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    labelLine={false}
                    label={({ name, value }) =>
                      `${name}: ${Number(value).toLocaleString()}`
                    }
                  >
                    {initialBreakdown.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={12} md={10}>
          <Card
            bordered={false}
            style={{
              borderRadius: 16,
              background: "white",
              padding: 0,
              height: "100%",
              boxShadow: "0 4px 14px rgba(0,0,0,0.07)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #e0e6ff",
                background: "#f9faff",
              }}
            >
              <div>
                <span style={{ fontSize: 13, color: "#475569" }}>
                  Initial Tier
                </span>
                <br />
                <Tag
                  color={currentTierColor}
                  style={{
                    borderRadius: 6,
                    fontWeight: 700,
                    padding: "4px 12px",
                    fontSize: 14,
                    marginTop: 3,
                  }}
                >
                  {Iniotial_Ticket_Breakdown_Details?.Iniotial_Tier}
                </Tag>
              </div>

              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 13, color: "#475569" }}>
                  Initial Ticket Count
                </span>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 20,
                    color: "#ef6c00",
                    marginTop: 3,
                  }}
                >
                  {Iniotial_Ticket_Breakdown_Details?.Iniotial_Ticket_Count?.toLocaleString()}
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </Modal>
  );
}

export default CustomerModel;
