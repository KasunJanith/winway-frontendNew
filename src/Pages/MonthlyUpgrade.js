import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
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
  Space,
  Tooltip,
  List,
  Result,
  Modal,
  DatePicker,
} from "antd";
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
  WarningOutlined,
  StopOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ClockCircleTwoTone,
  CheckCircleTwoTone,
  PictureOutlined,
  CloseCircleTwoTone,
  RedoOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  FallOutlined,
} from "@ant-design/icons";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import CustomerModel from "../componets/CustomerModel";
import dayjs from "dayjs";
import {
  getCombinedCustomers,
  getSettings,
  normalizeNumbers,
} from "../api/endPoints";
import { ENV } from "../config/env";
const { Title, Text } = Typography;
const { Dragger } = Upload;
const API_BASE = ENV.REACT_APP_API_BASE_PY;
const API_BASE_Local = ENV.API_BASE_LOCAL;

function MonthlyUpgrade() {
  // ---------------- STATE ----------------
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [results2, setResults2] = useState([]);
  const [summary2, setSummary2] = useState(null);
  const [groupedHistory, setGroupedHistory] = useState([]);
  const [files, setFiles] = useState({});
  const [weekRange, setWeekRange] = useState(null);

  const [searchText, setSearchText] = useState("");
  const [pagination, setPagination] = useState({ current: 1, pageSize: 5 });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [saveSummary, setSaveSummary] = useState(null);
  const [saveSummary2, setSaveSummary2] = useState(null);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [settings, setSettings] = useState();
  const [sendingMailAll, setSendingMailAll] = useState(false);
  const [logList, setLogList] = useState([]);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [fileNames, setFileNames] = useState([]);

  const pausedRef = useRef(false);
  const stoppedRef = useRef(false);
  // 🗓️ Default Date Helpers
  const getDefaultStartDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}-01`;
  };

  const getYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}-31`;
  };

  // ⏱️ States (now with visible defaults)
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getYesterday());

  // 🧭 Validation
  useEffect(() => {
    if (!startDate || !endDate) return;

    const s = new Date(startDate);
    const e = new Date(endDate);
    const today = new Date();

    if (s > e) {
      message.warning(
        "⚠️ Start date cannot be after end date. Resetting to defaults.",
      );
      setStartDate(getDefaultStartDate());
      setEndDate(getYesterday());
      return;
    }

    if (e > today) {
      message.warning(
        "⚠️ End date cannot be in the future. Resetting to yesterday.",
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
    return Number.isFinite(n) ? n.toLocaleString() : (v ?? "-");
  };

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

  function checkFoldersSameMonth(folderNames) {
    if (!Array.isArray(folderNames) || folderNames.length === 0) {
      throw new Error(
        "❌ Invalid input: folderNames must be a non-empty array.",
      );
    }

    // Parse all folder names as dates
    const parsedDates = folderNames.map((f) => new Date(f));

    // Validate date format
    if (parsedDates.some((d) => isNaN(d.getTime()))) {
      throw new Error(
        "❌ Invalid date format detected. Use YYYY-MM-DD format.",
      );
    }

    // Extract year and month from first
    const firstYear = parsedDates[0].getFullYear();
    const firstMonth = parsedDates[0].getMonth();

    // Check all are same year and month
    const allSameMonth = parsedDates.every(
      (d) => d.getFullYear() === firstYear && d.getMonth() === firstMonth,
    );

    if (!allSameMonth) {
      const foundMonths = [
        ...new Set(
          parsedDates.map(
            (d) =>
              `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
          ),
        ),
      ];
      throw new Error(
        `❌ Folders span multiple months: ${foundMonths.join(", ")}`,
      );
    }

    const monthText = parsedDates[0].toLocaleString("default", {
      month: "long",
    });
    const monthNumber = String(firstMonth + 1).padStart(2, "0");

    console.log(`✅ All folders are from ${monthText} ${firstYear}`);

    return {
      year: firstYear,
      monthText, // e.g. "October"
      monthNumber, // e.g. "10"
    };
  }

  const normalizeMobile = (num) => {
    if (!num) return null;

    let n = String(num).replace(/\D/g, ""); // remove +, spaces, etc.

    if (n.startsWith("94") && n.length === 11) return n;
    if (n.startsWith("0") && n.length === 10) return "94" + n.slice(1);

    return n.length === 11 ? n : null;
  };

  const getYearMonthLabel = (dateObj) => {
    const { fromYear, fromMonth } = dateObj;

    const monthNames = [
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
    ];

    const monthIndex = parseInt(fromMonth, 10) - 1;

    if (monthIndex < 0 || monthIndex > 11) {
      throw new Error("Invalid month value");
    }

    return `${fromYear}_${monthNames[monthIndex]}`;
  };

  const sendLoyaltyWelcomeEmail = async (customer, i) => {
    try {
      const respo = await normalizeNumbers();
      console.log("Normalized mobile numbers response:", respo);
      const formData = new FormData();

      // formData.append(
      //   "to",
      //   customer.CustomerInfo.Email ? customer.CustomerInfo.Email : ""
      // );
      // formData.append("cc", "info@winway.lk");
      formData.append(
        "to",
        // customer.CustomerInfo.Email
        //   ? "chamikadeshan97@gmail.com,isurudineshcm@gmail.com,ampdharmapriya@gmail.com"
        //   : ""

        customer.CustomerInfo.Email ? "chamikadeshan97@gmail.com" : "",
      );

      formData.append(
        "name",
        `${customer.CustomerInfo?.FirstName || ""} ${
          customer.CustomerInfo?.LastName || ""
        }`,
      );
      formData.append("type", "loyalty_welcome");
      formData.append(
        "Loyalty_Number",
        `${customer.CustomerInfo?.Loyalty_Number || ""}`,
      );

      formData.append("subject", `Welcome to WIN WAY Loyalty Rewards Program`);

      // NEW → send full object
      formData.append("customerData", JSON.stringify(customer));

      const res = await axios.post(
        `${API_BASE_Local}/email/loyality/send-loyalty`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      message.success(`✅ Email sent`);
      return { status: "success" };
    } catch (error) {
      console.error("❌ Loyalty Email Error:", error);
      message.error(`❌ Failed to send email`);
      return { status: "failed" };
    }
  };

  const handleSendLoyaltyWelcomeEmails = async () => {
    setSendingMailAll(true);
    setLogModalVisible(true);
    setLogList([]);
    setProgress(0);
    pausedRef.current = false;
    stoppedRef.current = false;

    const total = 2;
    let sentCount = 0;
    const customers = await getCombinedCustomers();

    if (!customers.data?.success) {
      message.warning("No customer data found.");
      return;
    }
    const newCustomers = customers.data.data.filter(
      (c) => c.Last_Update === "Entry",
    );
    for (let i = 0; i < total; i++) {
      const customer = newCustomers[i];

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
      const result = await sendLoyaltyWelcomeEmail(customer, i);
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

    setTimeout(() => {
      setLogModalVisible(false);
      setStep(4);
    }, 3000);
  };

  const handleSaveLoyalty = async () => {
    if (!results || results.length === 0) {
      message.warning("No processed data available to save!");
      return;
    }
    const respo = await normalizeNumbers();
    try {
      console.log(summary);

      const date_range = splitDateRange(summary.date_range);
      const Last_Update = getYearMonthLabel(date_range);

      setLoading(true);

      const res = await axios.post(
        `${API_BASE_Local}/loyalCustomer/monthly-update`,
        {
          customers: results,
          Last_Update: Last_Update,
          // Last_Update: "Entry",
        },
      );

      if (res.data.success) {
        message.success("✅ Loyalty data saved successfully!");
        setSaveSummary({
          total: results.length,
          inserted: res.data.inserted,
          message: res.data.message,
        });
        // setSaveModalVisible(true);
      } else {
        message.warning(
          res.data.message || "Some entries may have been skipped.",
        );
      }
    } catch (err) {
      console.error(err);
      message.error("❌ Failed to save loyalty data!");
    } finally {
      setLoading(false);

      setTimeout(() => {
        handleSubmitNewLoyalityMembers();
      }, 5000);
    }
  };

  const sendLoyaltyEmail = async (customer) => {
    try {
      const formData = new FormData();

      formData.append(
        "to",
        // customer.CustomerInfo.Email
        //   ? "chamikadeshan97@gmail.com,isurudineshcm@gmail.com,ampdharmapriya@gmail.com"
        //   : ""

        customer.CustomerInfo.Email ? "chamikadeshan97@gmail.com" : "",
      );

      formData.append(
        "name",
        `${customer.CustomerInfo?.FirstName || ""} ${
          customer.CustomerInfo?.LastName || ""
        }`,
      );
      formData.append("type", "loyalty_welcome");
      formData.append(
        "Loyalty_Number",
        `${customer.CustomerInfo?.Loyalty_Number || ""}`,
      );

      formData.append("subject", `Welcome to WIN WAY Loyalty Rewards Program`);

      // NEW → send full object
      formData.append("customerData", JSON.stringify(customer));

      const res = await axios.post(
        `${API_BASE_Local}/email/loyality/send-loyalty`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      message.success(`✅ Email sent`);
      return { status: "success" };
    } catch (error) {
      console.error("❌ Loyalty Email Error:", error);
      message.error(`❌ Failed to send email`);
      return { status: "failed" };
    }
  };

  const groupMonthlyHistoryByMobile = (rows) => {
    const grouped = {};

    rows.forEach((row) => {
      const mobile = row.MobileNumber;
      if (!mobile) return;

      if (!grouped[mobile]) {
        grouped[mobile] = {
          MobileNumber: mobile,
          History: [],
        };
      }

      grouped[mobile].History.push({
        Last_Update: row.Last_Update,
        Month_Tier: row.Month_Tier,
        Monthly_Ticket_Count: row.Monthly_Ticket_Count,
      });
    });

    return Object.values(grouped);
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

  const handleSendLoyaltyEmails = async () => {
    setSendingMailAll(true);
    setLogModalVisible(true);
    setLogList([]);
    setProgress(0);
    pausedRef.current = false;
    stoppedRef.current = false;
    const customers = await getCombinedCustomers();

    if (!customers.data?.success) {
      message.warning("No customer data found.");
      return;
    }
    // ✅ keep only unique MobileNumber records
    const uniqueByMobile = Array.from(
      new Map(
        customers.data.data.map((item) => [item.MobileNumber, item]),
      ).values(),
    );

    const res = await axios.get(
      `${API_BASE_Local}/loyalCustomer/monthly-upgrades`,
    );

    if (res.data?.success && Array.isArray(res.data.data)) {
      const rows = res.data.data.slice().sort((a, b) => {
        const d = monthStrToDate(a.Last_Update) - monthStrToDate(b.Last_Update);
        if (d !== 0) return d;
        return (a.MobileNumber || "").localeCompare(b.MobileNumber || "");
      });

      const formattedHistory = groupMonthlyHistoryByMobile(rows);

      // 🔽 Build lookup
      const customerMap = new Map(
        uniqueByMobile.map((c) => [c.MobileNumber, c]),
      );

      // 🔽 Merge
      const mergedHistory = formattedHistory.map((item) => {
        const customer = customerMap.get(item.MobileNumber);

        return {
          MobileNumber: item.MobileNumber,
          CustomerInfo: customer.CustomerInfo || null,
          History: item.History,
        };
      });

      // ✅ SAVE FINAL DATA
      setGroupedHistory(mergedHistory);

      const total = 2;

      let sentCount = 0;
      for (let i = 0; i < total; i++) {
        const customer = mergedHistory[i];

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
        const result = await sendLoyaltyEmail(customer);
        sentCount++;
        setProgress(Math.round((sentCount / total) * 100));

        setLogList((prev) =>
          prev.map((l) =>
            l.email === customer.CustomerInfo?.Email
              ? { ...l, status: result.status }
              : l,
          ),
        );

        await new Promise((r) => setTimeout(r, 500)); // Rate limit
      }

      message.success("Loyalty history loaded");
    } else {
      setGroupedHistory([]);
      message.warning("No data found");
    }

    setSendingMailAll(false);

    setTimeout(() => {
      handleSubmitNewLoyalityMembers();
    }, 5000);
  };

  function splitDateRange(rangeText) {
    const [fromDate, toDate] = rangeText.split("→").map((s) => s.trim());

    const [fromYear, fromMonth, fromDay] = fromDate.split("-");
    const [toYear, toMonth, toDay] = toDate.split("-");

    return {
      fromYear,
      fromMonth,
      fromDay,
      toYear,
      toMonth,
      toDay,
    };
  }

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

  const handleSubmit1 = async () => {
    const respo = await normalizeNumbers();
    if (!files.zip_file || !files.customers_file) {
      message.warning("⚠️ Please upload both ZIP and Customer CSV files!");
      return;
    }

    if (!startDate || !endDate) {
      message.warning("⚠️ Please select both start and end dates!");
      return;
    }

    const formData = new FormData();

    try {
      const customers = await getCombinedCustomers();

      if (!customers.data?.success) {
        message.warning("No customer data found.");
        return;
      }

      const customersToInclude = (customers.data.data || [])
        .map((item) => item.MobileNumber)
        .filter(Boolean);
      customersToInclude.forEach((num) => {
        formData.append("include_numbers", num);
      });
      const settingsArray = await getSettings();

      const map = Object.fromEntries(
        settingsArray.data.data.map((s) => [s.key, s.value]),
      );

      setSettings(map);

      formData.append(
        "platinum",
        parseInt(map.LOYALTY_MONTHLY_PLATINUM_TICKETS, 10),
      );
      formData.append("gold", parseInt(map.LOYALTY_MONTHLY_GOLD_TICKETS, 10));
      formData.append(
        "silver",
        parseInt(map.LOYALTY_MONTHLY_SILVER_TICKETS, 10),
      );
      formData.append("minVal", parseInt(map.LOYALTY_DOWNGRADE_THRESHOLD, 10));

      // ======================================
      // 3️⃣ DATES + FILES
      // ======================================
      formData.append("start_date", startDate);
      formData.append("end_date", endDate);

      Object.entries(files).forEach(([key, file]) => {
        if (file) formData.append(key, file);
      });

      // ======================================
      // 4️⃣ INCLUDE NUMBERS (IMPORTANT)
      // ======================================
      customersToInclude.forEach((num) => {
        formData.append("include_numbers", num);
      });

      // ======================================
      // 5️⃣ SUBMIT
      // ======================================
      setLoading(true);
      setProgress(0);

      const response = await axios.post(
        `${API_BASE}/api/customer-tickets-monthly/`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            if (e.total) {
              setProgress(Math.round((100 * e.loaded) / e.total));
            }
          },
        },
      );

      const data = response.data;

      if (!data || !data.customers) {
        message.warning("No valid ticket data found!");
        return;
      }

      // ======================================
      // 6️⃣ UI UPDATE
      // ======================================
      const tierCounts = data.customers.reduce((acc, curr) => {
        const tier = curr.Loyalty_Tier || "None";
        acc[tier] = (acc[tier] || 0) + 1;
        return acc;
      }, {});

      const totalTicketsSum = data.customers.reduce(
        (acc, curr) => acc + Number(curr.Ticket_Count || 0),
        0,
      );

      setResults(data.customers);
      setSummary({
        ...data.summary,
        tiers: tierCounts,
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
  // ---------------- STEP 1 → PROCESS ----------------
  const handleSubmit = async () => {
    if (!files.zip_file || !files.customers_file) {
      message.warning("⚠️ Please upload both ZIP and CSV files first!");
      return;
    }
    const settingsArray = await getSettings();

    const formData = new FormData();
    const map = Object.fromEntries(
      settingsArray.data.data.map((s) => [s.key, s.value]),
    );
    const customers = await getCombinedCustomers();

    if (!customers.data?.success) {
      message.warning("No customer data found.");
      return;
    }
    const customersToInclude = (customers.data.data || [])
      .map((item) => item.MobileNumber)
      .filter(Boolean);

    formData.append(
      "platinum",
      parseInt(map.LOYALTY_MONTHLY_PLATINUM_TICKETS, 10),
    ); // ✅ always int
    formData.append("gold", parseInt(map.LOYALTY_MONTHLY_GOLD_TICKETS, 10)); // ✅ always int
    formData.append("silver", parseInt(map.LOYALTY_MONTHLY_SILVER_TICKETS, 10)); // ✅ always int
    formData.append("minVal", parseInt(map.LOYALTY_DOWNGRADE_THRESHOLD, 10)); // ✅ always int
    customersToInclude.forEach((num) => {
      formData.append("include_numbers", num);
    });
    formData.append("start_date", startDate);
    formData.append("end_date", endDate);

    Object.entries(files).forEach(([key, file]) => formData.append(key, file));

    try {
      setLoading(true);
      setProgress(0);
      const settingsArray = await getSettings();

      const map = Object.fromEntries(
        settingsArray.data.data.map((s) => [s.key, s.value]),
      );

      setSettings(map);
      const res = await axios.post(
        `${API_BASE}/api/customer-tickets-monthly/`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            if (e.total) setProgress(Math.round((100 * e.loaded) / e.total));
          },
        },
      );

      const data = res.data;

      if (!data || !data.customers) {
        message.warning("No valid ticket data found!");
        return;
      }

      const tierCounts = data.customers.reduce((acc, curr) => {
        const tier = curr.Loyalty_Tier || "None";
        acc[tier] = (acc[tier] || 0) + 1;
        return acc;
      }, {});

      // 🧩 Add tier counts to summary

      const totalTicketsSum = data.customers.reduce(
        (acc, curr) => acc + Number(curr.Ticket_Count || 0),
        0,
      );

      const updatedSummary = {
        ...data.summary,
        tiers: tierCounts,
        totalTicketsSum: totalTicketsSum,
      };

      setResults(data.customers);
      setSummary(updatedSummary);
      setWeekRange(data.week_range);
      console.log(data.zip_folders);
      //checkFoldersSameMonth(data.zip_folders);
      setFileNames(data.zip_folders);
      setStep(2);
      message.success("✅ Ticket report generated successfully!");
    } catch (err) {
      console.log(err);
      setError("❌ Error processing ticket data!");
      message.error("Error generating report!");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitNewLoyalityMembers = async () => {
    if (!files.zip_file || !files.customers_file) {
      message.warning("⚠️ Please upload both ZIP and Customer CSV files!");
      return;
    }

    if (!startDate || !endDate) {
      message.warning("⚠️ Please select both start and end dates!");
      return;
    }

    const formData = new FormData();

    try {
      // ======================================
      // 1️⃣ LOAD INCLUDED CUSTOMERS
      // ======================================
      const customers = await getCombinedCustomers();

      if (!customers.data?.success) {
        message.warning("No customer data found.");
        return;
      }

      const IGNORE_CURRENT_LOYAL_NUMBERS = (customers.data.data || [])
        .map((item) => item.MobileNumber)
        .filter(Boolean);

      const settingsArray = await getSettings();

      const map = Object.fromEntries(
        settingsArray.data.data.map((s) => [s.key, s.value]),
      );

      setSettings(map);

      formData.append(
        "platinum",
        parseInt(map.LOYALTY_ENTRY_PLATINUM_TICKETS, 10),
      );
      formData.append("gold", parseInt(map.LOYALTY_ENTRY_GOLD_TICKETS, 10));
      formData.append("silver", parseInt(map.LOYALTY_ENTRY_SILVER_TICKETS, 10));
      formData.append(
        "minVal",
        parseInt(map.LOYALTY_ENTRY_MIN_CHECK_TICKETS, 10),
      );

      // ======================================
      // 3️⃣ DATES + FILES
      // ======================================
      formData.append("start_date", "2025-07-01");
      formData.append("end_date", endDate);

      Object.entries(files).forEach(([key, file]) => {
        if (file) formData.append(key, file);
      });

      // ======================================
      // 4️⃣ INCLUDE NUMBERS (IMPORTANT)
      // ======================================
      const final_ignore_list = Array.from(
        new Set(
          [...FIXED_IGNORE_NUMBERS, ...(IGNORE_CURRENT_LOYAL_NUMBERS || [])]
            .map(normalizeMobile)
            .filter(Boolean),
        ),
      );
      final_ignore_list.forEach((num) => {
        formData.append("ignore_numbers", num);
      });
      // ======================================
      // 5️⃣ SUBMIT
      // ======================================
      setLoading(true);
      setProgress(0);
      console.log(
        FIXED_IGNORE_NUMBERS.length,
        IGNORE_CURRENT_LOYAL_NUMBERS.length,
        final_ignore_list.length,
      );
      console.log(IGNORE_CURRENT_LOYAL_NUMBERS);

      const response = await axios.post(
        `${API_BASE}/api/customer-tickets/`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            if (e.total) {
              setProgress(Math.round((100 * e.loaded) / e.total));
            }
          },
        },
      );

      const data = response.data;

      if (!data || !data.customers) {
        message.warning("No valid ticket data found!");
        return;
      }

      // ======================================
      // 6️⃣ UI UPDATE
      // ======================================
      const tierCounts = data.customers.reduce((acc, curr) => {
        const tier = curr.Loyalty_Tier || "None";
        acc[tier] = (acc[tier] || 0) + 1;
        return acc;
      }, {});

      const totalTicketsSum = data.customers.reduce(
        (acc, curr) => acc + Number(curr.Ticket_Count || 0),
        0,
      );
      console.log(data);

      setResults2(data.customers);
      setSummary2({
        ...data.summary,
        tiers: tierCounts,
        totalTicketsSum,
      });

      // setStep(2);
      message.success("✅ Ticket report generated successfully!");
    } catch (err) {
      console.error(err);
      setError("❌ Error processing ticket data!");
      message.error("Error generating report!");
    } finally {
      setLoading(false);
      setStep(3);
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
  const successCount = logList.filter((l) => l.status === "success").length;
  const failCount = logList.filter((l) => l.status === "failed").length;
  const imageCount = logList.filter((l) => l.status === "image").length;

  const handleSaveNewLoyalityMembers = async () => {
    if (!results || results.length === 0) {
      message.warning("No processed data available to save!");
      return;
    }

    try {
      const date_range = splitDateRange(summary.date_range);
      const Last_Update = getYearMonthLabel(date_range);
      console.log(Last_Update);

      setLoading(true);
      const sortedResults = [...results2].sort(
        (a, b) => (b.Ticket_Count || 0) - (a.Ticket_Count || 0),
      );
      const res = await axios.post(`${API_BASE_Local}/loyalCustomer`, {
        customers: sortedResults,
        Last_Update_Summery: Last_Update,
        New_Customers: summary2.loyal_customers,
        Last_Update: "Entry",
        current_count: 496,
      });

      if (res.data.success) {
        message.success("✅ Loyalty data saved successfully!");
        setSaveSummary2({
          total: results2.length,
          inserted: res.data.inserted,
          message: res.data.message,
        });
        //setSaveModalVisible(true);
      } else {
        message.warning(
          res.data.message || "Some entries may have been skipped.",
        );
      }
    } catch (err) {
      console.error(err);
      message.error("❌ Failed to save loyalty data!");
    } finally {
      setLoading(false);

      // setTimeout(() => {
      //   handleSendLoyaltyWelcomeEmails();
      // }, 5000);
    }
  };

  const handleDownloadData = () => {
    if (!results || results.length === 0) {
      message.warning("No data available to download!");
      return;
    }

    const exportData = results.map((item) => ({
      MobileNumber: item.MobileNumber,
      FirstName: item?.FirstName,
      LastName: item?.LastName,
      Email: item?.Email,
      Gender: item?.Gender,
      Loyalty_Tier: item.Loyalty_Tier,
      Ticket_Count: item.Ticket_Count,
      Last_Update: item.Last_Purchase_Time,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Current Loyalty Summary ",
    );
    const excelBuffer = XLSX.write(workbook, {
      bookType: "csv",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const fileName = `WinWay_Loyalty_Report_${summary.date_range}.csv`;
    saveAs(blob, fileName);
    message.success("✅ Loyalty report downloaded!");
  };

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
    [files, handleChange, handleRemove],
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
              Upload Sales and Customer Files
            </Title>
            <Divider />
            <Row gutter={[24, 24]} justify="center">
              <Col xs={24} lg={20}>
                <Form layout="vertical">
                  <Row gutter={[12, 12]} justify="center">
                    <Col xs={24} sm={12} md={8}>
                      {renderUpload(
                        "Ticket Sales  ZIP (.zip)",
                        "zip_file",
                        ".zip",
                        <FileZipOutlined style={{ color: "#1890ff" }} />,
                        "Tickets ZIP attached",
                      )}
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      {renderUpload(
                        "Customers CSV (.csv)",
                        "customers_file",
                        ".csv",
                        <FileTextOutlined style={{ color: "#fa8c16" }} />,
                        "Customers file attached",
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
                    Upgraded Loyality Members
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
                            Total Loyal Customers
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
                            Loyal Customers Summery Down/Up
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
                            Customers Downgraded
                          </span>
                        }
                        //    value={summary.total_tickets}
                        valueStyle={{ fontWeight: 700, color: "#f57f17" }}
                        prefix={<FallOutlined style={{ color: "#fbc02d" }} />}
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
                            Customers Upgraded
                          </span>
                        }
                        // value={summary.totalTicketsSum}
                        valueStyle={{ fontWeight: 700, color: "#1b5e20" }}
                        prefix={<RiseOutlined style={{ color: "#43a047" }} />}
                      />
                    </Card>
                  </Col>
                </Row>

                <Divider />

                {/* ======================= TIER CARDS ======================= */}
                <Row gutter={[16, 16]} style={{ marginBottom: 25 }}>
                  <Col xs={24} sm={12} md={6}>
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
                              ≥ {settings.LOYALTY_MONTHLY_PLATINUM_TICKETS}{" "}
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

                  <Col xs={24} sm={12} md={6}>
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
                              ≥ {settings.LOYALTY_MONTHLY_GOLD_TICKETS} Tickets
                            </Text>
                          </div>
                        }
                        value={summary?.tiers?.Gold || 0}
                        valueStyle={{ color: "#facc15", fontWeight: 700 }}
                        prefix={<GiftOutlined style={{ color: "#facc15" }} />}
                      />
                    </Card>
                  </Col>

                  <Col xs={24} sm={12} md={6}>
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
                              ≥ {settings.LOYALTY_MONTHLY_SILVER_TICKETS}{" "}
                              Tickets
                            </Text>
                          </div>
                        }
                        value={summary?.tiers?.Silver || 0}
                        valueStyle={{ color: "#9e9e9e", fontWeight: 700 }}
                        prefix={<RiseOutlined style={{ color: "#9e9e9e" }} />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card
                      hoverable
                      style={{
                        borderRadius: 14,
                        background: "linear-gradient(145deg, #fafafa, #ffffff)",
                        boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                        border: "1px solid #f0f0f0",
                        transition: "all 0.25s ease",
                      }}
                      styles={{ padding: 18 }}
                    >
                      <Statistic
                        title={
                          <span
                            style={{
                              fontSize: 13,
                              color: "#2563EB",
                              fontWeight: 600,
                            }}
                          >
                            Blue Tier Customers
                            <br />
                            <Text type="secondary" style={{ fontSize: 14 }}>
                              at risk
                            </Text>
                          </span>
                        }
                        value={summary?.tiers?.Blue || 0}
                        valueStyle={{
                          color: "#2563EB",
                          fontSize: 26,
                          fontWeight: 800,
                        }}
                        prefix={
                          <WarningOutlined
                            style={{
                              color: "#2563EB",
                              fontSize: 18,
                              marginRight: 6,
                            }}
                          />
                        }
                      />
                    </Card>
                  </Col>
                </Row>

                <CustomerModel
                  open={isModalVisible}
                  onClose={() => setIsModalVisible(false)}
                  customer={selectedCustomer}
                />

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
                    Save Updates And Process New Loyality Members
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
      {step === 3 && (
        <>
          <Row
            justify="space-between"
            align="middle"
            style={{ marginBottom: 20 }}
          >
            <Title level={3} style={{ marginBottom: 0 }}>
              New Loyality Members
            </Title>

            {summary2?.date_range && (
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
                    Period:&nbsp; {summary2.date_range}
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
                  value={summary2.total_customers}
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
                      New Loyal Customers
                    </span>
                  }
                  value={summary2.loyal_customers}
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
                  value={summary2.total_tickets}
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
                  value={summary2.totalTicketsSum}
                  valueStyle={{ fontWeight: 700, color: "#1b5e20" }}
                  prefix={<TeamOutlined style={{ color: "#43a047" }} />}
                />
              </Card>
            </Col>
          </Row>

          <Divider />

          {/* ======================= TIER CARDS ======================= */}
          <Row gutter={[16, 16]} style={{ marginBottom: 25 }}>
            <Col xs={24} sm={12} md={6}>
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
                        ≥ {settings.LOYALTY_ENTRY_PLATINUM_TICKETS} Tickets
                      </Text>
                    </div>
                  }
                  value={summary2?.tiers?.Platinum || 0}
                  valueStyle={{ color: "#7b2ff7", fontWeight: 700 }}
                  prefix={<TrophyOutlined style={{ color: "#7b2ff7" }} />}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} md={6}>
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
                  value={summary2?.tiers?.Gold || 0}
                  valueStyle={{ color: "#facc15", fontWeight: 700 }}
                  prefix={<GiftOutlined style={{ color: "#facc15" }} />}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} md={6}>
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
                  value={summary2?.tiers?.Silver || 0}
                  valueStyle={{ color: "#9e9e9e", fontWeight: 700 }}
                  prefix={<RiseOutlined style={{ color: "#9e9e9e" }} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card
                hoverable
                style={{
                  borderRadius: 14,
                  background: "linear-gradient(145deg, #fafafa, #ffffff)",
                  boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                  border: "1px solid #f0f0f0",
                  transition: "all 0.25s ease",
                }}
                styles={{ padding: 18 }}
              >
                <Statistic
                  title={
                    <span
                      style={{
                        fontSize: 13,
                        color: "#2563EB",
                        fontWeight: 600,
                      }}
                    >
                      Blue Tier Customers
                      <br />
                      <Text type="secondary" style={{ fontSize: 14 }}>
                        at risk
                      </Text>
                    </span>
                  }
                  value={summary2?.tiers?.Blue || 0}
                  valueStyle={{
                    color: "#2563EB",
                    fontSize: 26,
                    fontWeight: 800,
                  }}
                  prefix={
                    <WarningOutlined
                      style={{
                        color: "#2563EB",
                        fontSize: 18,
                        marginRight: 6,
                      }}
                    />
                  }
                />
              </Card>
            </Col>
          </Row>

          <Button
            type="primary"
            size="large"
            onClick={handleSaveNewLoyalityMembers}
            disabled={loading}
            style={{ marginRight: 10 }}
          >
            {loading ? "Processing..." : "Save New Loyality Members"}
          </Button>
        </>
      )}
      {step === 4 && (
        <>
          <Title level={3} style={{ textAlign: "left" }}>
            Full Summary
          </Title>

          <Divider />
          <Button
            type="primary"
            size="large"
            onClick={() => setStep(2)}
            disabled={loading}
            style={{ marginRight: 10 }}
          >
            Set Back To Previous Step
          </Button>
          <Button
            type="primary"
            size="large"
            onClick={handleSendLoyaltyWelcomeEmails}
            disabled={loading}
            style={{ marginRight: 10 }}
          >
            {loading ? "Processing..." : "Send Email For New Customers"}
          </Button>
        </>
      )}

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
              <>
                <div key="details" style={{ textAlign: "left", marginTop: 10 }}>
                  <p>
                    <strong>Total Processed New:</strong>{" "}
                    {saveSummary2?.total || 0}
                  </p>
                  <p>
                    <strong>Inserted New:</strong> {saveSummary2?.inserted || 0}
                  </p>
                  <p>
                    <strong>Message New:</strong> {saveSummary2?.message || ""}
                  </p>
                </div>
                ,
                <br />
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
                </div>
                ,
              </>,
            ]}
          />
        </Modal>
      )}
    </>
  );
}

export default MonthlyUpgrade;
