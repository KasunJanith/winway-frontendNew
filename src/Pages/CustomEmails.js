import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  Input,
  Button,
  Form,
  message,
  Typography,
  Steps,
  Table,
  Upload,
  Select,
  Statistic,
  Row,
  Col,
  Divider,
  Alert,
  Space,
  Tag,
  Progress,
  Modal,
  List,
  Switch,
  DatePicker,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";

import headerLogo from "../assets/logo.png";
import footerLogo from "../assets/nlb_logo.png";

import {
  Editor,
  EditorProvider,
  Toolbar,
  BtnBold,
  BtnItalic,
  BtnUnderline,
  BtnStrikeThrough,
  BtnBulletList,
  BtnNumberedList,
  BtnUndo,
  BtnRedo,
  BtnLink,
  BtnClearFormatting,
  BtnStyles,
} from "react-simple-wysiwyg";

import {
  StopOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ClockCircleTwoTone,
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  CloseCircleOutlined,
  CheckCircleOutlined,
  MailOutlined,
  UploadOutlined,
  FileTextOutlined,
  DownloadOutlined,
  DollarCircleFilled,
  ReloadOutlined,
} from "@ant-design/icons";
import { ENV } from "../config/env";

const { Title, Text } = Typography;
const { Step } = Steps;
const { Option } = Select;



const API_BASE = ENV.REACT_APP_API_BASE_PY;
const API_EMAIL = ENV.API_BASE_LOCAL;

/* ================= HELPERS ================= */
const normalizeKey = (key = "") =>
  key.toString().toLowerCase().replace(/\s+/g, "").replace(/_/g, "");

const getNestedValue = (obj, path) => {
  if (!obj || !path) return "";

  if (Object.prototype.hasOwnProperty.call(obj, path)) {
    return obj[path];
  }

  return path.split(".").reduce((acc, part) => {
    if (!acc) return "";
    return acc[part] ?? "";
  }, obj);
};

const getFieldValue = (customer, key) => {
  if (!customer || !key) return "";

  const exactValue = getNestedValue(customer, key);

  if (exactValue !== undefined && exactValue !== null && exactValue !== "") {
    return exactValue;
  }

  const wanted = normalizeKey(key);
  const foundKey = Object.keys(customer).find(
    (itemKey) => normalizeKey(itemKey) === wanted,
  );

  return foundKey ? customer[foundKey] : "";
};

const extractKeys = (obj, prefix = "") =>
  Object.entries(obj || {}).flatMap(([key, value]) => {
    if (key === "_rowId") return [];

    if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      return extractKeys(value, `${prefix}${key}.`);
    }

    return `${prefix}${key}`;
  });

const toProperCase = (name = "") =>
  name
    .toString()
    .replace(/[^a-zA-Z ]/g, "")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const normalizeLK = (number) => {
  if (!number) return "";

  let num = number.toString().trim().replace(/[^\d+]/g, "");
  num = num.replace(/\.0$/, "");

  if (num.startsWith("+94")) num = "94" + num.slice(3);
  if (num.startsWith("0094")) num = "94" + num.slice(4);
  if (num.startsWith("0")) num = "94" + num.slice(1);
  if (num.length === 9 && num.startsWith("7")) num = "94" + num;

  return /^947\d{8}$/.test(num) ? num : "";
};

const isValidEmail = (email) => {
  if (!email) return false;

  const emailText = String(email).trim().toLowerCase();

  if (
    !emailText ||
    emailText === "null" ||
    emailText === "undefined" ||
    emailText === "nan"
  ) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailText);
};

const escapeCSV = (value = "") => {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
};

function CustomEmails() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isTestMode, setIsTestMode] = useState(true);

  const [form] = Form.useForm();
  const [uploadForm] = Form.useForm();
  const [monthForm] = Form.useForm();

  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [mobileColumn, setMobileColumn] = useState("MobileNumber");
  const [searchText, setSearchText] = useState("");
  const [visibleColumns, setVisibleColumns] = useState([]);

  const [title, setTitle] = useState("");
  const [uploadedFileInfo, setUploadedFileInfo] = useState(null);
  const [showMonthModal, setShowMonthModal] = useState(false);

  const pausedRef = useRef(false);
  const stoppedRef = useRef(false);

  const [isPaused, setIsPaused] = useState(false);
  const [sending, setSending] = useState(false);
  const [logList, setLogList] = useState([]);
  const [progress, setProgress] = useState(0);
  const [noEmailList, setNoEmailList] = useState([]);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [totalToSend, setTotalToSend] = useState(0);
  const [editorValue, setEditorValue] = useState("");

  /* ================= CARD THEME ================= */
  const cardBase = {
    borderRadius: 14,
    transition: "all 0.25s ease",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  };

  const cardStyles = {
    blue: {
      background: "linear-gradient(145deg, #e3f2fd, #ffffff)",
      border: "1px solid #bbdefb",
    },
    green: {
      background: "linear-gradient(145deg, #e8f5e9, #ffffff)",
      border: "1px solid #c8e6c9",
    },
    orange: {
      background: "linear-gradient(145deg, #fff3e0, #ffffff)",
      border: "1px solid #ffe0b2",
    },
    purple: {
      background: "linear-gradient(145deg, #f3e8ff, #ffffff)",
      border: "1px solid #d3adf7",
    },
  };

  /* ================= FIELD HELPERS ================= */
  const templateKeys = useMemo(() => {
    return customers.length ? extractKeys(customers[0]) : [];
  }, [customers]);

  const excludedFields = useMemo(
    () => [
      "_rowId",
      "id",
      "createdAt",
      "updatedAt",
      mobileColumn,
      "MobileNumber",
      "MOBILENUMBER",
      "Mobile Number",
      "MOBILE NUMBER",
      "Mobile",
      "MOBILE",
      "Phone",
      "PHONE",
      "Phone No",
      "PHONE NO",
    ],
    [mobileColumn],
  );

  const isExcludedField = (key) =>
    excludedFields.some(
      (excluded) => normalizeKey(excluded) === normalizeKey(key),
    );

  const getCustomerEmail = (customer = {}) =>
    (
      getFieldValue(customer, "EMAIL") ||
      getFieldValue(customer, "Email") ||
      getFieldValue(customer, "email") ||
      ""
    )
      .toString()
      .trim();

  const getCustomerFirstName = (customer = {}) =>
    (
      getFieldValue(customer, "FIRSTNAME") ||
      getFieldValue(customer, "FirstName") ||
      getFieldValue(customer, "First Name") ||
      getFieldValue(customer, "NAME") ||
      getFieldValue(customer, "Name") ||
      ""
    )
      .toString()
      .trim();

  const getCustomerLastName = (customer = {}) =>
    (
      getFieldValue(customer, "LASTNAME") ||
      getFieldValue(customer, "LastName") ||
      getFieldValue(customer, "Last Name") ||
      ""
    )
      .toString()
      .trim();

  const getCustomerGender = (customer = {}) =>
    (
      getFieldValue(customer, "GENDER") ||
      getFieldValue(customer, "Gender") ||
      getFieldValue(customer, "gender") ||
      ""
    )
      .toString()
      .trim();

  const getCustomerMobileRaw = (customer = {}) => {
    const possibleKeys = [
      mobileColumn,
      "MobileNumber",
      "MOBILENUMBER",
      "Mobile Number",
      "MOBILE NUMBER",
      "Mobile",
      "MOBILE",
      "Phone",
      "PHONE",
      "Phone No",
      "PHONE NO",
    ];

    for (const key of possibleKeys) {
      const value = getFieldValue(customer, key);
      if (value) return value;
    }

    return "";
  };

  const getGenderTitle = (customer = {}) => {
    const gender = getCustomerGender(customer).toLowerCase();

    if (["male", "m", "mr"].includes(gender)) return "Mr.";
    if (["female", "f", "ms", "mrs", "miss"].includes(gender)) return "Ms.";

    return "";
  };

  const getFullGreeting = (customer = {}) => {
    const genderTitle = getGenderTitle(customer);
    const firstName = toProperCase(getCustomerFirstName(customer));
    const lastName = toProperCase(getCustomerLastName(customer));

    const name =
      firstName && lastName
        ? `${firstName} ${lastName}`
        : firstName || lastName || "Valued Customer";

    return `Dear ${genderTitle ? `${genderTitle} ` : ""}${name},`;
  };

  const transformValue = (key, value) => {
    if (value === undefined || value === null) return "";

    const keyName = key.toString().toLowerCase();
    const textValue = value.toString().trim();

    if (keyName === "gender") {
      const gender = textValue.toLowerCase();

      if (["male", "m", "mr"].includes(gender)) return "Mr";
      if (["female", "f", "ms", "mrs", "miss"].includes(gender)) return "Ms";

      return "";
    }

    return textValue;
  };

  const applyTemplate = (template = "", customer = {}) =>
    template.replace(/{{(.*?)}}/g, (_, rawKey) => {
      const key = rawKey.trim();
      const rawValue = getFieldValue(customer, key);
      return transformValue(key, rawValue);
    });

  /* ================= EMAIL HTML TEMPLATE ================= */
  const generateLoyaltyCustomEmail = (
    body,
    customer = {},
    emailTitle,
    topLogo,
    bottomLogo,
  ) => {
    const renderedBody = applyTemplate(body, customer);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
</head>
<body style="margin:0; padding:0; font-family:Arial, sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding:0;">
        <table width="100%" style="
          background:#EBF0F9;
          border-radius:18px;
          overflow:hidden;
          border:3px solid #000;
          box-shadow:0 5px 25px rgba(0,0,0,0.1);
        ">
          <tr>
            <td align="center">
              <div style="
                border-radius:18px;
                background:linear-gradient(135deg,#7b2ff7,#f107a3);
                padding:22px 30px;
              ">
                <table width="100%">
                  <tr>
                    <td align="left" width="90">
                      <img src="${topLogo}" width="90" height="90" style="border-radius:8px;" />
                    </td>
                    <td align="center">
                      <h1 style="color:#fff; font-size:32px; margin:0; font-family:Georgia, serif;">
                        ${emailTitle || ""}
                      </h1>
                    </td>
                    <td width="90"></td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:40px; font-size:16px; color:#333; line-height:1.6;">
              <p style="font-size:18px; font-family:Georgia, serif; font-style:italic;">
                <strong>${getFullGreeting(customer)}</strong>
              </p>

              <div style="font-family:Georgia, serif; font-style:italic; font-size:15px;">
                ${renderedBody || ""}
              </div>
            </td>
          </tr>

          <tr>
            <td style="background:#D6DCE5; padding:18px 30px; color:#555;">
              <table width="100%">
                <tr>
                  <td align="left">
                    <strong>
                      © ${new Date().getFullYear()} ThinkCube Systems (Pvt) Ltd.<br/>
                      📞 0707884884 | 0722884884
                    </strong>
                    <br/>
                    <a href="https://www.winway.lk">www.winway.lk</a> |
                    <a href="https://www.884.lk">www.884.lk</a>
                  </td>
                  <td align="right" width="70">
                    <img src="${bottomLogo}" width="55" height="55" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  const previewHtml = useMemo(() => {
    if (!customers.length) return "";

    return generateLoyaltyCustomEmail(
      editorValue,
      customers[0],
      title,
      headerLogo,
      footerLogo,
    );
  }, [editorValue, customers, title]);

  /* ================= CSV UPLOAD ================= */
  const handleCsvUpload = async () => {
    try {
      const values = await uploadForm.validateFields();
      const file = values.customers?.[0]?.originFileObj;

      if (!file) {
        message.error("Please select a CSV file");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      if (values.filename?.trim()) {
        formData.append("filename", values.filename.trim());
      }

      if (values.mobile_override?.trim()) {
        formData.append("mobile_number", values.mobile_override.trim());
      }

      setLoading(true);

      const res = await axios.post(`${API_BASE}/csv-upload-process`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const rows = (res.data.data || []).map((row, index) => ({
        _rowId: `${Date.now()}-${index}`,
        ...row,
      }));

      const detectedMobileColumn =
        res.data.detected_columns?.mobile_column ||
        res.data.mobile_column ||
        "MobileNumber";

      setCustomers(rows);
      setFilteredCustomers(rows);
      setMobileColumn(detectedMobileColumn);

      setUploadedFileInfo({
        saved_file: res.data.saved_file || "-",
        user_provided_name:
          res.data.user_provided_name || values.filename || "-",
        saved_path: res.data.saved_path || "-",
        file_size_bytes: res.data.file_size_bytes || file.size || 0,
        upload_timestamp: res.data.upload_timestamp || "-",
      });

      if (rows.length > 0) {
        setVisibleColumns(
          Object.keys(rows[0]).filter(
            (key) => key !== "_rowId" && normalizeKey(key) !== normalizeKey(detectedMobileColumn),
          ),
        );
      }

      message.success(
        `CSV loaded (${res.data.total_rows || rows.length} rows)`,
      );

      uploadForm.resetFields();
      setStep(1);
    } catch (error) {
      console.error("Upload error:", error);

      const apiError =
        error.response?.data?.detail ||
        error.response?.data?.error ||
        "CSV upload failed";

      message.error(Array.isArray(apiError) ? "CSV upload failed" : apiError);
    } finally {
      setLoading(false);
    }
  };

  /* ================= SEARCH ================= */
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const search = searchText.toLowerCase();

    const filteredRows = customers.filter((row) => {
      const mobile = getCustomerMobileRaw(row);
      const email = getCustomerEmail(row);

      if (mobile?.toString().toLowerCase().includes(search)) return true;
      if (email?.toString().toLowerCase().includes(search)) return true;

      return visibleColumns.some((key) => {
        const value = getFieldValue(row, key);
        return value && value.toString().toLowerCase().includes(search);
      });
    });

    setFilteredCustomers(filteredRows);
  }, [customers, searchText, visibleColumns, mobileColumn]);

  /* ================= TABLE ================= */
  const dynamicColumns = useMemo(() => {
    return templateKeys
      .filter((key) => !isExcludedField(key) && visibleColumns.includes(key))
      .map((key) => ({
        title: key,
        key,
        render: (_, record) => {
          const value = getFieldValue(record, key);
          return value !== undefined && value !== null && value !== ""
            ? value.toString()
            : "-";
        },
      }));
  }, [templateKeys, visibleColumns, mobileColumn]);

  const columns = useMemo(() => {
    return [
      {
        title: "Mobile",
        key: "mobile",
        fixed: "left",
        width: 160,
        render: (_, record) => getCustomerMobileRaw(record) || "-",
      },
      {
        title: "Email",
        key: "email",
        width: 220,
        render: (_, record) => {
          const email = getCustomerEmail(record);
          return isValidEmail(email) ? email : <Tag color="orange">No Email</Tag>;
        },
      },
      ...dynamicColumns,
    ];
  }, [dynamicColumns, mobileColumn]);

  /* ================= CSV EXPORT ================= */
  const exportNoEmailCSV = () => {
    const csv = [
      ["Name", "Mobile", "Tier", "Email"].map(escapeCSV).join(","),
      ...noEmailList.map((customer) =>
        [
          customer.name,
          customer.mobile,
          customer.tier,
          customer.email,
        ]
          .map(escapeCSV)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "no-email-customers.csv";
    link.click();

    window.URL.revokeObjectURL(url);
  };

  /* ================= EMAIL SENDING ================= */
  const sendLoyaltyEmail = async (customer, index, subject, body, emailTitle) => {
    try {
      const customerEmail = getCustomerEmail(customer);

      const formData = new FormData();
      formData.append("to", customerEmail);
      formData.append(
        "name",
        `${getCustomerFirstName(customer)} ${getCustomerLastName(customer)}`.trim(),
      );
      formData.append("type", "loyalty_welcome");
      formData.append("number", index);
      formData.append("subject", subject);
      formData.append("body", body);
      formData.append("title", emailTitle);
      formData.append("customerData", JSON.stringify(customer));

      await axios.post(
        `${API_EMAIL}/email/loyality/custome-email`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      return { status: "success" };
    } catch (error) {
      console.error("❌ Loyalty Email Error:", error);
      return { status: "failed" };
    }
  };

  const handleSendLoyaltyEmails = async () => {
    try {
      await form.validateFields();

      const subject = form.getFieldValue("subject");

      if (!title.trim()) {
        message.error("Email title is required");
        return;
      }

      if (!editorValue.trim()) {
        message.error("Email body is required");
        return;
      }

      const targetCustomers = isTestMode
        ? filteredCustomers.slice(0, 1)
        : filteredCustomers;

      if (!targetCustomers.length) {
        message.warning("No customers found to send emails");
        return;
      }

      pausedRef.current = false;
      stoppedRef.current = false;
      setIsPaused(false);

      let success = 0;
      let noEmail = 0;
      let failed = 0;

      setTotalToSend(targetCustomers.length);
      setSentCount(0);
      setProgress(0);
      setLogList([]);
      setNoEmailList([]);
      setLogModalVisible(true);
      setSending(true);

      for (let index = 0; index < targetCustomers.length; index++) {
        if (stoppedRef.current) break;

        while (pausedRef.current && !stoppedRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 400));
        }

        if (stoppedRef.current) break;

        const customer = targetCustomers[index];
        const customerEmail = getCustomerEmail(customer);

        const customerName =
          `${getCustomerFirstName(customer)} ${getCustomerLastName(customer)}`.trim() ||
          "Valued Customer";

        const logId = customer._rowId || `${Date.now()}-${index}`;

        if (!isValidEmail(customerEmail)) {
          noEmail += 1;

          const noEmailCustomer = {
            name: customerName,
            mobile: getCustomerMobileRaw(customer),
            tier:
              getFieldValue(customer, "TIER") ||
              getFieldValue(customer, "Tier") ||
              "",
            email: customerEmail || "(empty/invalid)",
          };

          setNoEmailList((previous) => [...previous, noEmailCustomer]);

          setLogList((previous) => [
            ...previous,
            {
              id: logId,
              name: customerName,
              email: customerEmail || "(empty/invalid)",
              status: "no-email",
            },
          ]);

          setProgress(Math.round(((index + 1) / targetCustomers.length) * 100));
          continue;
        }

        setLogList((previous) => [
          ...previous,
          {
            id: logId,
            name: customerName,
            email: customerEmail,
            status: "sending",
          },
        ]);

        const result = await sendLoyaltyEmail(
          customer,
          index,
          subject,
          editorValue,
          title,
        );

        if (result.status === "success") {
          success += 1;
          setSentCount(success);
        } else {
          failed += 1;
        }

        setLogList((previous) =>
          previous.map((item) =>
            item.id === logId ? { ...item, status: result.status } : item,
          ),
        );

        setProgress(Math.round(((index + 1) / targetCustomers.length) * 100));

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      setSending(false);

      if (!stoppedRef.current) {
        message.success(
          `Email process completed. Success: ${success}, No Email: ${noEmail}, Failed: ${failed}`,
        );
      }
    } catch (error) {
      console.error(error);
      setSending(false);
    }
  };

  /* ================= NAVIGATION ================= */
  const goNext = async () => {
    if (step === 0) {
      if (!customers.length) {
        message.error("Please upload a CSV file first");
        return;
      }

      setStep(1);
      return;
    }

    if (step === 1) {
      setStep(2);
      return;
    }

    if (step === 2) {
      await handleSendLoyaltyEmails();
    }
  };

  const goBack = () => setStep((previous) => Math.max(previous - 1, 0));

  const handlePause = () => {
    pausedRef.current = true;
    setIsPaused(true);
  };

  const handleResume = () => {
    pausedRef.current = false;
    setIsPaused(false);
  };

  const handleStop = () => {
    stoppedRef.current = true;
    pausedRef.current = false;
    setIsPaused(false);
    setSending(false);
    setLogModalVisible(false);
    message.info("Email sending stopped.");
  };

  const successCount = logList.filter((item) => item.status === "success").length;
  const failCount = logList.filter((item) => item.status === "failed").length;
  const noEmailCount = logList.filter((item) => item.status === "no-email").length;

  /* ================= TEMPLATE ================= */
  const handleCashbackTemplateClick = () => {
    setShowMonthModal(true);
  };

  const handleMonthConfirm = () => {
    monthForm
      .validateFields()
      .then((values) => {
        const selectedMonth = dayjs(values.month);
        loadCashbackTemplate(selectedMonth.format("MMMM YYYY"));
        setShowMonthModal(false);
        monthForm.resetFields();
      })
      .catch((error) => {
        console.error("Validation failed:", error);
      });
  };

  const loadCashbackTemplate = (monthYear) => {
    form.setFieldsValue({
      subject: `Your WIN WAY Cashback for ${monthYear} Has Been Credited`,
    });

    setTitle("WIN WAY Cashback");

    const template = `
<p>We are pleased to inform you that your <strong>Rs. {{CASHBACK_AMOUNT}}.00 cashback for ${monthYear}</strong>, earned under the WIN WAY Loyalty Rewards Program, has been successfully credited to your WIN WAY Wallet.</p>
<p>Loyalty cashback amount is determined based on your monthly ticket purchases, allowing you to earn cashback and enjoy greater benefits each month.</p>
<p>Should you have any questions, please feel free to reach out to our support team at info@winway.lk or contact us directly at <strong>0707 884 884 | 0722 884 884</strong>.</p>
<p>Thank you for choosing WIN WAY. We truly appreciate your continued loyalty.</p>
<p>Best regards,<br/><strong>WIN WAY</strong><br/>National Lotteries Board</p>`;

    setEditorValue(template);
  };

  const resetForm = () => {
    form.resetFields();
    setTitle("");
    setEditorValue("");
    message.success("Form has been reset");
  };

  /* ================= RENDER ================= */
  return (
    <>
      <Row justify="space-between" align="middle" gutter={[16, 16]}>
        <Col>
          <Title level={3} style={{ marginBottom: 0 }}>
            Custom EMAIL Portal {isTestMode && "(TEST MODE)"}
          </Title>
        </Col>

        <Col>
          <Space>
            <Text strong>
              {isTestMode ? "TEST MODE ACTIVATED" : "LIVE MODE ACTIVATED"}
            </Text>
            <Switch checked={isTestMode} onChange={setIsTestMode} />
          </Space>
        </Col>
      </Row>

      <Divider />

      <Steps current={step} style={{ marginBottom: 24 }}>
        <Step title="Upload CSV" />
        <Step title="Review Customers" />
        <Step title="Compose & Send" />
      </Steps>

      {isTestMode && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Test mode is active"
          description="Only the first filtered customer will be processed when sending emails."
        />
      )}

      {/* STEP 0: UPLOAD CSV */}
      {step === 0 && (
        <Card>
          <Title level={4} style={{ marginBottom: 24 }}>
            Upload Customer CSV
          </Title>

          <Form form={uploadForm} layout="vertical" onFinish={handleCsvUpload}>
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="CSV File"
                  name="customers"
                  rules={[{ required: true, message: "Please upload a CSV file" }]}
                  valuePropName="fileList"
                  getValueFromEvent={(event) =>
                    Array.isArray(event) ? event : event?.fileList
                  }
                >
                  <Upload
                    accept=".csv"
                    maxCount={1}
                    beforeUpload={() => false}
                    showUploadList
                  >
                    <Button icon={<UploadOutlined />} block style={{ height: 40 }}>
                      Click to upload CSV
                    </Button>
                  </Upload>
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item
                  label="Save As"
                  name="filename"
                  rules={[{ required: true, message: "Filename is required" }]}
                >
                  <Input
                    placeholder="e.g., customer_data_jan2024"
                    suffix={<FileTextOutlined />}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item
                  label="Mobile Number Override (Optional)"
                  name="mobile_override"
                  tooltip="Override all mobile numbers with this value"
                >
                  <Input placeholder="e.g., 94771234567" />
                </Form.Item>
              </Col>

              <Col xs={24} md={12} style={{ display: "flex", alignItems: "flex-end" }}>
                <Form.Item style={{ marginBottom: 0, width: "100%" }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                    style={{ height: 40 }}
                  >
                    {loading ? "Processing..." : "Upload & Process CSV"}
                  </Button>
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>
      )}

      {/* STEP 1: REVIEW */}
      {step === 1 && customers.length > 0 && (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={4}>
              <Card hoverable style={{ ...cardBase, ...cardStyles.blue }}>
                <Statistic title="Customers" value={customers.length} />
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card hoverable style={{ ...cardBase, ...cardStyles.orange }}>
                <Statistic
                  title="Your Filename"
                  value={uploadedFileInfo?.user_provided_name || "-"}
                />
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card hoverable style={{ ...cardBase, ...cardStyles.green }}>
                <Statistic
                  title="File Saved As"
                  value={uploadedFileInfo?.saved_file || "-"}
                />
              </Card>
            </Col>

            <Col xs={24} md={4}>
              <Card hoverable style={{ ...cardBase, ...cardStyles.purple }}>
                <Statistic
                  title="Size"
                  value={`${((uploadedFileInfo?.file_size_bytes || 0) / 1024).toFixed(2)} KB`}
                />
              </Card>
            </Col>
          </Row>

          <Divider />

          <Card
            size="small"
            title="Available Dynamic Fields"
            style={{ marginBottom: 16, background: "#fafafa" }}
          >
            <Space wrap>
              {templateKeys
                .filter((key) => !isExcludedField(key))
                .map((key) => {
                  const active = visibleColumns.includes(key);

                  return (
                    <Tag
                      key={key}
                      color={active ? "blue" : "default"}
                      style={{ cursor: "pointer", userSelect: "none" }}
                      onClick={() =>
                        setVisibleColumns((previous) =>
                          previous.includes(key)
                            ? previous.filter((item) => item !== key)
                            : [...previous, key],
                        )
                      }
                    >
                      {key}
                    </Tag>
                  );
                })}
            </Space>

            <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
              Click a field to add or remove it from the table view.
            </Text>
          </Card>

          <Card size="small" style={{ marginBottom: 16, background: "#fafafa" }}>
            <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
              <Input.Search
                placeholder="Search customers, mobile, email, or any field..."
                allowClear
                enterButton
                style={{ maxWidth: 420 }}
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                onSearch={(value) => setSearchText(value)}
              />

              <Text type="secondary">
                Showing {filteredCustomers.length} result(s)
              </Text>
            </Space>
          </Card>

          <Table
            rowKey="_rowId"
            columns={columns}
            dataSource={filteredCustomers}
            pagination={{ pageSize: 100 }}
            scroll={{ x: "max-content" }}
          />
        </>
      )}

      {/* STEP 2: COMPOSE */}
      {step === 2 && (
        <Card>
          <Title level={4} style={{ marginBottom: 24 }}>
            Compose Email
          </Title>

          <Space wrap>
            <Button
              icon={<DollarCircleFilled />}
              onClick={handleCashbackTemplateClick}
            >
              Cash Back Template
            </Button>

            <Button icon={<ReloadOutlined />} onClick={resetForm}>
              Reset Form
            </Button>
          </Space>

          <Divider />

          <Modal
            title="Select Month for Template"
            open={showMonthModal}
            onOk={handleMonthConfirm}
            onCancel={() => setShowMonthModal(false)}
          >
            <Form form={monthForm} layout="vertical">
              <Form.Item
                name="month"
                label="Select Month and Year"
                rules={[{ required: true, message: "Please select month and year" }]}
              >
                <DatePicker
                  picker="month"
                  format="MMMM YYYY"
                  style={{ width: "100%" }}
                  placeholder="Select month and year"
                />
              </Form.Item>
            </Form>
          </Modal>

          <Row gutter={[20, 20]}>
            <Col xs={24} lg={8}>
              <Form form={form} layout="vertical">
                <Form.Item
                  label="Subject"
                  name="subject"
                  rules={[{ required: true, message: "Subject is required" }]}
                >
                  <Input />
                </Form.Item>

                <Form.Item label="Email Title" required>
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Enter email title"
                  />
                </Form.Item>

                <Form.Item label="Insert Dynamic Field">
                  <Select
                    showSearch
                    placeholder="Select field to insert"
                    onSelect={(value) =>
                      setEditorValue((previous) => `${previous} {{${value}}}`)
                    }
                  >
                    {templateKeys.map((key) => (
                      <Option key={key} value={key}>
                        {key}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item label="Email Body" required>
                  <EditorProvider>
                    <Editor
                      value={editorValue}
                      onChange={(event) => setEditorValue(event.target.value)}
                      style={{ height: 350, background: "#fff" }}
                    >
                      <Toolbar>
                        <BtnBold />
                        <BtnItalic />
                        <BtnUnderline />
                        <BtnStrikeThrough />
                        <BtnStyles />
                        <BtnBulletList />
                        <BtnNumberedList />
                        <BtnLink />
                        <BtnUndo />
                        <BtnRedo />
                        <BtnClearFormatting />
                      </Toolbar>
                    </Editor>
                  </EditorProvider>
                </Form.Item>
              </Form>
            </Col>

            <Col xs={24} lg={16}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                Email Preview
              </div>

              <iframe
                title="Email Preview"
                srcDoc={previewHtml}
                style={{
                  width: "100%",
                  height: 500,
                  border: "1px solid #ccc",
                  borderRadius: 8,
                  background: "white",
                }}
              />

              <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                Preview shows how the email will look for the first customer.
              </Text>
            </Col>
          </Row>
        </Card>
      )}

      {/* LOG MODAL */}
      <Modal
        open={logModalVisible}
        onCancel={handleStop}
        width={720}
        centered
        footer={null}
        title="Sending Custom Emails"
      >
        <Progress
          percent={progress}
          strokeWidth={10}
          status={sending ? "active" : "normal"}
          style={{ marginBottom: 26 }}
        />

        <Row gutter={[16, 16]} style={{ marginBottom: 26 }}>
          <Col span={6}>
            <Card bordered={false} style={{ ...cardBase, ...cardStyles.blue }}>
              <Statistic title="Total" value={totalToSend} />
            </Card>
          </Col>

          <Col span={6}>
            <Card bordered={false} style={{ ...cardBase, ...cardStyles.green }}>
              <Statistic
                title="Success"
                value={successCount}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: "#52c41a", fontWeight: 700 }}
              />
            </Card>
          </Col>

          <Col span={6}>
            <Card bordered={false} style={{ ...cardBase, ...cardStyles.orange }}>
              <Statistic
                title="No Email"
                value={noEmailCount}
                prefix={<MailOutlined />}
                valueStyle={{ color: "#fa8c16", fontWeight: 700 }}
              />
            </Card>
          </Col>

          <Col span={6}>
            <Card bordered={false} style={{ ...cardBase, ...cardStyles.blue }}>
              <Statistic
                title="Failed"
                value={failCount}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: "#f5222d", fontWeight: 700 }}
              />
            </Card>
          </Col>
        </Row>

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
                background:
                  item.status === "sending"
                    ? "rgba(123,47,247,0.08)"
                    : item.status === "success"
                      ? "rgba(82,196,26,0.1)"
                      : item.status === "no-email"
                        ? "rgba(250,173,20,0.14)"
                        : "rgba(255,77,79,0.1)",
              }}
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
                {item.status === "no-email" && (
                  <MailOutlined style={{ color: "#faad14" }} />
                )}

                <Text strong>{item.name}</Text>
                <Text type="secondary">{item.email || "No Email Available"}</Text>
              </Space>
            </List.Item>
          )}
          style={{
            maxHeight: 260,
            overflowY: "auto",
            borderRadius: 10,
            marginBottom: 22,
          }}
        />

        {noEmailList.length > 0 && (
          <>
            <Divider />

            <Title level={4} style={{ color: "#722ed1" }}>
              Customers Without Email ({noEmailList.length})
            </Title>

            <List
              size="small"
              bordered
              dataSource={noEmailList}
              renderItem={(item) => (
                <List.Item>
                  <Space>
                    <Text strong>{item.name}</Text>
                    <Text type="secondary">{item.mobile}</Text>
                    <Text type="secondary">({item.tier})</Text>
                  </Space>
                </List.Item>
              )}
              style={{
                maxHeight: 180,
                overflowY: "auto",
                background: "#fff7e6",
                borderRadius: 10,
              }}
            />

            <div style={{ textAlign: "center", marginTop: 16 }}>
              <Button onClick={exportNoEmailCSV} icon={<DownloadOutlined />}>
                Export No-Email List as CSV
              </Button>
            </div>
          </>
        )}

        {progress === 100 && !sending && (
          <Alert
            message="Email process completed"
            description={`Success: ${successCount}, No Email: ${noEmailCount}, Failed: ${failCount}`}
            type="success"
            showIcon
            style={{ marginTop: 22 }}
          />
        )}

        <Divider />

        <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
          {isPaused ? (
            <Button
              icon={<PlayCircleOutlined />}
              onClick={handleResume}
              size="large"
              type="primary"
              style={{ background: "#52c41a" }}
            >
              Resume
            </Button>
          ) : (
            <Button
              icon={<PauseCircleOutlined />}
              onClick={handlePause}
              size="large"
              style={{ background: "#faad14", color: "#fff" }}
              disabled={!sending}
            >
              Pause
            </Button>
          )}

          <Button icon={<StopOutlined />} size="large" onClick={handleStop} danger>
            Stop & Close
          </Button>
        </div>
      </Modal>

      <div
        style={{
          marginTop: 24,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Button disabled={step === 0 || sending} onClick={goBack}>
          Back
        </Button>

        <Button type="primary" onClick={goNext} loading={sending}>
          {step === 2 ? "Send Emails" : "Next"}
        </Button>
      </div>
    </>
  );
}

export default CustomEmails;