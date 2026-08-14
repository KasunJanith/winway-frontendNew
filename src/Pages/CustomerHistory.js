import React, { useEffect, useState } from "react";
import {
  Modal,
  Card,
  Row,
  Col,
  Statistic,
  Space,
  Button,
  Descriptions,
  Divider,
  Avatar,
  message,
  Tag,
  Tooltip,
} from "antd";
import {
  PhoneOutlined,
  GiftOutlined,
  CrownOutlined,
  MailOutlined,
  FlagOutlined,
  CalendarOutlined,
  ManOutlined,
  WomanOutlined,
  UserOutlined,
  WalletOutlined,
  SwapRightOutlined,
  FieldTimeOutlined,
  InfoCircleOutlined,
  HistoryOutlined,
  MobileFilled,
  PhoneFilled,
  DownloadOutlined,
} from "@ant-design/icons";
import TierBreakdown from "./TierBreakdown";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getSettings } from "../api/endPoints";


const fmtNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("en-LK") : v ?? "-";
};

const parseCurrencyToNumber = (val) => {
  if (val == null) return 0;
  const cleaned = String(val).replace(/[^0-9.\-]/g, "");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
};

const formatCurrency = (val, currency = "LKR") => {
  const n = parseCurrencyToNumber(val);
  try {
    return n.toLocaleString("en-LK", { style: "currency", currency });
  } catch {
    return `Rs ${n.toLocaleString("en-LK")}`;
  }
};

const tierTagColor = (tier) => {
  switch (tier) {
    case "Platinum":
      return "purple";
    case "Gold":
      return "gold";
    case "Silver":
      return "default";
    case "Blue":
      return "blue";
    default:
      return "geekblue";
  }
};

const CustomerModel = ({ open, onClose, customer, onSendEmail }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleDownloadSummary = () => {
    if (!customer) return;

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();

    // ===== HEADER with Gradient and Logo =====
    const gradientStart = [123, 47, 247]; // #7b2ff7
    const gradientEnd = [179, 127, 235]; // #b37feb
    const steps = 50;

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = gradientStart[0] + t * (gradientEnd[0] - gradientStart[0]);
      const g = gradientStart[1] + t * (gradientEnd[1] - gradientStart[1]);
      const b = gradientStart[2] + t * (gradientEnd[2] - gradientStart[2]);
      doc.setFillColor(r, g, b);
      doc.rect((pageWidth / steps) * i, 0, pageWidth / steps, 25, "F");
    }

    // Logo (optional — replace with your hosted logo or local base64)
    // doc.addImage("/path/to/winway-logo.png", "PNG", 12, 5, 18, 18);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("WINWAY CUSTOMER SUMMARY", pageWidth / 2, 16, { align: "center" });

    // ===== Section 1: Customer Info =====
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("👤 Customer Details", 14, 38);

    const details = [
      ["Full Name", `${customer.FirstName || ""} ${customer.LastName || ""}`],
      ["Email", customer.Email || "N/A"],
      ["Mobile Number", customer.MobileNumber || "N/A"],
      ["Gender", customer.Gender || "N/A"],
      ["Country", customer.Country || "N/A"],
      ["Date of Birth", customer.DateOfBirth || "N/A"],
      ["Registered Date", customer.RegisteredDate || "N/A"],
      ["Status", customer.Status || "N/A"],
    ];

    autoTable(doc, {
      startY: 42,
      body: details,
      theme: "striped",
      styles: { fontSize: 10, cellPadding: 3 },
      head: [],
      alternateRowStyles: { fillColor: [249, 244, 255] },
      columnStyles: { 0: { fontStyle: "bold", textColor: [123, 47, 247] } },
      margin: { left: 14, right: 14 },
    });

    // ===== Section 2: Loyalty Summary =====
    let nextY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("🏆 Loyalty & Wallet Summary", 14, nextY);

    const loyalty = [
      ["Current Tier", customer.Loyalty_Tier || "N/A"],
      ["Ticket Count", customer.Ticket_Count?.toLocaleString() || 0],
      ["Wallet Balance (Rs.)", customer.WalletBalance || "0.00"],
      ["Last Purchase", customer.Last_Purchase_Time || "N/A"],
      ["Old Tier", customer.oldTier || "None"],
      ["Reason", customer.reason || "No Changes"],
      ["Last Month Tickets", customer.lastMonthTickets || 0],
    ];

    autoTable(doc, {
      startY: nextY + 4,
      body: loyalty,
      theme: "striped",
      styles: { fontSize: 10, cellPadding: 3 },
      alternateRowStyles: { fillColor: [245, 247, 255] },
      columnStyles: { 0: { fontStyle: "bold", textColor: [123, 47, 247] } },
      margin: { left: 14, right: 14 },
    });

    // ===== Section 3: Lottery Breakdown =====
    nextY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("🎟️ Lottery Ticket Breakdown", 14, nextY);

    const lotteries = Object.entries(customer.LotteryBreakdown || {})
      .filter(([key]) => key !== "TotalTickets")
      .map(([lottery, count]) => [lottery, count.toLocaleString()]);

    lotteries.push([
      "Total Tickets",
      customer.LotteryBreakdown?.TotalTickets?.toLocaleString() || "0",
    ]);

    autoTable(doc, {
      startY: nextY + 4,
      head: [["Lottery Name", "Tickets"]],
      body: lotteries,
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: {
        fillColor: [123, 47, 247],
        textColor: 255,
        fontStyle: "bold",
      },
      margin: { left: 14, right: 14 },
    });

    // ===== FOOTER with Gradient Line =====
    const footerY = doc.internal.pageSize.getHeight() - 12;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = gradientEnd[0] + t * (gradientStart[0] - gradientEnd[0]);
      const g = gradientEnd[1] + t * (gradientStart[1] - gradientEnd[1]);
      const b = gradientEnd[2] + t * (gradientStart[2] - gradientEnd[2]);
      doc.setFillColor(r, g, b);
      doc.rect(
        (pageWidth / steps) * i,
        footerY - 1,
        pageWidth / steps,
        1.5,
        "F"
      );
    }

    doc.setFontSize(9);
    doc.setTextColor(130);
    doc.text(
      `Generated on ${new Date().toLocaleString(
        "en-LK"
      )} | WinWay Loyalty System`,
      pageWidth / 2,
      footerY + 5,
      { align: "center" }
    );

    // ===== Save =====
    const fileName = `${customer.FirstName || "Customer"}_${
      customer.MobileNumber
    }_Summary.pdf`;
    doc.save(fileName);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const settingsArray = await getSettings();
        const map = Object.fromEntries(
          settingsArray.data.data.map((s) => [s.key, s.value])
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
    fetchSettings();
  }, []);

  if (!customer || !settings) return null;

  // Avatar / initials
  const initials = `${customer.FirstName?.charAt(0) || ""}${
    customer.LastName?.charAt(0) || ""
  }`;

  // Thresholds
  const min = settings.silver || 1000;
  const mid = settings.gold || 3000;
  const max = settings.platinum || 5000;
  const tickets = Number(customer.Ticket_Count || 0);

  let nextTier = null;
  let nextTarget = 0;
  if (tickets < min) {
    nextTier = "Silver";
    nextTarget = min - tickets;
  } else if (tickets < mid) {
    nextTier = "Gold";
    nextTarget = mid - tickets;
  } else if (tickets < max) {
    nextTier = "Platinum";
    nextTarget = max - tickets;
  }

  // Gender-based avatar styling
  const gender = customer.Gender?.toLowerCase();
  const avatarColor =
    gender === "male"
      ? "linear-gradient(135deg,#1890ff,#40a9ff)"
      : gender === "female"
      ? "linear-gradient(135deg,#eb2f96,#ff85c0)"
      : "linear-gradient(135deg,#7b2ff7,#b37feb)";
  const avatarIcon =
    gender === "male" ? (
      <ManOutlined />
    ) : gender === "female" ? (
      <WomanOutlined />
    ) : (
      <UserOutlined />
    );

  // Wallet
  const walletRaw = customer.WalletBalance ?? "";
  const walletNumber = parseCurrencyToNumber(walletRaw);
  const walletPretty = formatCurrency(walletRaw);

  const tierColor =
    customer.Loyalty_Tier === "Platinum"
      ? "#7b2ff7"
      : customer.Loyalty_Tier === "Gold"
      ? "#facc15"
      : customer.Loyalty_Tier === "Silver"
      ? "#a1a1aa"
      : "#1890ff";

  // History
  const history = customer.history;
  const hasHistory =
    history && typeof history === "object" && Object.keys(history).length > 0;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={980}
      centered
      styles={{
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(8px)",
        borderRadius: 18,
        padding: "32px 36px",
      }}
      style={{
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 10px 35px rgba(123,47,247,0.3)",
      }}
      footer={[
        <Space key="footer" style={{ justifyContent: "end", width: "100%" }}>
          <Space>
            {onSendEmail && (
              <Button
                key="send"
                type="primary"
                icon={<MailOutlined />}
                onClick={() => onSendEmail(customer)}
                size="large"
                style={{ border: "none", borderRadius: 8, fontWeight: 600 }}
              >
                Send Email
              </Button>
            )}
            <Button
              key="close"
              danger
              onClick={onClose}
              size="large"
              style={{
                borderRadius: 8,
                fontWeight: 500,
                borderColor: "#d9d9d9",
              }}
            >
              Close
            </Button>
            <Button
              key="download"
              icon={<DownloadOutlined />}
              onClick={handleDownloadSummary}
              size="large"
              style={{
                background: "#7b2ff7",
                color: "white",
                borderRadius: 8,
                fontWeight: 600,
              }}
            >
              Download PDF
            </Button>
          </Space>
        </Space>,
      ]}
      title={
        <div
          style={{
            background: "#001529",
            padding: "22px 0",
            margin: "-32px -36px 25px -36px",
            textAlign: "center",
            color: "white",
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: 0.4,
            boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          {customer?.FirstName} {customer?.LastName}’s Loyalty Profile
        </div>
      }
    >
      <div id="customer-summary-section">
        {/* USER HEADER */}
        <Row gutter={[24, 24]} align="middle" style={{ marginBottom: 25 }}>
          {/* Avatar + Wallet pill BELOW avatar */}
          <Col xs={24} sm={8} md={6} style={{ textAlign: "center" }}>
            <Avatar
              size={120}
              src={customer.ImageURL}
              icon={avatarIcon}
              style={{
                background: avatarColor,
                color: "#fff",
                fontSize: 38,
                fontWeight: 600,
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}
            >
              {initials || "U"}
            </Avatar>

            {/* Wallet chip under avatar */}
            <div
              style={{
                marginTop: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                borderRadius: 999,
                background:
                  "linear-gradient(145deg, rgba(22,119,255,0.08), rgba(123,47,247,0.08))",
                border: "1px solid rgba(22,119,255,0.15)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <WalletOutlined style={{ color: "#1677ff" }} />
              <span style={{ fontWeight: 700, color: "#0b132b" }}>
                {walletPretty}
              </span>
            </div>

            <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 6 }}>
              Wallet Balance
            </div>
            <div style={{ fontSize: 12, color: "#8c8c8c", marginTop: 6 }}>
              Wallet Balance
            </div>
          </Col>

          {/* Basic Info Card */}
          <Col xs={24} sm={16} md={18}>
            <Card
              bordered={false}
              style={{
                borderRadius: 14,
                background: "linear-gradient(145deg,#ffffff,#f8f4ff)",
                boxShadow: "0 3px 10px rgba(123,47,247,0.12)",
                padding: "12px 18px",
              }}
            >
              <Descriptions column={2} bordered={false}>
                <Descriptions.Item label="Full Name">
                  {customer.FirstName} {customer.LastName}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  <MailOutlined style={{ color: "#7b2ff7", marginRight: 6 }} />
                  {customer.Email || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Country">
                  <FlagOutlined style={{ color: "#52c41a", marginRight: 6 }} />
                  {customer.Country || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Mobile Number">
                  <PhoneFilled style={{ color: "#52c41a", marginRight: 6 }} />
                  {customer.MobileNumber || "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Gender">
                  {customer.Gender === "Male" ? (
                    <>
                      <ManOutlined
                        style={{ color: "#1890ff", marginRight: 6 }}
                      />{" "}
                      Male
                    </>
                  ) : (
                    <>
                      <WomanOutlined
                        style={{ color: "#eb2f96", marginRight: 6 }}
                      />{" "}
                      Female
                    </>
                  )}
                </Descriptions.Item>

                <Descriptions.Item label="Wallet Balance">
                  <WalletOutlined
                    style={{ color: "#1677ff", marginRight: 6 }}
                  />
                  {walletPretty}
                </Descriptions.Item>
                <Descriptions.Item label="Date of Birth">
                  <CalendarOutlined
                    style={{ color: "#13c2c2", marginRight: 6 }}
                  />
                  {customer.DateOfBirth || "N/A"}
                </Descriptions.Item>

                <Descriptions.Item label="Registered Date">
                  <CalendarOutlined
                    style={{ color: "#722ed1", marginRight: 6 }}
                  />
                  {customer.RegisteredDate
                    ? dayjs(customer.RegisteredDate).format("MMM DD, YYYY")
                    : "N/A"}{" "}
                </Descriptions.Item>
                <Descriptions.Item label="Last Purchase Time">
                  <CrownOutlined style={{ color: "#fa541c", marginRight: 6 }} />
                  {customer.Last_Purchase_Time
                    ? dayjs(customer.Last_Purchase_Time).format(
                        "MMM DD, YYYY [at] hh:mm A"
                      )
                    : "N/A"}{" "}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>

        {/* SUMMARY CARDS */}
        <Row gutter={[16, 16]} justify="center" style={{ marginBottom: 25 }}>
          {/* Mobile */}

          {/* Total Tickets */}
          <Col xs={24} sm={12} md={6}>
            <Card
              bordered={false}
              hoverable
              style={{
                borderRadius: 14,
                background: "linear-gradient(145deg,#ffffff,#f8f4ff)",
                boxShadow: "0 3px 10px rgba(123,47,247,0.12)",
              }}
            >
              <Statistic
                title={
                  <span>
                    <CrownOutlined
                      style={{ color: "#facc15", marginRight: 8 }}
                    />{" "}
                    Total Tickets
                  </span>
                }
                value={fmtNumber(customer.Ticket_Count)}
                valueStyle={{ color: "#000", fontSize: 18 }}
              />
            </Card>
          </Col>

          {/* Loyalty Tier */}
          <Col xs={24} sm={12} md={6}>
            <Card
              bordered={false}
              hoverable
              style={{
                borderRadius: 14,
                background: "linear-gradient(145deg,#ffffff,#f8f4ff)",
                boxShadow: "0 3px 10px rgba(123,47,247,0.12)",
              }}
            >
              <Statistic
                title={
                  <span>
                    <GiftOutlined
                      style={{ color: "#7b2ff7", marginRight: 8 }}
                    />{" "}
                    Loyalty Tier
                  </span>
                }
                value={customer.Loyalty_Tier || "N/A"}
                valueStyle={{ color: tierColor, fontSize: 18, fontWeight: 600 }}
              />
            </Card>
          </Col>
        </Row>

        {/* RECENT TIER CHANGE (History) */}
        {hasHistory && (
          <>
            <Divider />
            <div
              style={{
                textAlign: "center",
                marginBottom: 10,
                fontWeight: 600,
                color: "#000000ff",
                fontSize: 16,
                letterSpacing: 0.4,
              }}
            >
              <HistoryOutlined style={{ marginRight: 8, color: "#7b2ff7" }} />
              Recent Tier Change
            </div>

            <Card
              bordered={false}
              style={{
                borderRadius: 14,
                background: "linear-gradient(145deg,#ffffff,#f8f4ff)",
                boxShadow: "0 3px 10px rgba(123,47,247,0.12)",
                marginBottom: 8,
              }}
            >
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} md={12}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <Tag color={tierTagColor(history.old_tier)}>
                      {history.old_tier || "N/A"}
                    </Tag>
                    <SwapRightOutlined style={{ color: "#8c8c8c" }} />
                    <Tag color={tierTagColor(history.new_tier)}>
                      {history.new_tier || "N/A"}
                    </Tag>
                  </div>
                  <div style={{ marginTop: 6, color: "#8c8c8c", fontSize: 12 }}>
                    Reason: {history.reason || "—"}
                  </div>
                </Col>

                <Col xs={24} md={12}>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                      justifyContent: "flex-start",
                    }}
                  >
                    <Tag icon={<InfoCircleOutlined />} color="processing">
                      Last Month Tickets: {fmtNumber(history.lastMonthTickets)}
                    </Tag>
                    <Tag icon={<CalendarOutlined />} color="success">
                      Effective Month: {history.effective_month || "—"}
                    </Tag>
                    <Tag icon={<FieldTimeOutlined />} color="default">
                      Updated: {history.updated_at || "—"}
                    </Tag>
                  </div>
                </Col>
              </Row>
            </Card>
          </>
        )}

        <Divider />
        <div
          style={{
            textAlign: "center",
            marginBottom: 10,
            fontWeight: 600,
            color: "#000000ff",
            fontSize: 16,
            letterSpacing: 0.4,
            textShadow: "0 0 8px rgba(123,47,247,0.5)",
          }}
        >
          Loyalty Progress
        </div>

        <TierBreakdown
          ticketCount={customer.Ticket_Count}
          currentTier={customer.Loyalty_Tier}
        />

        {/* Next Tier Info */}
        {nextTier && (
          <div
            style={{
              textAlign: "center",
              marginTop: 35,
              marginBottom: 15,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              animation: "fadeInUp 0.8s ease-out",
            }}
          >
            <div
              style={{
                display: "inline-block",
                background: "linear-gradient(145deg,#ffffff,#f9f5ff)",
                boxShadow:
                  "0 4px 15px rgba(123,47,247,0.15), inset 0 0 12px rgba(255,255,255,0.5)",
                borderRadius: 16,
                padding: "14px 28px",
                minWidth: 420,
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(123,47,247,0.15)",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#555",
                  letterSpacing: 0.3,
                }}
              >
                You’re just{" "}
                <span
                  style={{
                    color: "#7b2ff7",
                    fontWeight: 800,
                    fontSize: 18,
                    background: "linear-gradient(90deg,#7b2ff7,#b37feb)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {fmtNumber(nextTarget)}{" "}
                </span>
                tickets away from unlocking
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontWeight: 800,
                  fontSize: 20,
                  color: "#7b2ff7",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    background: "linear-gradient(90deg,#b37feb,#7b2ff7)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {nextTier} Tier
                </span>
                <span
                  style={{
                    fontSize: 22,
                    color: "#facc15",
                    textShadow: "0 0 8px rgba(250,204,21,0.7)",
                  }}
                >
                  🏆
                </span>
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "#8c8c8c",
                  marginTop: 8,
                  letterSpacing: 0.2,
                }}
              >
                Keep going — every ticket brings you closer!
              </div>
            </div>
          </div>
        )}

        <Divider />
      </div>
    </Modal>
  );
};

export default CustomerModel;
