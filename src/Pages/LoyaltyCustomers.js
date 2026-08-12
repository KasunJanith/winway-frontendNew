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
  Switch,Popconfirm
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
  UserAddOutlined,
  ArrowUpOutlined,
  MinusOutlined,
  ArrowDownOutlined,
  SendOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import axios from "axios";
import CustomerModel from "../componets/CustomerModel";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  getCombinedCustomers,
  getMonthlyUpgrades,
  getSettings,
  removeCustomer,
  formatMobileNumber,
  getMonthlyUpgradeSummary,
  removeRemovedDoneMembers,
} from "../api/endPoints";
import CustomerLoyaltyModal from "../componets/CustomerLoyaltyModal";
import EvaluationHistoryModal from "../componets/EvaluationHistoryModal";
import { ENV } from "../config/env";
import userEvent from "@testing-library/user-event";

const { Search } = Input;
const { Title, Text } = Typography;

const API_BASE = ENV.API_BASE_LOCAL;

function LoyaltyCustomers() {
  const [customers, setCustomers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [selectedTier, setSelectedTier] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const [IS_TEST_MODE, Set_IS_TEST_MODE] = useState(true);
  const [stageModalOpen, setStageModalOpen] = useState(false);

  const [summary, setSummary] = useState({});
  const [pagination, setPagination] = useState({ current: 1, pageSize: 5 });
  const [selectedCustomer, setSelectedCustomer] = useState();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [settings, setSettings] = useState({});
  const [sendingMailAll, setSendingMailAll] = useState(false);
  const [logList, setLogList] = useState([]);
  const [progress, setProgress] = useState(0);
  const [isLoading, setisLoading] = useState(false);

  const [uniqueMonths, setUniqueMonths] = useState([]);

  const firstStages = uniqueMonths?.slice(0, 1) || [];
  const lastStages = uniqueMonths?.slice(-1) || [];
  const storedName = localStorage.getItem("name");
  const storedRole = localStorage.getItem("role");

  const showViewAll = uniqueMonths?.length > 2;
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCustomer, setModalCustomer] = useState(null);
  const [populationAverages, setPopulationAverages] = useState({});
  const [modalCustomerHistory, setModalCustomerHistory] = useState([]);
  const LOTTERY_KEYS = [
    "Ada_Sampatha",
    "Dhana_Nidhanaya",
    "Govisetha",
    "Handahana",
    "Jaya",
    "Mahajana_Sampatha",
    "Mega_Power",
    "Suba_Dawasak",
  ];
  const [raw, setRaw] = useState([]);
  const pausedRef = useRef(false);
  const stoppedRef = useRef(false);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [singleEmailModelVisible, setSingleEmailModelVisible] = useState(false);
  // 💎 Tier Colors & Icons
  const tierColors = {
    Platinum: "#9B5DE5", // Elegant purple tone (modern premium look)
    Gold: "#E6B800", // True metallic gold
    Silver: "#C0C0C0", // Standard silver shade
    Blue: "#2563EB", // Same strong WinWay blue
    Warning: "#FFA500", // Bright amber-orange for visibility
    Removed: "#E63946", // Clear red for danger state
    Rejected: "#6b7280", // Gray for removed customers
    "Removed Done": "#8f0000", // Gray for removed customers
  };
  const tierColorsFade = {
    Platinum: "rgba(155, 93, 229, 0.2)", // Elegant purple tone (modern premium look)
    Gold: "rgba(230, 184, 0, 0.2)", // True metallic gold
    Silver: "rgba(192, 192, 192, 0.2)", // Standard silver shade
    Blue: "rgba(37, 99, 235, 0.2)", // Same strong WinWay blue
    Warning: "rgba(255, 165, 0, 0.2)", // Bright amber-orange for visibility
    Removed: "rgba(230, 57, 70, 0.2)", // Clear red for danger state
    Rejected: "rgba(107, 114, 128, 0.2)", // Gray for removed customers
    "Removed Done": "rgba(242, 8, 8, 0.2)", // Gray for removed customers
  };

  const tierIcons = {
    Platinum: <TrophyOutlined />,
    Gold: <GiftOutlined />,
    Silver: <RiseOutlined />,
    Blue: <RiseOutlined />,
    Warning: <WarningOutlined />,
    Rejected: <DragOutlined />,
    Removed_Done: <DragOutlined />,
  };
  const openCustomerModal = (mobile) => {
    const history = raw
      .filter((r) => r.MobileNumber === mobile)
      .sort(
        (a, b) => monthStrToDate(a.Last_Update) - monthStrToDate(b.Last_Update),
      );
    if (!history.length) {
      message.warning("No history for this customer.");
      return;
    }
    setModalCustomer(mobile);
    setModalCustomerHistory(history);
    setModalOpen(true);
  };
  const sendLoyaltyEmail = async (customer, type, i) => {
    try {
      const formData = new FormData();
      if (IS_TEST_MODE) {
        formData.append(
          "to",
          customer.CustomerInfo.Email
            ? "chamikadeshan97@gmail.com"
            : "chamikadeshan97@gmail.com",
        );
      } else {
        formData.append(
          "to",
          customer.CustomerInfo.Email
            ? customer.CustomerInfo.Email
            : "chamikadeshan97@gmail.com",
        );
        if (i <= 5 && customer.CustomerInfo.Email) {
          formData.append("cc", "info@winway.lk");
        }
      }

      formData.append(
        "name",
        `${customer.CustomerInfo?.FirstName || ""} ${
          customer.CustomerInfo?.LastName || ""
        }`,
      );
      formData.append(
        "type",
        type == "Initial Load" ? "loyalty_welcome" : type,
      );
      formData.append(
        "Loyalty_Number",
        `${customer.CustomerInfo?.Loyalty_Number || ""} 
        `,
      );

      // formData.append("subject", `Welcome to WIN WAY Loyalty Rewards Program`);

      // NEW → send full object
      formData.append("customerData", JSON.stringify(customer));

      const res = await axios.post(
        `${API_BASE}/email/loyality/send-loyalty`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      message.success(`✅ Email sent`);
      return { status: "success" };
    } catch (error) {
      console.error("❌ Loyalty Email Error:", error);
      message.error(`❌ Failed to send email`);
      return { status: "failed" };
    } finally {
      setSingleEmailModelVisible(false);
    }
  };

  const handleSendRemovalDoneEmails = async () => {
    setSendingMailAll(true);
    setLogModalVisible(true);
    setLogList([]);
    setProgress(0);
    pausedRef.current = false;
    stoppedRef.current = false;
    const removedDoneCustomers = filtered.filter(
      (c) => c.CustomerInfo.Current_Loyalty_Tier === "Removed Done",
    );

    const total = IS_TEST_MODE ? 10 : removedDoneCustomers.length;
    let sentCount = 0;
    for (let i = 0; i < removedDoneCustomers.length; i++) {
      const customer = removedDoneCustomers[i];
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
      // Actual send      console.log(i);
      const result = await sendLoyaltyEmail(customer, "Removed Done", i);
      sentCount++;
      setProgress(Math.round((sentCount / total) * 100));
      // Update log
      setLogList((prev) =>
        prev.map((l) =>
          l.email === customer.CustomerInfo?.Email
            ? { ...l, status: result.status }
            : l,
        ),
      );
      await new Promise((r) => setTimeout(r, 500)); // Rate limit
    }
    setSendingMailAll(false);
  };

  const handleDeleteAllCustomers = async () => {
    try {
      setLoading(true);
      await removeRemovedDoneMembers();

      message.success("All customers removed successfully");
      fetchCustomers();
    } catch (error) {
      console.error(error);
      message.error("Failed to remove customers");
    } finally {
      refresh();
      setLoading(false);
    }
  };
  const [groupedUpgrades, setGroupedUpgrades] = useState({});
  const groupByMobile = (data) => {
    return data.reduce((acc, item) => {
      const mobile = item.MobileNumber;

      if (!acc[mobile]) {
        acc[mobile] = [];
      }

      acc[mobile].push({
        Last_Update: item.Last_Update,
        Month_Tier: item.Month_Tier,
        Monthly_Ticket_Count: item.Monthly_Ticket_Count,
      });

      return acc;
    }, {});
  };

  const handleSendSingleEmail = async (record) => {
    setSingleEmailModelVisible(true);
    //setSelectedCustomer(record.CustomerInfo);
    await sendLoyaltyEmail(record, record.CustomerInfo.Evaluation_Status);
  };

  const handleSendLoyaltyEmails = async (type) => {
    setSendingMailAll(true);
    setLogModalVisible(true);
    setLogList([]);
    setProgress(0);
    pausedRef.current = false;
    stoppedRef.current = false;
    const total = IS_TEST_MODE ? 10 : filtered.length;

    let sentCount = 0;

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
      console.log(i);

      const result = await sendLoyaltyEmail(customer, type, i);
      sentCount++;
      setProgress(Math.round((sentCount / total) * 100));

      // Update log
      setLogList((prev) =>
        prev.map((l) =>
          l.email === customer.CustomerInfo?.Email
            ? { ...l, status: result.status }
            : l,
        ),
      );

      await new Promise((r) => setTimeout(r, 500)); // Rate limit
    }

    setSendingMailAll(false);
  };

  const getCustomerSummary = (c) => {
    const data = c.data || [];

    if (!Array.isArray(data)) return {};

    const summary = {
      totalCustomers: data.length,
      totalTickets: 0,
      tierCounts: {},
      new_customers: c.new_customers || 0,
      same: c.same || 0,
      upgrades: c.upgrades || 0,
      downgrades: c.downgrades || 0,
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
      (c) => !c.CustomerInfo.Email || c.CustomerInfo.Email.trim() === "",
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
      `Downloaded ${noEmailCustomers.length} customer(s) without emails.`,
    );
  };

  const monthStrToDate = (m) => {
    // "2025_October" -> Date(2025, 9, 1)
    if (!m) return new Date(0);
    const [y, mon] = m.split("_");
    const idx = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ].findIndex((x) => x.toLowerCase() === mon?.toLowerCase());
    return new Date(Number(y || 0), Math.max(0, idx), 1);
  };
  const MonthlyUpgrades = () => {
    useEffect(() => {
      getMonthlyUpgrades()
        .then((res) => {
          const grouped = groupByMobile(res.data);
          setGroupedUpgrades(grouped);
        })
        .catch(console.error);
    }, []);

    return null;
  };
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await getMonthlyUpgrades();
      const uniqueMonthsArr = [
        ...new Set(res.data.data.map((r) => r.Last_Update)),
      ].sort((a, b) => monthStrToDate(a) - monthStrToDate(b));

      setUniqueMonths(uniqueMonthsArr);

      if (res.data?.success && Array.isArray(res.data.data)) {
        const rows = res.data.data.slice().sort((a, b) => {
          const d =
            monthStrToDate(a.Last_Update) - monthStrToDate(b.Last_Update);
          if (d !== 0) return d;
          return (a.MobileNumber || "").localeCompare(b.MobileNumber || "");
        });

        setRaw(rows);

        message.success("Loyalty history loaded");
      } else {
        setRaw([]);
        message.warning("No data found");
      }
    } catch (e) {
      console.error(e);
      message.error("Failed to load loyalty history");
    } finally {
      setLoading(false);
    }
  };

  const [evaluationSummary, setEvaluationSummary] = useState([]);
  const getToken = () => {
    return localStorage.getItem("token");
  };
  const fetchSummery = async () => {
    setLoading(true);

    try {
      const token = getToken();

      if (!token) {
        message.error("Please login again");
        return;
      }
      const res = await getMonthlyUpgradeSummary();
      setEvaluationSummary(res.data || []);
    } catch (e) {
      console.error("❌ Failed to load loyalty history:", e);

      if (e.response?.status === 401) {
        message.error("Session expired. Please login again.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return;
      }

      message.error("Failed to load loyalty history");
    } finally {
      setLoading(false);
    }
  };

  const formatEvaluationName = (value) => {
    if (!value) return "-";
    if (value === "First Evaluation") return "First Evaluation";
    return value.replace(/_/g, " ");
  };

  function removeUnderscore(text) {
    return text.replace("_", " ");
  }
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
      `Downloaded ${customers.length} customer(s) without emails.`,
    );
  };

  const getButtonText = (selectedStatus) => {
    if (selectedStatus == "Initial Load") {
      return "Send Welcome Emails";
    } else if (selectedStatus == "Same") {
      return "Send Emails to Same Customers";
    } else if (selectedStatus == "Upgraded") {
      return "Send Emails to Tier Upgraded Customers";
    } else if (selectedStatus == "Down") {
      return "Send Emails to Tier Downgraded Customers";
    }
  };
  // 🔹 Fetch customers from backend
  const fetchCustomers = async () => {
    setLoading(true);
    setCustomers([]);
    setFiltered([]);
    setSummary({});
    setSelectedTier("");
    setSelectedStatus("");
    filterByTier(); // reset
    try {
      const settingsArray = await getSettings();
      const customers = await getCombinedCustomers();
      const grouped = await getMonthlyUpgrades();

      const map = Object.fromEntries(
        settingsArray.data.data.map((s) => [s.key, s.value]),
      );
      //console.log(grouped.data.data);
      const groupedN = {};

      grouped.data.data.forEach((item) => {
        if (!groupedN[item.Month_Tier]) {
          groupedN[item.Month_Tier] = [];
        }
        groupedN[item.Month_Tier].push(item.MobileNumber);
      });

      console.log(groupedN);
      setSettings(map);
      if (customers.data?.success) {
        const data = customers.data.data || [];
        console.log(customers.data);

        setCustomers(data);
        setFiltered(data);
        setSummary(getCustomerSummary(customers.data));

        console.log(getCustomerSummary(customers.data));

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
            c.CustomerInfo?.LastName?.toLowerCase().includes(lower),
        ),
      );
    }
  }, [searchText, customers]);

  const filterByTier = (tier) => {
    setSelectedTier(tier);
    if (tier) {
      const filteredTierCustomers = customers.filter(
        (c) => c.CustomerInfo.Current_Loyalty_Tier == tier,
      );
      setFiltered(filteredTierCustomers);
    } else {
      setFiltered(customers);
    }
  };
  const filterByStatus = (status) => {
    setSelectedStatus(status);

    if (status) {
      const filteredStatusCustomers = customers.filter(
        (c) => c.CustomerInfo.Evaluation_Status == status,
      );

      setFiltered(filteredStatusCustomers);
    } else {
      setFiltered(customers);
    }
  };
  const deleteCustomers = async () => {
    try {
      const confirmDelete = window.confirm(
        "Are you sure you want to delete all entry customer data?",
      );
      if (!confirmDelete) return;
      setLoading(true);
      //await axios.delete(`${API_BASE}/loyalCustomer/delete-all?confirm=true`);
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
      LastMonth_Loyalty_Tier: item.CustomerInfo?.lastMonthLoyaltyTier,
      Loyalty_Tier: item.CustomerInfo?.Current_Loyalty_Tier,
      Ticket_Count: item.CustomerInfo?.Current_Ticket_Count,
      Loyalty_Number: item.CustomerInfo?.Loyalty_Number,
      Last_Update:
        item.Last_Update == "Entry" ? "New Customer" : item.Last_Update,

      Ticket_Count_Last_Month:
        -item.CustomerInfo?.Last_Month_Ticket_Count +
        item.CustomerInfo?.Current_Ticket_Count,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Entry Customers");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "csv",
      type: "array",
    });
    saveAs(new Blob([excelBuffer]), `all.csv`);
  };

  const columns = [
    {
      title: "Mobile Number",
      dataIndex: "MobileNumber",
      key: "MobileNumber",
      width: 160,
      fixed: "left",
      sorter: (a, b) => a.MobileNumber.localeCompare(b.MobileNumber),
      render: (v) => (
        <Text strong>{v?.startsWith("+") ? v.substring(1) : v}</Text>
      ),
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
      title: "Loyality Number",
      key: "Tier",
      width: 120,
      align: "center",
      sorter: (a, b) =>
        (a.CustomerInfo?.Loyalty_Number || "").localeCompare(
          b.CustomerInfo?.Loyalty_Number || "",
        ),
      render: (record) => {
        const tier = record.CustomerInfo?.Loyalty_Number;
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
      title: "Last Tier",
      key: "Tier",
      width: 120,
      align: "center",
      sorter: (a, b) =>
        (a.CustomerInfo?.lastMonthLoyaltyTier || "").localeCompare(
          b.CustomerInfo?.lastMonthLoyaltyTier || "",
        ),
      render: (record) => {
        const tier = record.CustomerInfo?.lastMonthLoyaltyTier;
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
      title: "Current Tier",
      key: "Tier",
      width: 120,
      align: "center",
      sorter: (a, b) =>
        (a.CustomerInfo?.Current_Loyalty_Tier || "").localeCompare(
          b.CustomerInfo?.Current_Loyalty_Tier || "",
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
      title: "Tickets So Far",
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
      title: "Last Month Tictets",
      key: "ticket_diff",
      width: 100,
      align: "center",
      sorter: (a, b) =>
        (a.CustomerInfo?.Current_Ticket_Count || 0) -
        (a.CustomerInfo?.Last_Month_Ticket_Count || 0) -
        ((b.CustomerInfo?.Current_Ticket_Count || 0) -
          (b.CustomerInfo?.Last_Month_Ticket_Count || 0)),

      render: (_, record) => {
        const current = record.CustomerInfo?.Current_Ticket_Count || 0;
        const last = record.CustomerInfo?.Last_Month_Ticket_Count || 0;
        const diff = current - last;

        return (
          <span
            style={{
              fontWeight: 600,
              color:
                diff > 0
                  ? "#16a34a" // green → increased
                  : diff < 0
                    ? "#dc2626" // red → decreased
                    : "#6b7280", // gray → same
            }}
          >
            {diff > 0 ? `${diff}` : diff}
          </span>
        );
      },
    },
    {
      title: "Last Update",
      dataIndex: "Last_Update",
      key: "Last_Update",
      align: "center",
      sorter: (a, b) =>
        (a.Last_Update || "").localeCompare(b.Last_Update || ""),

      render: (text) => {
        if (!text || text.toLowerCase().includes("Entry".toLowerCase())) {
          return "New";
        }
        return text;
      },
    },
    {
      title: "Action",
      key: "action",
      fixed: "right",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Button
          loading={sendingMailAll}
          disabled={selectedTier}
          icon={<SendOutlined />}
          type="primary"
          style={{
            marginLeft: 10,
            background: "#7b2ff7",
            borderColor: "#7b2ff7",
          }}
          onClick={() => handleSendSingleEmail(record)}
        >
          Send
        </Button>
      ),
    },
  ];

  useEffect(() => {
    fetchCustomers();
    fetchHistory();
    fetchSummery();
  }, []);

  const refresh = () => {
    fetchCustomers();
    fetchHistory();
    fetchSummery();
  };
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
      <Spin
        spinning={loading || singleEmailModelVisible}
        tip={
          !singleEmailModelVisible ? "Loading customers..." : "Sending Email..."
        }
      >
        <Row
          justify="space-between"
          align="middle"
          style={{ marginBottom: 12 }}
        >
          <Title level={3}>Loyalty Customers</Title>
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
              {IS_TEST_MODE ? "TEST MODE" : "LIVE MODE"}
            </span>

            <Switch checked={IS_TEST_MODE} onChange={Set_IS_TEST_MODE} />
          </div>
        </Row>

        <Divider />

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={4}>
            <Card
              hoverable
              style={{
                borderRadius: 14,
                cursor: "pointer",
                background: "linear-gradient(145deg, #e3f2fd, #ffffff)",
                border: !selectedTier
                  ? "2px solid #1976d2"
                  : "1px solid #e0e0e0",
                boxShadow: !selectedTier
                  ? "0 6px 18px rgba(25,118,210,0.25)"
                  : "0 2px 8px rgba(0,0,0,0.05)",
                transition: "all 0.25s ease",
              }}
              onClick={() => {
                setSelectedTier("");
                setSelectedStatus("");
                filterByTier(); // reset
              }}
            >
              <Statistic
                title={
                  <Text
                    style={{ fontSize: 14, color: "#1976d2", fontWeight: 600 }}
                  >
                    Loyalty Customers
                  </Text>
                }
                value={summary.totalCustomers}
                valueStyle={{ fontWeight: 700, color: "#0d47a1" }}
                prefix={<TeamOutlined style={{ color: "#1976d2" }} />}
              />
            </Card>
          </Col>
          {[
            "Platinum",
            "Gold",
            "Silver",
            "Blue",
            "Warning",
            "Rejected",
            "Removed",
            "Removed Done",
          ].map((tier) => {
            const isActive = selectedTier === tier;

            return (
              <Col xs={24} sm={12} md={4} key={tier}>
                <Tooltip title={`Filter by ${tier}`}>
                  <Card
                    hoverable
                    onClick={() => {
                      if (isActive) {
                        setSelectedStatus("");
                        setSelectedTier("");
                        filterByTier();
                      } else {
                        setSelectedTier(tier);
                        filterByTier(tier);
                      }
                    }}
                    style={{
                      borderRadius: 14,
                      textAlign: "center",
                      cursor: "pointer",
                      border: isActive
                        ? `2px solid ${tierColors[tier]}`
                        : "1px solid #e0e0e0",
                      background: isActive ? tierColorsFade[tier] : "#ffffff",
                      boxShadow: isActive
                        ? `0 6px 18px ${tierColors[tier]}55`
                        : "0 2px 8px rgba(0,0,0,0.05)",
                      transition: "all 0.25s ease",
                    }}
                  >
                    <Statistic
                      title={
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: tierColors[tier],
                          }}
                        >
                          {tier}
                        </Text>
                      }
                      value={summary?.tierCounts?.[tier] || 0}
                      prefix={tierIcons[tier] || <UserOutlined />}
                      valueStyle={{
                        color: tierColors[tier],
                        fontWeight: 700,
                      }}
                    />
                  </Card>
                </Tooltip>
              </Col>
            );
          })}
        </Row>
        <Divider />
        <Row justify="center" gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col>
            <Card
              style={{
                borderRadius: 16,
                border: "1px solid #f0f0f0",
                boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
                background: "linear-gradient(135deg,#ffffff,#fafafa)",
              }}
              bodyStyle={{ padding: "16px 24px" }}
            >
              {uniqueMonths?.length ? (
                <Space wrap size="middle" align="center">
                  {/* FIRST STAGE */}
                  {firstStages.map((month) => (
                    <Tag
                      key={month}
                      color="processing"
                      style={{
                        fontSize: 13,
                        padding: "6px 14px",
                        borderRadius: 20,
                        fontWeight: 500,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                      }}
                    >
                      {month == "Entry"
                        ? "First Evaluation in 2025 November"
                        : removeUnderscore(month)}
                    </Tag>
                  ))}

                  {/* CONNECTOR */}
                  {showViewAll && (
                    <>
                      <span
                        style={{
                          color: "#bfbfbf",
                          fontWeight: 600,
                          fontSize: 16,
                        }}
                      >
                        • • •
                      </span>

                      {/* VIEW ALL BUTTON */}
                      <Button
                        type="default"
                        size="small"
                        onClick={() => setStageModalOpen(true)}
                        style={{
                          borderRadius: 20,
                          padding: "0 14px",
                          fontWeight: 500,
                          background: "#f5f5f5",
                          border: "1px solid #e6e6e6",
                        }}
                      >
                        View Full History
                      </Button>

                      <span
                        style={{
                          color: "#bfbfbf",
                          fontWeight: 600,
                          fontSize: 16,
                        }}
                      >
                        • • •
                      </span>
                    </>
                  )}

                  {/* LAST STAGE */}
                  {lastStages.map((month, index) => {
                    const isLatest = index === lastStages.length - 1;

                    return (
                      <Tag
                        key={month}
                        color={isLatest ? "success" : "blue"}
                        style={{
                          fontSize: 13,
                          padding: "6px 14px",
                          fontWeight: isLatest ? 600 : 500,
                          borderRadius: 20,
                          boxShadow: isLatest
                            ? "0 4px 12px rgba(82,196,26,0.25)"
                            : "0 2px 6px rgba(0,0,0,0.08)",
                        }}
                      >
                        {removeUnderscore(month)}
                        {isLatest && "  Latest"}
                      </Tag>
                    );
                  })}
                </Space>
              ) : (
                <Text type="secondary">No evaluation history available</Text>
              )}
            </Card>
          </Col>
        </Row>
        <Divider />
        <Row
          justify="space-between"
          gutter={[16, 16]}
          style={{ marginBottom: 12 }}
        >
          <Col xs={24} sm={12} md={4}>
            <Card
              hoverable
              style={{
                borderRadius: 14,
                cursor: "pointer",
                background: "linear-gradient(145deg, #e8f5e9, #ffffff)",
                border:
                  selectedStatus === "Initial Load"
                    ? "2px solid #2e7d32"
                    : "1px solid #c8e6c9",
                boxShadow:
                  selectedStatus === "Initial Load"
                    ? "0 6px 18px rgba(46,125,50,0.25)"
                    : "0 2px 8px rgba(0,0,0,0.05)",
              }}
              onClick={() => {
                if (selectedStatus == "Initial Load") {
                  setSelectedTier("");
                  setSelectedStatus("");
                  filterByTier(); // reset
                } else {
                  setSelectedTier("");
                  setSelectedStatus("Initial Load");
                  filterByStatus("Initial Load");
                }
              }}
            >
              <Statistic
                title={
                  <Text style={{ color: "#2e7d32", fontWeight: 600 }}>
                    New Customers
                  </Text>
                }
                value={summary.new_customers}
                valueStyle={{ color: "#1b5e20", fontWeight: 700 }}
                prefix={<UserAddOutlined style={{ color: "#2e7d32" }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Card
              hoverable
              style={{
                borderRadius: 14,
                cursor: "pointer",
                background: "linear-gradient(145deg, #e3f2fd, #ffffff)",
                border:
                  selectedStatus === "Upgraded"
                    ? "2px solid #1976d2"
                    : "1px solid #bbdefb",
                boxShadow:
                  selectedStatus === "Upgraded"
                    ? "0 6px 18px rgba(25,118,210,0.25)"
                    : "0 2px 8px rgba(0,0,0,0.05)",
              }}
              onClick={() => {
                if (selectedStatus == "Upgraded") {
                  setSelectedTier("");
                  setSelectedStatus("");
                  filterByTier(); // reset
                } else {
                  setSelectedTier("");
                  setSelectedStatus("Upgraded");
                  filterByStatus("Upgraded");
                }
              }}
            >
              <Statistic
                title={
                  <Text style={{ color: "#1976d2", fontWeight: 600 }}>
                    Upgrades
                  </Text>
                }
                value={summary.upgrades}
                valueStyle={{ color: "#0d47a1", fontWeight: 700 }}
                prefix={<ArrowUpOutlined style={{ color: "#1976d2" }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Card
              hoverable
              style={{
                borderRadius: 14,
                cursor: "pointer",
                background: "linear-gradient(145deg, #fff3e0, #ffffff)",
                border:
                  selectedStatus === "Same"
                    ? "2px solid #f57c00"
                    : "1px solid #ffe0b2",
                boxShadow:
                  selectedStatus === "Same"
                    ? "0 6px 18px rgba(245,124,0,0.25)"
                    : "0 2px 8px rgba(0,0,0,0.05)",
              }}
              onClick={() => {
                if (selectedStatus == "Same") {
                  setSelectedTier("");
                  setSelectedStatus("");
                  filterByTier(); // reset
                } else {
                  setSelectedTier("");
                  setSelectedStatus("Same");
                  filterByStatus("Same");
                }
              }}
            >
              <Statistic
                title={
                  <Text style={{ color: "#f57c00", fontWeight: 600 }}>
                    Not Changed
                  </Text>
                }
                value={summary.same}
                valueStyle={{ color: "#e65100", fontWeight: 700 }}
                prefix={<MinusOutlined style={{ color: "#f57c00" }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Card
              hoverable
              style={{
                borderRadius: 14,
                cursor: "pointer",
                background: "linear-gradient(145deg, #ffebee, #ffffff)",
                border:
                  selectedStatus === "Down"
                    ? "2px solid #d32f2f"
                    : "1px solid #ffcdd2",
                boxShadow:
                  selectedStatus === "Down"
                    ? "0 6px 18px rgba(211,47,47,0.25)"
                    : "0 2px 8px rgba(0,0,0,0.05)",
              }}
              onClick={() => {
                if (selectedStatus == "Down") {
                  setSelectedTier("");
                  setSelectedStatus("");
                  filterByTier(); // reset
                } else {
                  setSelectedTier("");
                  setSelectedStatus("Down");
                  filterByStatus("Down");
                }
              }}
            >
              <Statistic
                title={
                  <Text style={{ color: "#d32f2f", fontWeight: 600 }}>
                    Downgrades
                  </Text>
                }
                value={summary.downgrades}
                valueStyle={{ color: "#b71c1c", fontWeight: 700 }}
                prefix={<ArrowDownOutlined style={{ color: "#d32f2f" }} />}
              />
            </Card>
          </Col>
        </Row>
        <Divider />
        <Row justify="space-between" style={{ marginBottom: 20 }}>
          <Col xs={24} sm={12} md={12}>
            <Input.Search
              placeholder="Search by name, email, or mobile"
              allowClear
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
              }}
            />
          </Col>{" "}
          {selectedStatus && (
            <Col xs={24} md={5}>
              <Button
                loading={sendingMailAll}
                disabled={selectedTier}
                icon={<MailOutlined />}
                type="primary"
                style={{
                  marginLeft: 10,
                  background: "#7b2ff7",
                  borderColor: "#7b2ff7",
                }}
                onClick={() => handleSendLoyaltyEmails(selectedStatus)}
              >
                {getButtonText(selectedStatus)}
              </Button>
            </Col>
          )}
          {!selectedStatus && selectedTier === "Removed Done" && (
            <Col xs={24} md={5}>
              <Button
                loading={sendingMailAll}
                icon={<MailOutlined />}
                type="primary"
                style={{
                  marginLeft: 10,
                  background: "#7b2ff7",
                  borderColor: "#7b2ff7",
                }}
                onClick={() => handleSendRemovalDoneEmails()}
              >
                Send Removal Done Emails
              </Button>
            </Col>
          )}
          {!selectedStatus && selectedTier === "Removed Done" && (
           <Col xs={24} md={4}>
  <Popconfirm
    title="Delete all customers?"
    description="This action cannot be undone. Are you sure?"
    okText="Yes, Delete All"
    cancelText="Cancel"
    okButtonProps={{ danger: true }}
    onConfirm={handleDeleteAllCustomers}
    disabled={sendingMailAll}
  >
    <Button
      loading={sendingMailAll}
      icon={<DeleteOutlined />}
      danger
      type="primary"
      style={{
        marginLeft: 10,
        background: "#8f0000",
        borderColor: "#8f0000",
      }}
    >
      Delete All
    </Button>
  </Popconfirm>
</Col>
          )}
        </Row>

        <Divider />
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="MobileNumber"
          bordered
          size="middle"
          scroll={{ x: true, y: 420 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            showSizeChanger: true,
            pageSizeOptions: ["5", "10", "25", "50", "100", "300"],
            showTotal: (total, range) =>
              `Showing ${range[0]}-${range[1]} of ${total} customers`,
            onChange: (page, pageSize) =>
              setPagination({ current: page, pageSize }),
          }}
          onRow={(record) => ({
            onClick: () => {
              const mobile = record.MobileNumber;

              openCustomerModal(mobile);
            },
          })}
          rowClassName={(record) => {
            const tier = record.CustomerInfo?.Current_Loyalty_Tier;
            if (tier === "Platinum") return "tier-row-platinum";
            if (tier === "Gold") return "tier-row-gold";
            if (tier === "Silver") return "tier-row-silver";
            if (tier === "Blue") return "tier-row-blue";
            return "";
          }}
        />
        <div style={{ textAlign: "center", marginTop: 25 }}>
          <Button icon={<ReloadOutlined />} onClick={refresh}>
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
            Download All {storedName.toLocaleLowerCase} Data
            {storedRole}
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
        maskClosable={false}
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
      <CustomerLoyaltyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mobileNumber={modalCustomer}
        history={modalCustomerHistory}
        populationAverages={populationAverages}
        tierColors={tierColors}
        lotteryKeys={LOTTERY_KEYS}
      />
      <CustomerModel
        open={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        customer={selectedCustomer}
        settings={settings}
      />
      <EvaluationHistoryModal
        open={stageModalOpen}
        onClose={() => setStageModalOpen(false)}
        months={uniqueMonths}
      />
    </>
  );
}

export default LoyaltyCustomers;
