import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  Form,
  Upload,
  Button,
  Card,
  Typography,
  message,
  Spin,
  Divider,
  Progress,
  Alert,
  Row,
  Col,
  Statistic,
  Table,
  Input,
  Tag,
  Result,
  Modal,
  DatePicker,
} from "antd";
import { ENV } from "../config/env";
import {
  LoadingOutlined,
  FileZipOutlined,
  FileTextOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  GiftOutlined,
  TeamOutlined,
  CrownOutlined,
  TrophyOutlined,
  RiseOutlined,
  DownloadOutlined,
  SaveFilled,
} from "@ant-design/icons";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import CustomerModel from "../componets/CustomerModel";
import dayjs from "dayjs";
import { getSettings } from "../api/endPoints";

const { Title, Text } = Typography;
const { Dragger } = Upload;

const API_BASE = ENV.REACT_APP_API_BASE_PY;
const API_BASE_Local = ENV.API_BASE_LOCAL;

function Loyality() {
  // ---------------- STATE ----------------
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [files, setFiles] = useState({});
  const [searchText, setSearchText] = useState("");
  const [pagination, setPagination] = useState({ current: 1, pageSize: 5 });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [saveSummary, setSaveSummary] = useState(null);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [settings, setSettings] = useState();

  // 🗓️ Default Date Helpers
  const getDefaultStartDate = () => "2025-07-01";

  const getYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0]; // YYYY-MM-DD
  };
const getYesterday2 = () => {
  const d = new Date("2025-11-30");
  return d.toISOString().split("T")[0];
};

  // ⏱️ States (now with visible defaults)
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getYesterday2());

  // 🧭 Validation
  useEffect(() => {
    if (!startDate || !endDate) return;

    const s = new Date(startDate);
    const e = new Date(endDate);
    const today = new Date();

    if (s > e) {
      message.warning(
        "⚠️ Start date cannot be after end date. Resetting to defaults."
      );
      setStartDate(getDefaultStartDate());
      setEndDate(getYesterday());
      return;
    }

    if (e > today) {
      message.warning(
        "⚠️ End date cannot be in the future. Resetting to yesterday."
      );
      setEndDate(getYesterday());
      return;
    }

    const minDate = new Date("2025-07-01");
    if (s < minDate) {
      message.warning("⚠️ Start date cannot be before July 2025.");
      setStartDate(getDefaultStartDate());
    }
  }, [startDate, endDate]);

  const numberRender = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString() : v ?? "-";
  };

  const handleSaveLoyalty = async () => {
    if (!results || results.length === 0) {
      message.warning("No processed data available to save!");
      return;
    }

    try {
      setLoading(true);

      // 🔽 Sort customers by Ticket_Count (highest first)
      const sortedResults = [...results].sort(
        (a, b) => (b.Ticket_Count || 0) - (a.Ticket_Count || 0)
      );

      const res = await axios.post(`${API_BASE_Local}/api/loyalCustomer`, {
        customers: sortedResults,
        Last_Update: "Entry",
        current_count: 200,
      });

      if (res.data.success) {
        message.success("✅ Loyalty data saved successfully!");
        setSaveSummary({
          total: sortedResults.length,
          inserted: res.data.inserted,
          message: res.data.message,
        });
        setSaveModalVisible(true);
      } else {
        message.warning(
          res.data.message || "Some entries may have been skipped."
        );
      }
    } catch (err) {
      console.error(err);
      message.error("❌ Failed to save loyalty data!");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = useCallback((file, name) => {
    setFiles((prev) => ({ ...prev, [name]: file }));
    return false;
  }, []);

  const handleRemove = useCallback((name) => {
    setFiles((prev) => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });
  }, []);

  const handleReset = useCallback(() => {
    setStep(1);
    setFiles({});
    setResults([]);
    setSummary(null);
    setError(null);
    setStartDate(getDefaultStartDate());
    setEndDate(getYesterday());
    message.info("Form reset successfully");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const ticketColumns = [
    {
      title: "Customer",
      dataIndex: "FirstName",
      sorter: (a, b) =>
        (a.FirstName + " " + a.LastName).localeCompare(
          b.FirstName + " " + b.LastName
        ),
      render: (_, record) => `${record.FirstName} ${record.LastName}`,
    },
    {
      title: "Mobile",
      dataIndex: "MobileNumber",
      sorter: (a, b) => a.MobileNumber.localeCompare(b.MobileNumber),
    },
    {
      title: "Total Tickets",
      dataIndex: "Ticket_Count",
      align: "center",
      sorter: (a, b) => Number(a.Ticket_Count) - Number(b.Ticket_Count),
      render: numberRender,
    },
    {
      title: "Tier",
      dataIndex: "Loyalty_Tier",
      align: "center",
      filters: [
        { text: "Platinum", value: "Platinum" },
        { text: "Gold", value: "Gold" },
        { text: "Silver", value: "Silver" },
        { text: "Blue", value: "Blue" },
        { text: "None", value: "None" },
      ],
      onFilter: (value, record) => record.Tier === value,
      sorter: (a, b) => a.Loyalty_Tier.localeCompare(b.Loyalty_Tier),
      render: (tier) => {
        const colorMap = {
          Platinum: "geekblue",
          Gold: "gold",
          Silver: "gray",
          Blue: "blue",
          None: "default",
        };
        return (
          <Tag color={colorMap[tier] || "default"} style={{ fontWeight: 600 }}>
            {tier || "None"}
          </Tag>
        );
      },
    },
  ];

  // ================================
  // FIXED IGNORE NUMBERS
  // ================================

  const FIXED_IGNORE_NUMBERS = [
    "+94779488015",
    "+94777166110",
    "+94762988252",
    "94761772150",
    "94743052195",
    "94741702708",
    "94777359122",
    "94719022755",
    "94714806478",
    "94718508760",
    "94704069799",
    "94714805620",
    "94776941961",
    "94773274374",
    "94719671141",
    "94714115577",
    "94766600000",
    "94766749170",
    "94778188285",
    "94768097771",
    "94771863400",
    "94775107956",
    "94774239140",
    "94765679234",
    "94777420191",
    "94715897486",
    "94718237303",
    "94703516691",
    "94703017115",
    "94704642223",
    "94761958698",
    "94712115810",
    "94788001122",
    "94718419441",
    "94776993482",
    "94770881447",
    "94778191900",
    "94711805031",
    "94775412556",
    "94773106900",
    "94715205411",
    "94777255168",
    "94773184590",
    "94771982332",
    "94772047456",
    "94706600618",
    "94772597337",
    "94773671767",
    "94776325756",
    "94761848361",
    "94771245316",
    "94777338848",
    "94742502620",
    "94777560966",
    "94707913428",
    "94782503080",
    "94711350177",
    "94743464854",
    "94763248678",
    "94702347680",
    "94713357163",
    "94776018790",
    "94716607483",
    "94714310100",
    "94765918418",
    "94713159779",
    "94772939969",
    "94772653918",
    "94775250457",
    "94714320916",
    "94773956945",
    "94775787674",
    "94712299748",
    "94773380785",
    "94715181815",
    "94778421527",
    "94771905392",
    "94713233788",
    "94774998535",
  ];

  // ================================
  // SIMPLE NORMALIZER
  // ================================
  const normalize = (num = "") =>
    num.startsWith("+") ? num.substring(1) : num;

  const handleSubmit = async () => {
    if (!files.zip_file || !files.customers_file) {
      message.warning("⚠️ Please upload both ZIP and Customer CSV files!");
      return;
    }

    if (!startDate || !endDate) {
      message.warning("⚠️ Please select both start and end dates!");
      return;
    }

    const formData = new FormData();

    const settingsArray = await getSettings();
    const map = Object.fromEntries(
      settingsArray.data.data.map((s) => [s.key, s.value])
    );

    formData.append(
      "platinum",
      parseInt(map.LOYALTY_ENTRY_PLATINUM_TICKETS, 10)
    );
    formData.append("gold", parseInt(map.LOYALTY_ENTRY_GOLD_TICKETS, 10));
    formData.append("silver", parseInt(map.LOYALTY_ENTRY_SILVER_TICKETS, 10));
    formData.append(
      "minVal",
      parseInt(map.LOYALTY_ENTRY_MIN_CHECK_TICKETS, 10)
    );

    setSettings(map);

    // 🔹 Dates
    formData.append("start_date", startDate);
    formData.append("end_date", endDate);

    // 🔹 Files
    Object.entries(files).forEach(([key, file]) => {
      if (file) formData.append(key, file);
    });

    // 🔥 SEND FIXED IGNORE NUMBERS TO BACKEND
    FIXED_IGNORE_NUMBERS.forEach((num) => {
      formData.append("ignore_numbers", num);
    });

    try {
      setLoading(true);
      setProgress(0);

      const res = await axios.post(
        `${API_BASE}/api/customer-tickets/`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            if (e.total) {
              setProgress(Math.round((100 * e.loaded) / e.total));
            }
          },
        }
      );

      const data = res.data;

      if (!data || !data.customers) {
        message.warning("No valid ticket data found!");
        return;
      }

      const totalTicketsSum = data.customers.reduce(
        (acc, curr) => acc + Number(curr.Ticket_Count || 0),
        0
      );

      // ✅ BACKEND ALREADY FILTERED
      setResults(data.customers);

      setSummary({
        ...data.summary,
        tiers: data.tiers,
        zip_folders: data.zip_folders,
        ignored_numbers: data.ignored_numbers,
        totalTicketsSum,
      });

      setStep(2);
      message.success("✅ Ticket report generated successfully!");
    } catch (err) {
      console.error(err);
      setError("❌ Error processing ticket data!");
      message.error("Error generating report!");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadData = () => {
    if (!results || results.length === 0) {
      message.warning("No data available to download!");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(results);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Loyalty Summary");
    const excelBuffer = XLSX.write(wb, { bookType: "csv", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const fileName = `WinWay_Loyalty_Report_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    saveAs(blob, fileName);
    message.success("✅ Loyalty report downloaded!");
  };

  const filteredResults = useMemo(() => {
    if (!searchText) return results;
    const text = searchText.toLowerCase();
    return results.filter(
      (r) =>
        (r.Customer_Name && r.Customer_Name.toLowerCase().includes(text)) ||
        (r.MobileNumber && r.MobileNumber.toLowerCase().includes(text))
    );
  }, [searchText, results]);

  const renderUpload = useCallback(
    (label, name, accept, icon, successMsg) => {
      const hasFile = !!files[name];
      return (
        <Card
          size="small"
          style={{
            marginBottom: 16,
            borderRadius: 10,
            borderColor: hasFile ? "#b7eb8f" : "#d9d9d9",
            boxShadow: hasFile ? "0 0 10px rgba(82,196,26,0.2)" : "none",
          }}
          styles={{ padding: 8 }}
        >
          <Form.Item
            label={<Text strong>{label}</Text>}
            style={{ marginBottom: 8 }}
          >
            <Dragger
              beforeUpload={(file) => handleChange(file, name)}
              fileList={hasFile ? [files[name]] : []}
              onRemove={() => handleRemove(name)}
              accept={accept}
              maxCount={1}
              style={{
                background: hasFile ? "#f6ffed" : "#fafafa",
                borderColor: hasFile ? "#b7eb8f" : "#d9d9d9",
                borderRadius: 10,
                padding: "12px",
                minHeight: "110px",
              }}
            >
              <p className="ant-upload-drag-icon" style={{ fontSize: 28 }}>
                {icon}
              </p>
              {hasFile ? (
                <p style={{ color: "#52c41a", fontWeight: 500 }}>
                  {successMsg}
                </p>
              ) : (
                <>
                  <p>Click or drag file to this area</p>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Accepts {accept}
                  </Text>
                </>
              )}
            </Dragger>
          </Form.Item>
        </Card>
      );
    },
    [files, handleChange, handleRemove]
  );

  return (
    <>
      {/* STEP 1 */}
      {step === 1 && (
        <div style={{ position: "relative" }}>
          <Spin
            spinning={loading}
            indicator={<LoadingOutlined spin />}
            tip="Processing..."
          >
            <Title level={3} style={{ textAlign: "left" }}>
              Upload ZIP and Customer Files Up To Date - First Time Only
            </Title>
            <Divider />
            <Row gutter={[24, 24]} justify="center">
              <Col xs={24} lg={20}>
                <Form layout="vertical">
                  <Row gutter={[12, 12]} justify="center">
                    <Col xs={24} sm={12} md={8}>
                      {renderUpload(
                        "Tickets ZIP (.zip)",
                        "zip_file",
                        ".zip",
                        <FileZipOutlined style={{ color: "#1890ff" }} />,
                        "Tickets ZIP attached"
                      )}
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      {renderUpload(
                        "Customers CSV (.csv)",
                        "customers_file",
                        ".csv",
                        <FileTextOutlined style={{ color: "#fa8c16" }} />,
                        "Customers file attached"
                      )}
                    </Col>
                  </Row>

                  {/* 🟩 Date pickers row */}
                  <Row
                    gutter={[12, 12]}
                    justify="center"
                    style={{ marginTop: 10 }}
                  >
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item
                        label={<Text strong>Start Date</Text>}
                        required
                      >
                        <DatePicker
                          style={{ width: "100%" }}
                          format="YYYY-MM-DD"
                          value={startDate ? dayjs(startDate) : null}
                          onChange={(date, dateString) =>
                            setStartDate(dateString)
                          }
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      <Form.Item label={<Text strong>End Date</Text>} required>
                        <DatePicker
                          style={{ width: "100%" }}
                          format="YYYY-MM-DD"
                          value={endDate ? dayjs(endDate) : null}
                          onChange={(date, dateString) =>
                            setEndDate(dateString)
                          }
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  {error && (
                    <Alert
                      type="error"
                      message={error}
                      showIcon
                      style={{ marginTop: 15 }}
                    />
                  )}

                  {progress > 0 && (
                    <Progress
                      percent={progress}
                      status={loading ? "active" : "normal"}
                      style={{ marginTop: 20 }}
                    />
                  )}

                  <div style={{ textAlign: "center", marginTop: 30 }}>
                    <Button
                      type="primary"
                      size="large"
                      icon={<ArrowRightOutlined />}
                      onClick={handleSubmit}
                      disabled={loading}
                      style={{ marginRight: 10 }}
                    >
                      {loading ? "Processing..." : "Proceed to Process"}
                    </Button>
                    <Button
                      icon={<ReloadOutlined />}
                      danger
                      type="primary"
                      size="large"
                      onClick={handleReset}
                    >
                      Reset
                    </Button>
                  </div>
                </Form>
              </Col>
            </Row>
          </Spin>
        </div>
      )}
      {/* STEP 2 */}
      {step === 2 && (
        <div style={{ position: "relative" }}>
          <Spin
            spinning={loading}
            tip="Loading summary..."
            indicator={<LoadingOutlined spin />}
          >
            {summary?.missing_folders_count > 0 ? (
              <>
                <Row
                  justify="center"
                  style={{ marginBottom: 20, marginTop: 10 }}
                >
                  <div
                    style={{
                      padding: "18px 22px",
                      background: "linear-gradient(180deg, #ffebee, #ffffff)",
                      border: "1px solid #ffcdd2",
                      borderRadius: 12,
                      boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
                      animation: "fadeIn 0.3s ease-out",
                      maxWidth: "700px",
                    }}
                  >
                    {/* Title */}
                    <Text
                      strong
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: "#c62828",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 12,
                      }}
                    >
                      ⚠ Missing Folders Detected!{" "}
                      <span style={{ color: "#b71c1c" }}>
                        ({summary.missing_folders_count})
                      </span>
                    </Text>

                    {/* Animated badge list */}
                    <div style={{ animation: "slideIn 0.7s ease-out" }}>
                      <div
                        style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
                      >
                        {summary?.missing_folders?.map((folder, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: "#ffebee",
                              padding: "6px 12px",
                              borderRadius: 8,
                              border: "1px solid #ffcdd2",
                              fontSize: 14,
                              color: "#b71c1c",
                              fontWeight: 500,
                              animation: "fadeBadge 0.4s ease-out",
                            }}
                          >
                            {folder}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Cannot display message */}
                    <div
                      style={{
                        marginTop: 25,
                        textAlign: "center",
                        fontSize: 17,
                        fontWeight: 600,
                        color: "#c62828",
                      }}
                    >
                      Data cannot be displayed until all folders are available.
                    </div>

                    {/* Animations */}
                    <style>
                      {`
                @keyframes slideIn {
                  from { opacity: 0; transform: translateY(-10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeBadge {
                  from { opacity: 0; transform: scale(0.9); }
                  to { opacity: 1; transform: scale(1); }
                }
              `}
                    </style>
                  </div>
                </Row>

                {/* ========= BUTTONS (Visible even when missing folders) ========= */}
                <div style={{ textAlign: "center", marginTop: 30 }}>
                  <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => setStep(1)}
                  >
                    Back To Uploads
                  </Button>

                  <Button
                    icon={<DownloadOutlined />}
                    type="primary"
                    style={{ marginLeft: 10 }}
                    onClick={handleDownloadData}
                  >
                    Download Missing Info
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* =========================================================
      CASE 2: NORMAL → SHOW REAL DATA + UI
  ========================================================== */}
                <Row
                  justify="space-between"
                  align="middle"
                  style={{ marginBottom: 20 }}
                >
                  <Title level={3} style={{ marginBottom: 0 }}>
                    Ticket Summary Results - Only First Time
                  </Title>

                  {summary?.date_range && (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "12px 22px",
                        background: "linear-gradient(90deg, #e0f7fa, #ffffff)",
                        border: "1px solid #b2ebf2",
                        borderRadius: 10,
                        boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
                        marginTop: 10,
                      }}
                    >
                      <Text strong style={{ fontSize: 16, fontWeight: 600 }}>
                        <span style={{ color: "#0277bd" }}>
                          {" "}
                          Period:&nbsp; {summary.date_range}
                        </span>
                      </Text>
                    </div>
                  )}
                </Row>
                <Divider />
                {/* ======================= SUMMARY CARDS ======================= */}
                <Row gutter={[16, 16]} style={{ marginBottom: 10 }}>
                  <Col xs={24} sm={6} md={6}>
                    <Card
                      style={{
                        borderRadius: 12,
                        background: "linear-gradient(145deg, #e3f2fd, #ffffff)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                    >
                      <Statistic
                        title={
                          <span style={{ fontSize: 14, color: "#1976d2" }}>
                            Total Customers
                          </span>
                        }
                        value={summary.total_customers}
                        valueStyle={{ fontWeight: 700, color: "#0d47a1" }}
                        prefix={<TeamOutlined style={{ color: "#1976d2" }} />}
                      />
                    </Card>
                  </Col>

                  <Col xs={24} sm={6} md={6}>
                    <Card
                      style={{
                        borderRadius: 12,
                        background: "linear-gradient(145deg, #f3e5f5, #ffffff)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                    >
                      <Statistic
                        title={
                          <span style={{ fontSize: 14, color: "#8e24aa" }}>
                            Loyal Customers
                          </span>
                        }
                        value={summary.loyal_customers}
                        valueStyle={{ fontWeight: 700, color: "#6a1b9a" }}
                        prefix={<TeamOutlined style={{ color: "#8e24aa" }} />}
                      />
                    </Card>
                  </Col>

                  <Col xs={24} sm={6} md={6}>
                    <Card
                      style={{
                        borderRadius: 12,
                        background: "linear-gradient(145deg, #fff8e1, #ffffff)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                    >
                      <Statistic
                        title={
                          <span style={{ fontSize: 14, color: "#f57f17" }}>
                            Total Tickets
                          </span>
                        }
                        value={summary.total_tickets}
                        valueStyle={{ fontWeight: 700, color: "#f57f17" }}
                        prefix={<CrownOutlined style={{ color: "#fbc02d" }} />}
                      />
                    </Card>
                  </Col>

                  <Col xs={24} sm={6} md={6}>
                    <Card
                      style={{
                        borderRadius: 12,
                        background: "linear-gradient(145deg, #e8f5e9, #ffffff)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                    >
                      <Statistic
                        title={
                          <span style={{ fontSize: 14, color: "#2e7d32" }}>
                            Loyal Customer’s Tickets
                          </span>
                        }
                        value={summary.totalTicketsSum}
                        valueStyle={{ fontWeight: 700, color: "#1b5e20" }}
                        prefix={<TeamOutlined style={{ color: "#43a047" }} />}
                      />
                    </Card>
                  </Col>
                </Row>

                <Divider />

                {/* ======================= TIER CARDS ======================= */}
                <Row gutter={[16, 16]} style={{ marginBottom: 25 }}>
                  <Col xs={24} sm={12} md={8}>
                    <Card
                      style={{
                        borderRadius: 12,
                        background: "linear-gradient(145deg, #ede7f6, #ffffff)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                    >
                      <Statistic
                        title={
                          <div style={{ lineHeight: "1.2" }}>
                            <span
                              style={{
                                fontSize: 14,
                                color: "#7b2ff7",
                                fontWeight: 600,
                              }}
                            >
                              Platinum Tier
                            </span>
                            <br />
                            <Text type="secondary" style={{ fontSize: 14 }}>
                              ≥ {settings.LOYALTY_ENTRY_PLATINUM_TICKETS}{" "}
                              Tickets
                            </Text>
                          </div>
                        }
                        value={summary?.tiers?.Platinum || 0}
                        valueStyle={{ color: "#7b2ff7", fontWeight: 700 }}
                        prefix={<TrophyOutlined style={{ color: "#7b2ff7" }} />}
                      />
                    </Card>
                  </Col>

                  <Col xs={24} sm={12} md={8}>
                    <Card
                      style={{
                        borderRadius: 12,
                        background: "linear-gradient(145deg, #fffde7, #ffffff)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                    >
                      <Statistic
                        title={
                          <div style={{ lineHeight: "1.2" }}>
                            <span
                              style={{
                                fontSize: 14,
                                color: "#facc15",
                                fontWeight: 600,
                              }}
                            >
                              Gold Tier
                            </span>
                            <br />
                            <Text type="secondary" style={{ fontSize: 14 }}>
                              ≥ {settings.LOYALTY_ENTRY_GOLD_TICKETS} Tickets
                            </Text>
                          </div>
                        }
                        value={summary?.tiers?.Gold || 0}
                        valueStyle={{ color: "#facc15", fontWeight: 700 }}
                        prefix={<GiftOutlined style={{ color: "#facc15" }} />}
                      />
                    </Card>
                  </Col>

                  <Col xs={24} sm={12} md={8}>
                    <Card
                      style={{
                        borderRadius: 12,
                        background: "linear-gradient(145deg, #f5f5f5, #ffffff)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                    >
                      <Statistic
                        title={
                          <div style={{ lineHeight: "1.2" }}>
                            <span
                              style={{
                                fontSize: 14,
                                color: "#9e9e9e",
                                fontWeight: 600,
                              }}
                            >
                              Silver Tier
                            </span>
                            <br />
                            <Text type="secondary" style={{ fontSize: 14 }}>
                              ≥ {settings.LOYALTY_ENTRY_SILVER_TICKETS} Tickets
                            </Text>
                          </div>
                        }
                        value={summary?.tiers?.Silver || 0}
                        valueStyle={{ color: "#9e9e9e", fontWeight: 700 }}
                        prefix={<RiseOutlined style={{ color: "#9e9e9e" }} />}
                      />
                    </Card>
                  </Col>
                </Row>

                <Divider />

                {/* ======================= SEARCH ======================= */}
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                  <Col xs={24} md={10}>
                    <Input.Search
                      placeholder="Search by name, email, or mobile"
                      allowClear
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                  </Col>
                </Row>

                {/* ======================= TABLE ======================= */}
                <CustomerModel
                  open={isModalVisible}
                  onClose={() => setIsModalVisible(false)}
                  customer={selectedCustomer}
                />

                <Table
                  dataSource={filteredResults}
                  columns={ticketColumns}
                  rowKey="MobileNumber"
                  bordered
                  size="middle"
                  scroll={{ x: true, y: 420 }}
                  sticky
                  pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    showSizeChanger: true,
                    pageSizeOptions: ["5", "10", "25", "50" ,"100"],
                    showTotal: (total, range) =>
                      `Showing ${range[0]}-${range[1]} of ${total} customers`,
                    onChange: (page, pageSize) =>
                      setPagination({ current: page, pageSize }),
                  }}
                  rowClassName={(record) => {
                    switch (record.Loyalty_Tier) {
                      case "Platinum":
                        return "tier-row-platinum";
                      case "Gold":
                        return "tier-row-gold";
                      case "Silver":
                        return "tier-row-silver";
                      case "Blue":
                        return "tier-row-blue";
                      default:
                        return "";
                    }
                  }}
                  style={{ borderRadius: 8, overflow: "hidden" }}
                />

                {/* ======================= BUTTONS ======================= */}
                <div style={{ textAlign: "center", marginTop: 25 }}>
                  <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => setStep(1)}
                  >
                    Back To Uploads
                  </Button>
                  <Button
                    icon={<SaveFilled />}
                    type="primary"
                    style={{ marginLeft: 10 }}
                    onClick={handleSaveLoyalty}
                  >
                    Save Loyalty Data
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    type="primary"
                    style={{ marginLeft: 10 }}
                    onClick={handleDownloadData}
                  >
                    Download Data
                  </Button>
                </div>

                {/* ======================= TABLE ROW STYLES ======================= */}
                <style>
                  {`
      .ant-table-tbody > tr.tier-row-platinum > td {
        background: linear-gradient(90deg, #f8f9fa, #e8f0ff) !important;
        border-bottom: 2px solid #c5cae9 !important;
      }
      .ant-table-tbody > tr.tier-row-gold > td {
        background: linear-gradient(90deg, #fff8e1, #ffecb3) !important;
        border-bottom: 2px solid #ffcc80 !important;
      }
      .ant-table-tbody > tr.tier-row-silver > td {
        background: linear-gradient(90deg, #f5f5f5, #e0e0e0) !important;
        border-bottom: 2px solid #bdbdbd !important;
      }
      .ant-table-tbody > tr.tier-row-blue > td {
        background: linear-gradient(90deg, #e3f2fd, #bbdefb) !important;
        border-bottom: 2px solid #90caf9 !important;
      }
    `}
                </style>
              </>
            )}
          </Spin>
        </div>
      )}

      {/* ✅ Save Summary Modal */}
      {saveModalVisible && (
        <Modal
          open={saveModalVisible}
          centered
          footer={[
            <Button
              key="ok"
              type="primary"
              onClick={() => setSaveModalVisible(false)}
            >
              OK
            </Button>,
          ]}
          onCancel={() => setSaveModalVisible(false)}
          width={500}
        >
          <Result
            status="success"
            title="Loyalty Data Saved Successfully!"
            subTitle={`Summary for this upload:`}
            extra={[
              <div key="details" style={{ textAlign: "left", marginTop: 10 }}>
                <p>
                  <strong>Total Processed:</strong> {saveSummary?.total || 0}
                </p>
                <p>
                  <strong>Inserted:</strong> {saveSummary?.inserted || 0}
                </p>
                <p>
                  <strong>Message:</strong> {saveSummary?.message || ""}
                </p>
              </div>,
            ]}
          />
        </Modal>
      )}
    </>
  );
}

export default Loyality;
