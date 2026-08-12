import React, { useState, useRef } from "react";
import {
  Card,
  Typography,
  Row,
  Col,
  Button,
  Table,
  message,
  Divider,
  Modal,
  Space,
  Progress,
  List,
  Tooltip,
  Tag,
  Input,
  Statistic,
} from "antd";
import {
  MailOutlined,
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  ClockCircleTwoTone,
  PauseCircleOutlined,
  PlayCircleOutlined,
  StopOutlined,
  PieChartOutlined,
  BarChartOutlined,
  RedoOutlined,
  CalendarOutlined,
  TrophyOutlined,
  PictureOutlined,
  DownloadOutlined,
  CrownOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import axios from "axios";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Switch } from "antd";

import { ENV } from "../config/env";
const API_BASE = ENV.API_BASE_LOCAL;

const { Text } = Typography;

function ResultsView({ results, lotteryPrizes }) {
  const [customerPage, setCustomerPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [chartType, setChartType] = useState("pie");
  const [sendingMailAll, setSendingMailAll] = useState(false);
  const [sendingMailSingle, setSendingMailSingle] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logList, setLogList] = useState([]);
  const [searchText, setSearchText] = useState(""); // 🔍 Search bar state
  const [IS_TEST_MODE, Set_IS_TEST_MODE] = useState(true);
  const pausedRef = useRef(false);
  const stoppedRef = useRef(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 5 });

  const COLORS = ["#1890ff", "#52c41a", "#faad14", "#722ed1", "#eb2f96"];
  if (!results) return null;

  const weekStart = results?.week_range?.start_date || "N/A";
  const weekEnd = results?.week_range?.end_date || "N/A";
  const totalCustomers = results?.summary?.total_customers || 0;
  const totalTickets = results?.summary?.total_tickets || 0;
  const totalWinnings = results?.summary?.total_winnings || 0;

  const rankedData = [...(results.emails || [])]
    .sort((a, b) => b.Total_Winnings - a.Total_Winnings)
    .map((e, i) => {
      const details = (results.tblData || [])
        .filter((t) => t.MobileNumber === e.MobileNumber)
        .map((item, index) => ({
          key: index + 1,
          Lottery_Type: item.Lottery_Type || "Unknown Lottery",
          Count: item.Count || 0,
          Winnings: item.Total_Winnings || 0,
        }));

      return {
        key: i + 1,
        rank: i + 1,
        name: e.Customer_Name || "Unknown",
        email: e.Email,
        mobile: e.MobileNumber,
        winnings: e.Total_Winnings || 0,
        tickets: e.Total_Tickets || 0,
        details,
      };
    });

  // 🔍 Filter data based on search text
  const filteredCustomers = rankedData.filter((c) => {
    const query = searchText.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.mobile && c.mobile.toLowerCase().includes(query))
    );
  });

  // 📧 Send email logic
  const sendEmail = async (customer, i, isSingle) => {
    try {
      const tblData = (customer.details || []).map((item) => ({
        name: item.Lottery_Type,
        count: item.Count,
        winnings: item.Total_Winnings,
      }));

      const formData = new FormData();
      if (IS_TEST_MODE) {
        formData.append(
          "to",
          customer.email ? "chamikadeshan97@gmail.com" : "",
        );
      } else {
        formData.append("to", customer.email ? customer.email : "");
        if (i < 20 && !isSingle) {
          formData.append("cc", "info@winway.lk");
        }
      }

      formData.append("name", customer.name);
      formData.append("tickets", customer.tickets);
      formData.append("winnings", customer.winnings);
      formData.append(
        "subject",
        `${customer.name} - Weekly Summary (${weekStart} → ${weekEnd})`,
      );
      formData.append("tblData", JSON.stringify(tblData));
      formData.append("superPrizes", JSON.stringify(lotteryPrizes || {}));
      formData.append("weekStart", results?.week_range?.start_date || "");
      formData.append("weekEnd", results?.week_range?.end_date || "");

      const res = await axios.post(
        `${API_BASE}/email/sendToCustomer`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      if (res.data?.imagePath) {
        message.info(
          `📸 No email for ${customer.name}. Image saved at ${res.data.imagePath}`,
        );
        return { status: "image", path: res.data.imagePath };
      }

      message.success(`✅ Email sent to ${customer.email || customer.name}`);
      return { status: "success" };
    } catch (error) {
      console.error("❌ Email send error:", error);
      message.error(`❌ Failed for ${customer.name}`);
      return { status: "failed" };
    }
  };

  // 📤 Send all emails
  const handleSendAllEmails = async () => {
    setSendingMailAll(true);
    setLogModalVisible(true);
    setLogList([]);
    setProgress(0);
    pausedRef.current = false;
    stoppedRef.current = false;

    const total = IS_TEST_MODE ? 5 : rankedData.length;
    let sentCount = 0;

    for (let i = 0; i < total; i++) {
      const customer = rankedData[i];
      if (stoppedRef.current) break;

      while (pausedRef.current && !stoppedRef.current) {
        await new Promise((r) => setTimeout(r, 500));
      }

      setLogList((prev) => [
        ...prev,
        { name: customer.name, email: customer.email, status: "sending" },
      ]);

      const result = await sendEmail(customer, i, false);
      sentCount++;
      setProgress(Math.round((sentCount / total) * 100));

      setLogList((prev) =>
        prev.map((l) =>
          l.name === customer.name
            ? { ...l, status: result.status, imagePath: result.path || null }
            : l,
        ),
      );

      await new Promise((r) => setTimeout(r, 600));
    }

    setSendingMailAll(false);
  };
  const handleDownloadNoEmailList = async () => {
    const noEmailCustomers = rankedData.filter((c) => !c.email);

    if (noEmailCustomers.length === 0) {
      message.info("✅ All customers have emails — nothing to download.");
      return;
    }

    const headers = ["Customer Name", "Mobile Number"];
    const rows = noEmailCustomers.map((c) => [c.name, c.mobile]);

    const csvContent = [headers, ...rows].map((r) => r.join(",")).join("\n");

    const fileName = `WinWay_NoEmail_Customers_${
      new Date().toISOString().split("T")[0]
    }.csv`;

    try {
      await axios.post(`${API_BASE}/weekly-files/save-no-email-csv`, {
        fileName,
        content: csvContent,
      });

      message.success(
        `📥 Downloaded & saved ${noEmailCustomers.length} customer(s).`,
      );
    } catch (err) {
      message.error("Failed to generate CSV.");
    }
  };

  const handlePause = () => (pausedRef.current = true);
  const handleResume = () => (pausedRef.current = false);
  const handleStop = () => {
    stoppedRef.current = true;
    pausedRef.current = false;
    setLogModalVisible(false);
    message.info("🛑 Email sending stopped.");
  };

  const retrySingleEmail = async (email) => {
    const customer = rankedData.find((c) => c.email === email);
    if (!customer) return;
    const result = await sendEmail(customer, true);
    setLogList((prev) =>
      prev.map((l) =>
        l.email === email
          ? { ...l, status: result.status, imagePath: result.path || null }
          : l,
      ),
    );
  };

  const successCount = logList.filter((l) => l.status === "success").length;
  const failCount = logList.filter((l) => l.status === "failed").length;
  const imageCount = logList.filter((l) => l.status === "image").length;

  const handleSendEmail = async () => {
    if (!selectedCustomer) return;
    setSendingMailSingle(true);
    await sendEmail(selectedCustomer, true);
    setSendingMailSingle(false);
  };

  const handleRowClick = (record) => {
    setSelectedCustomer(record);
    setIsModalVisible(true);
  };

  // 🎨 UI
  return (
    <div style={{ maxWidth: 1250 }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* 📅 Week */}
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Week"
              prefix={<CalendarOutlined style={{ color: "#7b2ff7" }} />} // Violet
              value={`${weekStart} → ${weekEnd}`}
              valueStyle={{ color: "#7b2ff7", fontWeight: 600 }}
            />
          </Card>
        </Col>

        {/* 👥 Total Customers */}
        <Col xs={24} sm={12} md={4}>
          <Card>
            <Statistic
              title="Total Customers"
              value={totalCustomers}
              prefix={<TeamOutlined style={{ color: "#36cfc9" }} />} // Teal
              valueStyle={{ color: "#36cfc9", fontWeight: 600 }}
            />
          </Card>
        </Col>

        {/* 👑 Total Tickets */}
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Tickets"
              value={totalTickets}
              prefix={<CrownOutlined style={{ color: "#facc15" }} />} // Gold
              valueStyle={{ color: "#facc15", fontWeight: 600 }}
            />
          </Card>
        </Col>

        {/* 🏆 Total Winnings */}
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Winnings"
              value={totalWinnings.toLocaleString()}
              prefix={<TrophyOutlined style={{ color: "#ff4d4f" }} />} // Red
              valueStyle={{ color: "#ff4d4f", fontWeight: 600 }}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      <Row
        gutter={[16, 16]}
        align="middle"
        style={{
          marginBottom: 20,
          padding: "12px 16px",
          background: "#ffffffff",
          borderRadius: 12,
          border: "1px solid #f0f0f0",
        }}
      >
        {/* 🔍 Search */}
        <Col xs={24} md={8}>
          <Input.Search
            placeholder="Search by name, email, or mobile"
            allowClear
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setCustomerPage(1);
            }}
          />
        </Col>

        {/* 📧 Send All */}
        <Col xs={24} sm={12} md={4}>
          <Button
            block
            type="primary"
            icon={<MailOutlined />}
            onClick={handleSendAllEmails}
            loading={sendingMailAll}
            style={{
              background: "linear-gradient(90deg,#52c41a,#8bc34a)",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
            }}
          >
            Send All
          </Button>
        </Col>

        {/* ⬇️ Download */}
        <Col xs={24} sm={12} md={6}>
          <Button
            block
            icon={<DownloadOutlined />}
            type="primary"
            onClick={handleDownloadNoEmailList}
            style={{
              background: "#1677ff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
            }}
          >
            No-Email List
          </Button>
        </Col>

        {/* 🧪 TEST / LIVE Toggle */}
        <Col xs={24} md={6} style={{ textAlign: "right" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 14px",
              borderRadius: 12,
              background: IS_TEST_MODE
                ? "linear-gradient(90deg,#fff7e6,#fff1b8)"
                : "linear-gradient(90deg,#e6f4ff,#bae0ff)",
              border: `1px solid ${IS_TEST_MODE ? "#ffd591" : "#91caff"}`,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 0.3,
                color: IS_TEST_MODE ? "#d46b08" : "#0958d9",
              }}
            >
              {IS_TEST_MODE ? "TEST MODE " : "LIVE MODE "}
            </span>

            <Switch checked={IS_TEST_MODE} onChange={Set_IS_TEST_MODE} />
          </div>
        </Col>
      </Row>

      <Table
        dataSource={filteredCustomers}
        columns={[
          {
            title: "🏆 Rank",
            dataIndex: "rank",
            align: "center",
            render: (rank) => {
              const emojis = ["🥇", "🥈", "🥉"];
              return emojis[rank - 1] || `#${rank}`;
            },
          },
          { title: "Customer Name", dataIndex: "name" },
          {
            title: "Email",
            dataIndex: "email",
            render: (email) =>
              email ? (
                email
              ) : (
                <Tag color="gold" style={{ fontWeight: 500 }}>
                  No Email (Image Saved)
                </Tag>
              ),
          },
          { title: "Tickets", dataIndex: "tickets", align: "center" },
          {
            title: "Winnings (Rs.)",
            dataIndex: "winnings",
            align: "center",
            render: (val) => (
              <Text strong style={{ color: val > 0 ? "#389e0d" : "#999" }}>
                Rs. {val.toLocaleString()}
              </Text>
            ),
          },
        ]}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          showSizeChanger: true,
          pageSizeOptions: ["5", "10", "20", "50", "100"],
          showTotal: (total, range) =>
            `Showing ${range[0]}-${range[1]} of ${total} ${"customers"}`,
          onChange: (page, pageSize) =>
            setPagination({ current: page, pageSize }),
        }}
        size="middle"
        scroll={{ x: true, y: 420 }}
        sticky
        style={{ borderRadius: 8, overflow: "hidden" }}
        onRow={(record) => ({
          onClick: () => handleRowClick(record),
        })}
      />
      <Modal
        open={logModalVisible}
        // ❌ BLOCK close unless progress === 100
        onCancel={() => {
          if (progress === 100) {
            setLogModalVisible(false);
          }
        }}
        // ❌ disable outside click
        maskClosable={progress === 100}
        // ❌ disable ESC key
        keyboard={progress === 100}
        // ❌ hide X button while processing
        closable={progress === 100}
        width={650}
        centered
        footer={null}
        styles={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(8px)",
          borderRadius: 16,
          padding: "28px 36px",
        }}
        style={{
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 10px 35px rgba(123,47,247,0.3)",
        }}
        title={
          <div
            style={{
              background: "#001529",
              padding: "22px 0",
              margin: "-28px -36px 24px -36px",
              textAlign: "center",
              color: "white",
              fontWeight: 700,
              fontSize: 20,
              letterSpacing: 0.4,
              boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            }}
          >
            Sending Emails / Generating Images
          </div>
        }
      >
        {progress === 100 ? (
          <>
            <>
              {/* 🎉 COMPLETION HEADER */}
              <div style={{ textAlign: "center", marginBottom: 25 }}>
                <CheckCircleTwoTone
                  twoToneColor="#52c41a"
                  style={{ fontSize: 56 }}
                />
                <h2 style={{ marginTop: 12, fontWeight: 700 }}>
                  Process Completed Successfully
                </h2>
                <p style={{ color: "#444", marginTop: 6 }}>
                  All emails sent, images generated, and log records finalized.
                </p>
              </div>

              {/* 📊 FINAL SUMMARY CARDS */}
              <Row gutter={[16, 16]} style={{ marginBottom: 25 }}>
                <Col xs={24} sm={12} md={8}>
                  <Card>
                    <Statistic
                      title="Total Success"
                      value={successCount || 0}
                      valueStyle={{ color: "#52c41a", fontWeight: 700 }}
                      prefix={<CheckCircleOutlined />}
                    />
                  </Card>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <Card>
                    <Statistic
                      title="Images Created"
                      value={imageCount || 0}
                      valueStyle={{ color: "#faad14", fontWeight: 700 }}
                      prefix={<PictureOutlined />}
                    />
                  </Card>
                </Col>

                <Col xs={24} sm={12} md={8}>
                  <Card>
                    <Statistic
                      title="Failed"
                      value={failCount || 0}
                      valueStyle={{ color: "#ff4d4f", fontWeight: 700 }}
                      prefix={<CloseCircleOutlined />}
                    />
                  </Card>
                </Col>
              </Row>

              {/* ✔ CLOSE BUTTON */}
              <div style={{ textAlign: "center", marginTop: 25 }}>
                <Button
                  type="primary"
                  size="large"
                  onClick={() => setLogModalVisible(false)}
                  style={{
                    padding: "8px 26px",
                    fontWeight: 600,
                    borderRadius: 8,
                  }}
                >
                  Close Summary
                </Button>
              </div>
            </>
          </>
        ) : (
          <>
            {/* 🔵 Gradient Progress Bar */}
            <Progress
              percent={progress}
              strokeWidth={10}
              strokeColor={{ "0%": "#7b2ff7", "100%": "#f107a3" }}
              trailColor="#f0f0f0"
              status="active"
              style={{
                marginBottom: 28,
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
              }}
            />
            <Row gutter={[16, 16]} style={{ marginBottom: 25 }}>
              {/* Platinum Tier */}
              <Col xs={24} sm={12} md={8}>
                <Card>
                  <Statistic
                    title="Success"
                    value={successCount || 0}
                    valueStyle={{ color: "#00bd00ff", fontWeight: 700 }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Card>
              </Col>

              <Col xs={24} sm={12} md={8}>
                <Card>
                  <Statistic
                    title="Images Saved"
                    value={imageCount || 0}
                    prefix={<PictureOutlined />}
                    valueStyle={{ color: "#facc15", fontWeight: 700 }}
                  />
                </Card>
              </Col>

              {/* Silver Tier */}
              <Col xs={24} sm={12} md={8}>
                <Card>
                  <Statistic
                    title="Failed"
                    prefix={<CloseCircleOutlined />}
                    value={failCount || 0}
                    valueStyle={{ color: "#c90000ff", fontWeight: 700 }}
                  />
                </Card>
              </Col>
            </Row>
            {/* 📋 Email + Image Log List */}
            <List
              size="small"
              bordered
              dataSource={[...logList].reverse()} // 👈 newest first
              renderItem={(item) => (
                <List.Item
                  style={{
                    padding: "10px 16px",
                    margin: "6px 0",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.04)",
                    background:
                      item.status === "sending"
                        ? "linear-gradient(90deg,rgba(123,47,247,0.05),rgba(255,255,255,0.8))"
                        : item.status === "image"
                          ? "linear-gradient(90deg,rgba(250,173,20,0.12),rgba(255,255,255,0.9))"
                          : item.status === "failed"
                            ? "linear-gradient(90deg,rgba(255,77,79,0.08),rgba(255,255,255,0.9))"
                            : "rgba(255,255,255,0.95)",
                    transition: "background 0.3s ease",
                  }}
                  actions={
                    item.status === "failed"
                      ? [
                          <Tooltip title="Retry this email" key="retry">
                            <Button
                              type="link"
                              icon={<RedoOutlined />}
                              onClick={() => retrySingleEmail(item.email)}
                              style={{ color: "#722ed1" }}
                            />
                          </Tooltip>,
                        ]
                      : item.status === "image" && item.imagePath
                        ? [
                            <a
                              href={`file://${item.imagePath}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "#faad14", fontWeight: 500 }}
                            >
                              Open Image
                            </a>,
                          ]
                        : []
                  }
                >
                  <Space>
                    {item.status === "sending" && (
                      <ClockCircleTwoTone twoToneColor="#faad14" />
                    )}
                    {item.status === "success" && (
                      <CheckCircleTwoTone twoToneColor="#52c41a" />
                    )}
                    {item.status === "failed" && (
                      <CloseCircleTwoTone twoToneColor="#ff4d4f" />
                    )}
                    {item.status === "image" && (
                      <PictureOutlined
                        style={{ color: "#faad14", fontSize: 18 }}
                      />
                    )}
                    <Text strong style={{ color: "#111" }}>
                      {item.name}
                    </Text>
                    <Text type="secondary">
                      {item.email || "📸 Image Saved (No Email)"}
                    </Text>
                  </Space>
                </List.Item>
              )}
              style={{
                maxHeight: 320,
                overflowY: "auto",
                borderRadius: 8,
                borderColor: "rgba(0,0,0,0.06)",
                background: "rgba(255,255,255,0.6)",
              }}
            />

            {/* 🕹️ Controls (Pause / Resume / Stop) */}
            <Divider style={{ margin: "24px 0 10px 0" }} />
            <div
              style={{
                textAlign: "center",
                display: "flex",
                justifyContent: "center",
                gap: 16,
                flexWrap: "wrap",
                marginTop: 10,
              }}
            >
              {pausedRef.current ? (
                <Button
                  icon={<PlayCircleOutlined />}
                  onClick={handleResume}
                  size="large"
                  style={{
                    background: "linear-gradient(90deg,#52c41a,#8bc34a)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    minWidth: 120,
                  }}
                >
                  Resume
                </Button>
              ) : (
                <Button
                  icon={<PauseCircleOutlined />}
                  onClick={handlePause}
                  size="large"
                  style={{
                    background: "linear-gradient(90deg,#faad14,#fadb14)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    minWidth: 120,
                  }}
                >
                  Pause
                </Button>
              )}
              <Button
                icon={<StopOutlined />}
                danger
                size="large"
                onClick={handleStop}
                style={{
                  background: "linear-gradient(90deg,#ff4d4f,#cf1322)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  minWidth: 140,
                }}
              >
                Stop & Close
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* 🧾 Customer Details Modal – WinWay Premium Design */}
      <Modal
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        width={1000}
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
          <Space
            key="footer"
            style={{ justifyContent: "center", width: "100%" }}
          >
            <Button
              key="toggle"
              type="default"
              icon={
                chartType === "pie" ? (
                  <BarChartOutlined />
                ) : (
                  <PieChartOutlined />
                )
              }
              onClick={() => setChartType(chartType === "pie" ? "bar" : "pie")}
              size="large"
              style={{
                borderRadius: 8,
                fontWeight: 600,
              }}
            >
              {chartType === "pie" ? "Bar View" : "Pie View"}
            </Button>
            <Button
              key="send"
              type="primary"
              icon={<MailOutlined />}
              loading={sendingMailSingle}
              onClick={handleSendEmail}
              size="large"
              style={{
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
              }}
            >
              Send Email to Customer
            </Button>
            <Button
              key="close"
              danger
              onClick={() => setIsModalVisible(false)}
              size="large"
              style={{
                borderRadius: 8,
                fontWeight: 500,
                borderColor: "#d9d9d9",
              }}
            >
              Close
            </Button>
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
            }}
          >
            {selectedCustomer?.name}'s Lottery Overview
          </div>
        }
      >
        {selectedCustomer && (
          <>
            {/* 🪪 Customer Info Cards */}
            <Row
              gutter={[16, 16]}
              justify="center"
              style={{ marginBottom: 25 }}
            >
              {/* ✉️ Email */}
              <Col xs={24} sm={12} md={10}>
                <Card
                  bordered={false}
                  size="small"
                  hoverable
                  style={{
                    borderRadius: 14,
                    background: "linear-gradient(145deg,#ffffff,#f8f4ff)",
                    boxShadow: "0 3px 10px rgba(123,47,247,0.12)",
                    transition: "all 0.3s ease",
                  }}
                >
                  <Statistic
                    title={
                      <span>
                        <MailOutlined
                          style={{ color: "#7b2ff7", marginRight: 8 }}
                        />
                        Email
                      </span>
                    }
                    value={selectedCustomer.email || "N/A"}
                    valueStyle={{ color: "#000000ff", fontSize: 16 }}
                  />
                </Card>
              </Col>

              {/* 📞 Mobile */}
              <Col xs={24} sm={12} md={5}>
                <Card
                  bordered={false}
                  size="small"
                  hoverable
                  style={{
                    borderRadius: 14,
                    background: "linear-gradient(145deg,#ffffff,#f8f4ff)",
                    boxShadow: "0 3px 10px rgba(123,47,247,0.12)",
                    transition: "all 0.3s ease",
                  }}
                >
                  <Statistic
                    title={
                      <span>
                        <PhoneOutlined
                          style={{ color: "#52c41a", marginRight: 8 }}
                        />
                        Mobile
                      </span>
                    }
                    value={selectedCustomer.mobile || "N/A"}
                    valueStyle={{ color: "#000000ff", fontSize: 16 }}
                  />
                </Card>
              </Col>

              {/* 🎟️ Tickets */}
              <Col xs={24} sm={12} md={4}>
                <Card
                  bordered={false}
                  size="small"
                  hoverable
                  style={{
                    borderRadius: 14,
                    background: "linear-gradient(145deg,#ffffff,#f8f4ff)",
                    boxShadow: "0 3px 10px rgba(123,47,247,0.12)",
                    transition: "all 0.3s ease",
                  }}
                >
                  <Statistic
                    title={
                      <span>
                        <CrownOutlined
                          style={{ color: "#facc15", marginRight: 8 }}
                        />
                        Tickets
                      </span>
                    }
                    value={selectedCustomer.tickets || 0}
                    valueStyle={{ color: "#000000ff", fontSize: 18 }}
                  />
                </Card>
              </Col>

              {/* 🏆 Winnings */}
              <Col xs={24} sm={12} md={5}>
                <Card
                  bordered={false}
                  size="small"
                  hoverable
                  style={{
                    borderRadius: 14,
                    background: "linear-gradient(145deg,#ffffff,#f8f4ff)",
                    boxShadow: "0 3px 10px rgba(123,47,247,0.12)",
                    transition: "all 0.3s ease",
                  }}
                >
                  <Statistic
                    title={
                      <span>
                        <TrophyOutlined
                          style={{ color: "#ff4d4f", marginRight: 8 }}
                        />
                        Winnings
                      </span>
                    }
                    value={`Rs. ${
                      selectedCustomer.winnings?.toLocaleString() || 0
                    }`}
                    valueStyle={{ color: "#000000ff", fontSize: 18 }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 📊 Chart + Table Layout */}
            <Row gutter={[24, 24]} align="top">
              {/* Left – Chart */}
              <Col xs={24} md={12}>
                <Card
                  bordered={false}
                  style={{
                    height: 380,
                    borderRadius: 14,
                    background: "linear-gradient(145deg,#ffffff,#faf5ff)",
                    boxShadow: "0 3px 12px rgba(123,47,247,0.1)",
                    padding: 16,
                  }}
                  title={
                    <div
                      style={{
                        textAlign: "center",
                        color: "#722ed1",
                        fontWeight: 600,
                      }}
                    >
                      {chartType === "pie"
                        ? "Ticket Distribution"
                        : "Ticket Summary"}
                    </div>
                  }
                >
                  <ResponsiveContainer width="100%" height={270}>
                    {chartType === "pie" ? (
                      <PieChart>
                        <Pie
                          data={selectedCustomer.details || []}
                          dataKey="Count"
                          nameKey="Lottery_Type"
                          outerRadius={100}
                        >
                          {(selectedCustomer.details || []).map((entry, i) => (
                            <Cell
                              key={i}
                              fill={COLORS[i % COLORS.length]}
                              stroke="#fff"
                              strokeWidth={2}
                            />
                          ))}
                        </Pie>
                        <ChartTooltip
                          contentStyle={{
                            borderRadius: 8,
                            borderColor: "#722ed1",
                            background: "#faf5ff",
                          }}
                        />
                      </PieChart>
                    ) : (
                      <BarChart data={selectedCustomer.details || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="Lottery_Type" tick={{ fill: "#555" }} />
                        <YAxis tick={{ fill: "#555" }} />
                        <ChartTooltip
                          contentStyle={{
                            borderRadius: 8,
                            borderColor: "#722ed1",
                            background: "#faf5ff",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="Count"
                          fill="#722ed1"
                          radius={[8, 8, 0, 0]}
                          barSize={40}
                        />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </Card>
              </Col>

              {/* Right – Table */}
              <Col xs={24} md={12}>
                <Card
                  bordered={false}
                  style={{
                    height: 380,
                    borderRadius: 14,
                    background: "linear-gradient(145deg,#ffffff,#faf5ff)",
                    boxShadow: "0 3px 12px rgba(0,0,0,0.05)",
                    overflowY: "auto",
                  }}
                  title={
                    <div
                      style={{
                        textAlign: "center",
                        color: "#722ed1",
                        fontWeight: 600,
                      }}
                    >
                      Lottery Breakdown
                    </div>
                  }
                >
                  <Table
                    columns={[
                      { title: "🎟️ Lottery Type", dataIndex: "Lottery_Type" },
                      { title: "Count", dataIndex: "Count", align: "center" },
                    ]}
                    dataSource={selectedCustomer.details}
                    pagination={false}
                    size="small"
                    bordered
                    rowKey={(r) => r.Lottery_Type}
                    scroll={{ y: 220 }}
                  />
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Modal>
    </div>
  );
}

export default ResultsView;
