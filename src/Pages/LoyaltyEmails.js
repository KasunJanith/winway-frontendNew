import React, { useEffect, useRef, useState } from "react";
import {
  Table,
  Input,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Spin,
  Divider,
  message,
  Button,
  Typography,
  Space,
  Tooltip,
  Progress,
  List,
  Modal,
} from "antd";
import {
  TeamOutlined,
  CrownOutlined,
  TrophyOutlined,
  GiftOutlined,
  RiseOutlined,
  ReloadOutlined,
  DownloadOutlined,
  DeleteFilled,
  WarningOutlined,
  DragOutlined,
  UserOutlined,
  MailOutlined,
  StopOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ClockCircleTwoTone,
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  PictureOutlined,
  RedoOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import axios from "axios";
import CustomerModel from "../componets/CustomerModel";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import EmailModal from "../componets/EmailModel";
import headerLogo from "../assets/logo.png";
import footerLogo from "../assets/nlb_logo.png";
import { getCombinedCustomers, getSettings } from "../api/endPoints";
import { ENV } from "../config/env";

const { Search } = Input;
const { Title, Text } = Typography;



const API_BASE = ENV.REACT_APP_API_BASE_PY;
const API_BASE_LOCAL = ENV.API_BASE_LOCAL;

function LoyaltyEmails() {
  const [customers, setCustomers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [selectedTier, setSelectedTier] = useState("");

  const [summary, setSummary] = useState({});
  const [pagination, setPagination] = useState({ current: 1, pageSize: 5 });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [settings, setSettings] = useState({});
  const [sendingMailAll, setSendingMailAll] = useState(false);
  const [logList, setLogList] = useState([]);
  const [progress, setProgress] = useState(0);
  const [imageCounts, setImageCount] = useState(0);

  const [isLoading, setisLoading] = useState(false);
  // Pause/Stop controls (refs)
  const pausedRef = useRef(false);
  const stoppedRef = useRef(false);
  const [logModalVisible, setLogModalVisible] = useState(false);
  // 💎 Tier Colors & Icons
  const tierColors = {
    Platinum: "#9B5DE5", // Elegant purple tone (modern premium look)
    Gold: "#E6B800", // True metallic gold
    Silver: "#C0C0C0", // Standard silver shade
    Blue: "#2563EB", // Same strong WinWay blue
    Warning: "#FFA500", // Bright amber-orange for visibility
    Rejected: "#E63946", // Clear red for danger state
  };
  const tierColorsFade = {
    Platinum: "rgba(155, 93, 229, 0.2)", // Elegant purple tone (modern premium look)
    Gold: "rgba(230, 184, 0, 0.2)", // True metallic gold
    Silver: "rgba(192, 192, 192, 0.2)", // Standard silver shade
    Blue: "rgba(37, 99, 235, 0.2)", // Same strong WinWay blue
    Warning: "rgba(255, 165, 0, 0.2)", // Bright amber-orange for visibility
    Rejected: "rgba(230, 57, 70, 0.2)", // Clear red for danger state
  };

  const tierIcons = {
    Platinum: <TrophyOutlined />,
    Gold: <GiftOutlined />,
    Silver: <RiseOutlined />,
    Blue: <RiseOutlined />,
    Warning: <WarningOutlined />,
    Rejected: <DragOutlined />,
  };

  const sendLoyaltyEmail = async (customer, i, subject, body, title) => {
    try {
      const formData = new FormData();
      console.log(customer);

      formData.append(
        "to",
        // customer.CustomerInfo.Email
        //   ? "chamikadeshan97@gmail.com,isurudineshcm@gmail.com,ampdharmapriya@gmail.com"
        //   : ""

        customer.CustomerInfo.Email ? "chamikadeshan97@gmail.com" : ""
      );

      formData.append(
        "name",
        `${customer.CustomerInfo?.FirstName || ""} ${
          customer.CustomerInfo?.LastName || ""
        }`
      );
      formData.append("type", "loyalty_welcome");
      formData.append("number", i);

      formData.append("subject", subject);
      formData.append("body", body);
      formData.append("title", title);
      // NEW → send full object
      formData.append("customerData", JSON.stringify(customer));

      const res = await axios.post(
        `${API_BASE_LOCAL}/email/loyality/custome-email`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      message.success(`✅ Email sent`);
      return { status: "success" };
    } catch (error) {
      console.error("❌ Loyalty Email Error:", error);
      message.error(`❌ Failed to send email`);
      return { status: "failed" };
    }
  };
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const handleSendLoyaltyEmails = async ({ subject, body, title }) => {
    pausedRef.current = false;
    stoppedRef.current = false;
    const total = 3;
    let sentCount = 0;
    if (filtered.length == total) {
      setLogModalVisible(true);
      for (let i = 0; i < total; i++) {
        const customer = filtered[i];
        if (customer.CustomerInfo.Email) {
          if (stoppedRef.current) break;

          // Pause behaviour
          while (pausedRef.current && !stoppedRef.current) {
            await new Promise((r) => setTimeout(r, 400));
          }

          setLogList((prev) => [
            ...prev,
            {
              name: `${customer.CustomerInfo?.FirstName} ${customer.CustomerInfo?.LastName}`,
              email: customer.CustomerInfo?.Email,
              status: "sending",
            },
          ]);

          // Actual send

          const result = await sendLoyaltyEmail(
            customer,
            i,
            subject,
            body,
            title
          );
          sentCount++;
          setProgress(Math.round((sentCount / total) * 100));

          // Update log
          setLogList((prev) =>
            prev.map((l) =>
              l.email === customer.CustomerInfo?.Email
                ? { ...l, status: result.status }
                : l
            )
          );

          await new Promise((r) => setTimeout(r, 500)); // Rate limit
        } else {
          setImageCount((prev) => prev + 1);
        }
        setSendingMailAll(false);
      }
    } else if (total == 1) {
      for (let i = 0; i < total; i++) {
        const customer = filtered[2];

        if (stoppedRef.current) break;

        // Pause behaviour
        while (pausedRef.current && !stoppedRef.current) {
          await new Promise((r) => setTimeout(r, 400));
        }

        setLogList((prev) => [
          ...prev,
          {
            name: `${customer.CustomerInfo?.FirstName} ${customer.CustomerInfo?.LastName}`,
            email: customer.CustomerInfo?.Email,
            status: "sending",
          },
        ]);

        // Actual send
        const result = await sendLoyaltyEmail(
          customer,
          i,
          subject,
          body,
          title
        );
        sentCount++;
        setProgress(Math.round((sentCount / total) * 100));
        console.log(result);

        // Update log
        setLogList((prev) =>
          prev.map((l) =>
            l.email === customer.CustomerInfo?.Email
              ? { ...l, status: result.status }
              : l
          )
        );

        await new Promise((r) => setTimeout(r, 500)); // Rate limit
      }
      setSendingMailAll(false);
    } else {
      for (let i = 0; i < total; i++) {
        const customer = filtered[i];

        if (stoppedRef.current) break;

        // Pause behaviour
        while (pausedRef.current && !stoppedRef.current) {
          await new Promise((r) => setTimeout(r, 400));
        }

        setLogList((prev) => [
          ...prev,
          {
            name: `${customer.CustomerInfo?.FirstName} ${customer.CustomerInfo?.LastName}`,
            email: customer.CustomerInfo?.Email,
            status: "sending",
          },
        ]);

        // Actual send
        const result = await sendLoyaltyEmail(customer, i, subject);
        sentCount++;
        setProgress(Math.round((sentCount / total) * 100));
        console.log(result);

        // Update log
        setLogList((prev) =>
          prev.map((l) =>
            l.email === customer.CustomerInfo?.Email
              ? { ...l, status: result.status }
              : l
          )
        );

        await new Promise((r) => setTimeout(r, 500)); // Rate limit
      }
      console.log("bundle");
    }
    return;
  };

  const getCustomerSummary = (data) => {
    if (!Array.isArray(data)) return {};

    const summary = {
      totalCustomers: data.length,
      totalTickets: 0,
      tierCounts: {},
    };

    data.forEach((c) => {
      const tier = c.CustomerInfo?.Current_Loyalty_Tier || "Unknown";
      const tickets = Number(c.CustomerInfo?.Current_Ticket_Count || 0);
      summary.totalTickets += tickets;
      summary.tierCounts[tier] = (summary.tierCounts[tier] || 0) + 1;
    });

    return summary;
  };

  const handleDownloadNoEmailList = () => {
    const noEmailCustomers = filtered.filter(
      (c) => !c.CustomerInfo.Email || c.CustomerInfo.Email.trim() === ""
    );

    if (noEmailCustomers.length === 0) {
      message.info("All customers have emails — nothing to download.");
      return;
    }

    const headers = [
      "Full Name",
      "Mobile Number",
      "Current Loyalty Tier",
      "Current Ticket Count",
    ];

    const rows = noEmailCustomers.map((c) => [
      `${c.CustomerInfo.FirstName} ${c.CustomerInfo.LastName}`,
      c.MobileNumber,
      c.CustomerInfo.Current_Loyalty_Tier || "-",
      c.CustomerInfo.Current_Ticket_Count || "0",
    ]);

    const csvContent = [headers, ...rows].map((r) => r.join(",")).join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `WinWay_NoEmail_Customers_${
      new Date().toISOString().split("T")[0]
    }.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    message.success(
      `Downloaded ${noEmailCustomers.length} customer(s) without emails.`
    );
  };

  const handleDownloadAll = () => {
    if (customers.length === 0) {
      message.info("All customers have emails — nothing to download.");
      return;
    }

    const headers = [
      "Full Name",
      "Mobile Number",
      "Current Loyalty Tier",
      "Current Ticket Count",
    ];

    const rows = customers.map((c) => [
      `${c.CustomerInfo.FirstName} ${c.CustomerInfo.LastName}`,
      c.MobileNumber,
      c.CustomerInfo.Current_Loyalty_Tier || "-",
      c.CustomerInfo.Current_Ticket_Count || "0",
    ]);

    const csvContent = [headers, ...rows].map((r) => r.join(",")).join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `WinWay_NoEmail_Customers_${
      new Date().toISOString().split("T")[0]
    }.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    message.success(
      `Downloaded ${customers.length} customer(s) without emails.`
    );
  };

  // 🔹 Fetch customers from backend
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const settingsArray = await getSettings();
      const customers = await getCombinedCustomers();
      const map = Object.fromEntries(
        settingsArray.data.data.map((s) => [s.key, s.value])
      );

      setSettings(map);
      if (customers.data?.success) {
        const data = customers.data.data || [];
        console.log(getCustomerSummary(data));

        setCustomers(data);
        setFiltered(data);
        setSummary(getCustomerSummary(data));
        message.success("✅ Entry customers loaded successfully");
      } else {
        message.warning("No customer data found.");
      }
    } catch (error) {
      console.error("❌ Error fetching customers:", error);
      message.error("Failed to fetch entry customers.");
    } finally {
      setLoading(false);
    }
  };

  // 🔍 Search Filter
  useEffect(() => {
    if (!searchText) setFiltered(customers);
    else {
      const lower = searchText.toLowerCase();
      setFiltered(
        customers.filter(
          (c) =>
            c.MobileNumber.toLowerCase().includes(lower) ||
            c.CustomerInfo?.FirstName?.toLowerCase().includes(lower) ||
            c.CustomerInfo?.LastName?.toLowerCase().includes(lower)
        )
      );
    }
  }, [searchText, customers]);

  // 🧹 Delete all customers

  const filterByTier = (tier) => {
    setSelectedTier(tier);
    if (tier) {
      console.log(customers[0].CustomerInfo.Current_Loyalty_Tier);

      const filteredTierCustomers = customers.filter(
        (c) => c.CustomerInfo.Current_Loyalty_Tier == tier
      );
      setFiltered(filteredTierCustomers);
    } else {
      setFiltered(customers);
    }
  };

  const deleteCustomers = async () => {
    try {
      const confirmDelete = window.confirm(
        "Are you sure you want to delete all entry customer data?"
      );
      if (!confirmDelete) return;
      setLoading(true);
      await axios.delete(
        `${API_BASE_LOCAL}/api/loyalCustomer/delete-all?confirm=true`
      );
      setCustomers([]);
      setFiltered([]);
      setSummary({});
      message.success("🗑 All entry customer data deleted successfully!");
    } catch (err) {
      message.error("❌ Failed to delete entry customers.");
    } finally {
      setLoading(false);
    }
  };

  // 📦 Excel Export
  const handleDownloadData = () => {
    if (!filtered.length) return message.warning("No data to export.");

    const exportData = filtered.map((item) => ({
      MobileNumber: item.MobileNumber,
      FirstName: item.CustomerInfo?.FirstName,
      LastName: item.CustomerInfo?.LastName,
      Email: item.CustomerInfo?.Email,
      Gender: item.CustomerInfo?.Gender,
      Loyalty_Tier: item.CustomerInfo?.Current_Loyalty_Tier,
      Ticket_Count: item.CustomerInfo?.Current_Ticket_Count,
      Last_Update: item.Last_Update,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Entry Customers");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "csv",
      type: "array",
    });
    saveAs(new Blob([excelBuffer]), "EntryCustomers.csv");
  };

  const onSendMail = (record) => {};
  const handleRowClick = async (record) => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE_LOCAL}/api/loyalCustomer/${record.MobileNumber}`
      );
      if (res.data?.success) {
        setSelectedCustomer(res.data.data);
        setIsModalVisible(true);
      } else {
        message.warning("No detailed data found for this customer.");
      }
    } catch (error) {
      console.error("❌ Error fetching detailed data:", error);
      message.error("Failed to load customer details.");
    } finally {
      setLoading(false);
    }
  };
  const columns = [
    {
      title: "Mobile Number",
      dataIndex: "MobileNumber",
      key: "MobileNumber",
      width: 160,
      fixed: "left",
      sorter: (a, b) => a.MobileNumber.localeCompare(b.MobileNumber),
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: "Name",
      key: "Name",
      sorter: (a, b) => {
        const nameA = `${a.CustomerInfo?.FirstName || ""} ${
          a.CustomerInfo?.LastName || ""
        }`;
        const nameB = `${b.CustomerInfo?.FirstName || ""} ${
          b.CustomerInfo?.LastName || ""
        }`;
        return nameA.localeCompare(nameB);
      },
      render: (record) =>
        `${record.CustomerInfo?.FirstName || ""} ${
          record.CustomerInfo?.LastName || ""
        }`,
    },
    {
      title: "Tier",
      key: "Tier",
      width: 120,
      align: "center",
      sorter: (a, b) =>
        (a.CustomerInfo?.Current_Loyalty_Tier || "").localeCompare(
          b.CustomerInfo?.Current_Loyalty_Tier || ""
        ),
      render: (record) => {
        const tier = record.CustomerInfo?.Current_Loyalty_Tier;
        return (
          <Tag
            color={tierColors[tier] || "default"}
            style={{ fontWeight: 500 }}
          >
            {tier || "-"}
          </Tag>
        );
      },
    },

    {
      title: "Tickets",
      dataIndex: ["CustomerInfo", "Current_Ticket_Count"],
      key: "Current_Ticket_Count",
      width: 100,
      align: "center",
      sorter: (a, b) =>
        (a.CustomerInfo?.Current_Ticket_Count || 0) -
        (b.CustomerInfo?.Current_Ticket_Count || 0),
      render: (value) => (
        <span style={{ fontWeight: 500, color: "#000000ff" }}>
          {Number(value || 0).toLocaleString()}
        </span>
      ),
    },

    {
      title: "Last Update",
      dataIndex: "Last_Update",
      key: "Last_Update",
      align: "center",
      sorter: (a, b) =>
        (a.Last_Update || "").localeCompare(b.Last_Update || ""),
    },

    // ⭐ NEW ACTION COLUMN
    {
      title: "Actions",
      key: "actions",
      width: 160,
      align: "center",
      fixed: "right",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            size="large"
            onClick={() => handleRowClick(record)}
          ></Button>

          <Button
            type="default"
            icon={<MailOutlined />}
            size="large"
            onClick={() => onSendMail(record)}
          ></Button>
        </Space>
      ),
    },
  ];

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handlePause = () => (pausedRef.current = true);
  const handleResume = () => (pausedRef.current = false);
  const handleStop = () => {
    stoppedRef.current = true;
    pausedRef.current = false;
    setLogModalVisible(false);
    message.info("🛑 Email sending stopped.");
  };

  const successCount = logList.filter((l) => l.status === "success").length;
  const failCount = logList.filter((l) => l.status === "failed").length;
  const imageCount = logList.filter((l) => l.status === "image").length;

  return (
    <>
      <Spin spinning={loading} tip="Loading customers...">
        <Row
          justify="space-between"
          align="middle"
          style={{ marginBottom: 20 }}
        >
          <Title level={3}>Send Loyalty Emails</Title>
        </Row>

        <Divider />

        {/* Overview Stats */}
        <Row gutter={[16, 16]} style={{ marginBottom: 10 }}>
          <Col xs={24} sm={12} md={12}>
            <Card
              style={{
                borderRadius: 12,
                background: "linear-gradient(145deg, #e3f2fd, #ffffff)",

                // ✅ HIGHLIGHT LOGIC
                border: !selectedTier
                  ? `1px solid "#000000ff"}`
                  : "1px solid #f0f0f0",

                boxShadow: !selectedTier
                  ? "0 5px 5px rgba(22,119,255,0.25)"
                  : "0 2px 14px rgba(0,0,0,0.05)",

                transition: "all 0.25s ease",
              }}
              onClick={() => {
                setSelectedTier(""); // ✅ toggle OFF
                filterByTier(); // ✅ reset filter (show all)
              }}
            >
              <Statistic
                title={
                  <span style={{ fontSize: 14, color: "#1976d2" }}>
                    Total Customers
                  </span>
                }
                value={summary.totalCustomers}
                valueStyle={{ fontWeight: 700, color: "#0d47a1" }}
                prefix={<TeamOutlined style={{ color: "#1976d2" }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={12}>
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
                value={summary.totalTickets || 0}
                valueStyle={{ fontWeight: 700, color: "#f57f17" }}
                prefix={<CrownOutlined style={{ color: "#fbc02d" }} />}
              />
            </Card>
          </Col>
        </Row>

        {/* 🏆 Tier Summary */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          {["Platinum", "Gold", "Silver", "Blue", "Warning", "Rejected"].map(
            (tier) => (
              <Col xs={24} sm={12} md={4} key={tier}>
                <Tooltip>
                  <Card
                    onClick={() => {
                      if (selectedTier === tier) {
                        setSelectedTier(""); // ✅ toggle OFF
                        filterByTier(); // ✅ reset filter (show all)
                      } else {
                        setSelectedTier(tier); // ✅ toggle ON
                        filterByTier(tier); // ✅ filter selected tier
                      }
                    }}
                    style={{
                      borderRadius: 12,
                      textAlign: "center",

                      // ✅ HIGHLIGHT LOGIC
                      border:
                        selectedTier === tier
                          ? `1px solid ${tierColors[tier] || "#000000ff"}`
                          : "1px solid #f0f0f0",

                      background:
                        selectedTier === tier ? tierColorsFade[tier] : "#fff",

                      boxShadow:
                        selectedTier === tier
                          ? "0 4px 12px rgba(22,119,255,0.25)"
                          : "0 2px 8px rgba(0,0,0,0.05)",

                      transition: "all 0.25s ease",
                    }}
                  >
                    <Statistic
                      title={
                        <div style={{ lineHeight: "1.2" }}>
                          <span
                            style={{
                              fontSize: 14,
                              color: tierColors[tier],
                              fontWeight: 600,
                            }}
                          >
                            {tier}
                          </span>
                          <br />
                        </div>
                      }
                      value={summary?.tierCounts?.[tier] || 0}
                      prefix={tierIcons[tier] || <UserOutlined />}
                      valueStyle={{
                        color: tierColors[tier],
                        fontWeight: 600,
                      }}
                    />
                  </Card>
                </Tooltip>
              </Col>
            )
          )}
        </Row>

        {/* 🔍 Search */}

        <Row style={{ marginBottom: 20 }}>
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="Search by name or mobile"
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button
              loading={sendingMailAll}
              icon={<MailOutlined />}
              type="primary"
              style={{
                marginLeft: 10,
                background: "#7b2ff7",
                borderColor: "#7b2ff7",
              }}
              onClick={() => {
                setEmailModalOpen(true);
              }}
            >
              {customers.length == filtered.length
                ? "Send To All "
                : "Send To Selected "}
            </Button>
          </Col>
        </Row>

        {/* 📋 Table */}
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="MobileNumber"
          onRow={(record) => ({ onClick: () => handleRowClick(record) })}
          bordered
          size="middle"
          scroll={{ x: true, y: 420 }}
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
            const tier = record.CustomerInfo?.Current_Loyalty_Tier;
            if (tier === "Platinum") return "tier-row-platinum";
            if (tier === "Gold") return "tier-row-gold";
            if (tier === "Silver") return "tier-row-silver";
            if (tier === "Blue") return "tier-row-blue";
            return "";
          }}
        />

        {/* ⚙️ Footer Buttons */}
        <div style={{ textAlign: "center", marginTop: 25 }}>
          <Button icon={<ReloadOutlined />} onClick={fetchCustomers}>
            Refresh
          </Button>
          <Button
            icon={<DeleteFilled />}
            danger
            style={{ marginLeft: 10 }}
            onClick={deleteCustomers}
          >
            Delete Customers
          </Button>
          <Button
            icon={<DownloadOutlined />}
            type="primary"
            style={{ marginLeft: 10 }}
            onClick={handleDownloadData}
          >
            Download All
          </Button>
          <Button
            icon={<DownloadOutlined />}
            type="primary"
            style={{ marginLeft: 10 }}
            onClick={handleDownloadNoEmailList}
          >
            Download No Emails
          </Button>
        </div>
      </Spin>

      <Modal
        open={logModalVisible}
        onCancel={() => setLogModalVisible(false)}
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
                value={imageCounts || 0}
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
          dataSource={logList}
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
                  <PictureOutlined style={{ color: "#faad14", fontSize: 18 }} />
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
      </Modal>

      <CustomerModel
        open={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        customer={selectedCustomer}
        settings={settings}
      />

      <EmailModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSend={handleSendLoyaltyEmails}
        headerLogo={headerLogo}
        footerLogo={footerLogo}
        customers={filtered}
      />
    </>
  );
}

export default LoyaltyEmails;
