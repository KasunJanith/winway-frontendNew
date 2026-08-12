









import React from "react";
import {
  Modal,
  Card,
  Row,
  Col,
  Statistic,
  Descriptions,
  Divider,
  Avatar,
  Tag,
  Button,
  Space,
} from "antd";
import {
  CrownOutlined,
  WalletOutlined,
  CalendarOutlined,
  PhoneOutlined,
  UserOutlined,
  DownloadOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import dayjs from "dayjs"; // 📦 make sure you installed dayjs: npm install dayjs

function CustomerModel({ open, onClose, customer }) {
  if (!customer) return null;

  const {
    Current_Customer_Details,
    Iniotial_Ticket_Breakdown_Details,
    Monthly_Update_Details,
  } = customer;

  const tierColors = {
    Platinum: "#9B5DE5", // Elegant purple tone (modern premium look)
    Gold: "#E6B800", // True metallic gold
    Silver: "#C0C0C0", // Standard silver shade
    Blue: "#2563EB", // Same strong WinWay blue
    Warning: "#FFA500", // Bright amber-orange for visibility
    Rejected: "#E63946", // Clear red for danger state
  };

  function getLatestUpdate(updates) {
    if (!Array.isArray(updates) || updates.length === 0) return [];
    const sorted = [...updates].sort((a, b) => {
      const dateA = new Date(a.Last_Update.replace("_", " "));
      const dateB = new Date(b.Last_Update.replace("_", " "));
      return dateA - dateB;
    });
    return sorted;
  }

  const currentTier = Current_Customer_Details?.Current_Loyalty_Tier;
  const totalTickets = Current_Customer_Details?.Current_Ticket_Count || 0;

  const Monthly_Update_Details_Sorted = getLatestUpdate(Monthly_Update_Details);

  // 🧾 PDF Export
  const handleDownload = () => {
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(123, 47, 247);
    doc.rect(0, 0, pageWidth, 25, "F");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("WinWay Customer Report", pageWidth / 2, 16, { align: "center" });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("Customer Details", 14, 40);
    autoTable(doc, {
      startY: 44,
      body: [
        [
          "Name",
          `${Current_Customer_Details?.FirstName} ${Current_Customer_Details?.LastName}`,
        ],
        ["Mobile", Current_Customer_Details?.MobileNumber],
        ["Tier", Current_Customer_Details?.Current_Loyalty_Tier || "-"],
        ["Tickets", totalTickets],
      ],
      theme: "striped",
      styles: { fontSize: 10 },
      margin: { left: 14, right: 14 },
    });
    doc.save(`${Current_Customer_Details?.MobileNumber}_Summary.pdf`);
  };

  // 📊 Prepare chart data
  const chartData = [
    {
      date: "Entry",
      tickets: Iniotial_Ticket_Breakdown_Details?.Iniotial_Ticket_Count || 0,
      tier: Iniotial_Ticket_Breakdown_Details?.Iniotial_Tier || "N/A",
    },
    ...(Monthly_Update_Details_Sorted || []).map((u) => ({
      date: u.Last_Update,
      tickets: u.Monthly_Ticket_Count || 0,
      tier: u.Month_Tier || "N/A",
    })),
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={1000}
      footer={[
        <Space key="actions" style={{ justifyContent: "end", width: "100%" }}>
          <Button onClick={onClose}>Close</Button>
          <Button
            icon={<DownloadOutlined />}
            type="primary"
            style={{ background: "#7b2ff7", border: "none" }}
            onClick={handleDownload}
          >
            Download PDF
          </Button>
        </Space>,
      ]}
      title={
        <div
          style={{
            background: "#001529",
            color: "white",
            padding: "18px 0",
            margin: "-24px -24px 16px -24px",
            textAlign: "center",
            fontWeight: 700,
            fontSize: 20,
          }}
        >
          {Current_Customer_Details?.FirstName}{" "}
          {Current_Customer_Details?.LastName}’s Profile
        </div>
      }
    >
      {/* 🧩 HEADER */}
      <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 25 }}>
        <Col xs={24} sm={8} md={6} style={{ textAlign: "center" }}>
          <Avatar
            size={110}
            icon={<UserOutlined />}
            style={{
              background: tierColors[currentTier] || "#7b2ff7",
              color: "white",
              fontWeight: 600,
            }}
          >
            {Current_Customer_Details?.FirstName?.[0] || "U"}
          </Avatar>
          <div style={{ marginTop: 8, fontWeight: 600 }}>
            {currentTier || "-"}
          </div>
          <div style={{ color: "#8c8c8c", fontSize: 12 }}>Current Tier</div>
        </Col>
        <Col xs={24} sm={16} md={18}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, background: "#fafafa" }}
          >
            <Descriptions column={2} bordered={false}>
              <Descriptions.Item label="Mobile">
                <PhoneOutlined /> {Current_Customer_Details?.MobileNumber}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {Current_Customer_Details?.Email || "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Gender">
                {Current_Customer_Details?.Gender}
              </Descriptions.Item>
              <Descriptions.Item label="Country">
                {Current_Customer_Details?.Country}
              </Descriptions.Item>
              <Descriptions.Item label="Registered Date">
                {Current_Customer_Details?.RegisteredDate
                  ? dayjs(Current_Customer_Details.RegisteredDate).format(
                      "MMM D, YYYY"
                    )
                  : "N/A"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* 🏆 Tier Progress Section with Chart + Circular Progress */}
      <Divider orientation="left"></Divider>
      <Row gutter={[16, 16]} align="middle">
        {/* LEFT - Line Chart */}
        <Col xs={24} md={16}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              background: "linear-gradient(145deg,#ffffff,#f8f4ff)",
              boxShadow: "0 3px 10px rgba(123,47,247,0.12)",
              padding: 20,
            }}
          >
           <ResponsiveContainer width="100%" height={300}>
  <LineChart
    data={chartData}
    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
  >
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip
      contentStyle={{
        backgroundColor: "#fff",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
      formatter={(value, name, entry) => {
        const tier = entry?.payload?.tier || "N/A";
        const color = tierColors[tier] || "#7b2ff7";
        return [
          <span>
            🎟 {value.toLocaleString()}{" "}
            <Tag
              color={color}
              style={{
                borderRadius: 6,
                border: "none",
                fontWeight: 600,
                marginLeft: 4,
              }}
            >
              {tier}
            </Tag>
          </span>,
          "Tickets",
        ];
      }}
      labelFormatter={(label) => `Update: ${label}`}
    />
    <Legend />

    {/* Dynamic Gradient Line */}
    <defs>
      <linearGradient id="tierGradient" x1="0" y1="0" x2="1" y2="0">
        {chartData.map((point, idx) => {
          const offset = (idx / (chartData.length - 1)) * 100;
          const color = tierColors[point.tier] || "#7b2ff7";
          return (
            <stop key={idx} offset={`${offset}%`} stopColor={color} />
          );
        })}
      </linearGradient>
    </defs>

    <Line
      type="linear"  // 🔹 straight lines instead of curves
      dataKey="tickets"
      stroke="url(#tierGradient)"
      strokeWidth={3}
      dot={{
        r: 6,
        strokeWidth: 2,
        fill: (d) => tierColors[d.tier] || "#7b2ff7",
        stroke: "#fff",
      }}
      activeDot={{ r: 9 }}
    />
  </LineChart>
</ResponsiveContainer>

          </Card>
        </Col>

        {/* RIGHT - Circular Ticket Progress */}
        <Col xs={24} md={8}>
          <Card
            bordered={false}
            style={{
              borderRadius: 12,
              background: "linear-gradient(145deg,#ffffff,#f8f4ff)",
              boxShadow: "0 3px 10px rgba(123,47,247,0.12)",
              padding: 20,
            }}
          >
            {(() => {
              const latest = [...Monthly_Update_Details].sort((a, b) => {
                const dateA = new Date(a.Last_Update.replace("_", " "));
                const dateB = new Date(b.Last_Update.replace("_", " "));
                return dateB - dateA;
              })[0];

              const current = Number(latest?.Monthly_Ticket_Count || 0);
              const tier = Current_Customer_Details?.Current_Loyalty_Tier;

              const thresholds = {
                Rejected: 0,
                Warning: 100,
                Blue: 300,
                Silver: 500,
                Gold: 800,
                Platinum: 1000,
              };

              const nextOrder = [
                "Rejected",
                "Warning",
                "Blue",
                "Silver",
                "Gold",
                "Platinum",
              ];
              const tierIndex = nextOrder.indexOf(tier);
              const nextTier = nextOrder[tierIndex + 1] || "Platinum";
              const nextTarget = thresholds[nextTier] || thresholds.Platinum;

              const progress = Math.min(
                (current / nextTarget) * 100,
                100
              ).toFixed(1);
              const remaining = Math.max(nextTarget - current, 0);

              const nextColor = tierColors[nextTier] || "#7b2ff7";

              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6 }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: 160,
                      height: 160,
                      margin: "0 auto",
                    }}
                  >
                    <svg width="160" height="160">
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="#f0f0f0"
                        strokeWidth="12"
                        fill="none"
                      />
                      <motion.circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="url(#grad)"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={440}
                        strokeDashoffset={440 - (440 * progress) / 100}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient
                          id="grad"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="0%"
                        >
                          <stop offset="0%" stopColor={nextColor} />
                          <stop offset="100%" stopColor="#7b2ff7" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 26,
                          fontWeight: 700,
                          color: nextColor,
                        }}
                      >
                        {progress}%
                      </div>
                      <div style={{ fontSize: 13, color: "#555" }}>
                        Complete
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 13,
                      color: "#000",
                      fontWeight: 600,
                    }}
                  >
                    {tier} →{" "}
                    <Tag
                      color={nextColor}
                      style={{
                        border: "none",
                        padding: "2px 10px",
                        borderRadius: 6,
                        fontWeight: 600,
                      }}
                    >
                      {nextTier}
                    </Tag>
                  </div>
                  <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                    {remaining > 0
                      ? `🎟 ${remaining.toLocaleString()} tickets to reach ${nextTier}`
                      : `🏆 You’ve reached the top!`}
                  </div>
                </motion.div>
              );
            })()}
          </Card>
        </Col>
      </Row>
    </Modal>
  );
}

export default CustomerModel;
