import React, { useEffect, useMemo, useState } from "react";
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
  Switch,
} from "antd";
import axios from "axios";
import { UploadOutlined } from "@ant-design/icons";
import { ENV } from "../config/env";
const { Title, Text } = Typography;
const { Step } = Steps;
const { Option } = Select;

/* ================= CONFIG ================= */



const API_BASE = ENV.REACT_APP_API_BASE_PY;
const API_SMS = ENV.API_BASE_LOCAL;
/* ================= HELPERS ================= */

// Sri Lanka mobile normalizer
const normalizeLK = (number) => {
  if (!number) return null;

  let num = number
    .toString()
    .trim()
    .replace(/[^\d+]/g, "");

  // Remove .0 issue from Excel numbers
  num = num.replace(/\.0$/, "");

  if (num.startsWith("+94")) {
    num = "94" + num.slice(3);
  }

  if (num.startsWith("0094")) {
    num = "94" + num.slice(4);
  }

  if (num.startsWith("0")) {
    num = "94" + num.slice(1);
  }

  // Example: 718553224 -> 94718553224
  if (num.length === 9 && num.startsWith("7")) {
    num = "94" + num;
  }

  // Valid format: 947XXXXXXXX
  if (/^947\d{8}$/.test(num)) {
    return num;
  }

  return null;
};

const toProperCase = (str = "") =>
  str
    .toString()
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

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

  // Exact key
  const exactValue = getNestedValue(customer, key);
  if (exactValue !== undefined && exactValue !== null && exactValue !== "") {
    return exactValue;
  }

  // Case-insensitive / space-insensitive key match
  const wanted = normalizeKey(key);
  const foundKey = Object.keys(customer).find(
    (k) => normalizeKey(k) === wanted,
  );

  return foundKey ? customer[foundKey] : "";
};

const extractKeys = (obj, prefix = "") =>
  Object.entries(obj || {}).flatMap(([key, value]) => {
    if (key === "_rowId") return [];

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return extractKeys(value, `${prefix}${key}.`);
    }

    return `${prefix}${key}`;
  });

const transformValue = (key, value) => {
  if (value === undefined || value === null) return "";

  const keyName = key.toString().toLowerCase();
  const textValue = value.toString().trim();

  // Gender → Mr / Ms mapping
  if (keyName === "gender") {
    const v = textValue.toLowerCase();

    if (["male", "m", "mr", "sir"].includes(v)) return "Mr";
    if (["female", "f", "ms", "mrs", "miss"].includes(v)) return "Ms";

    return "";
  }

  return textValue;
};

/* ================= COMPONENT ================= */
function CustomSMS() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [isTestMode, setIsTestMode] = useState(true);

  /* Login */
  const [login, setLogin] = useState({
    username: "chamika@winway.lk",
    password: "iq_!85PB",
  });

  /* Customers */
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [mobileColumn, setMobileColumn] = useState("MobileNumber");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [visibleColumns, setVisibleColumns] = useState([]);

  /* Welcome template */
  const [welcomeLang, setWelcomeLang] = useState("e");

  /* SMS */
  const [sms, setSms] = useState({
    campaignName: "",
    mask: "WIN WAY",
    content: "",
  });

  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [totalToSend, setTotalToSend] = useState(0);
  const [currentNumber, setCurrentNumber] = useState("");
  const [startTime, setStartTime] = useState(null);

  /* Test modal */
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testNumber, setTestNumber] = useState("");
  const [testSending, setTestSending] = useState(false);

  const templateKeys = useMemo(() => {
    return customers.length ? extractKeys(customers[0]) : [];
  }, [customers]);

  const getCustomerMobileRaw = (customer) => {
    if (!customer) return "";

    const possibleMobileKeys = [
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
      "ContactNumber",
      "CONTACTNUMBER",
    ];

    for (const key of possibleMobileKeys) {
      const value = getFieldValue(customer, key);
      if (value) return value;
    }

    return "";
  };

  const getCustomerMobile = (customer) => {
    return normalizeLK(getCustomerMobileRaw(customer));
  };

  const getCustomerFirstName = (customer) => {
    return (
      getFieldValue(customer, "FIRSTNAME") ||
      getFieldValue(customer, "FirstName") ||
      getFieldValue(customer, "First Name") ||
      getFieldValue(customer, "Name") ||
      getFieldValue(customer, "NAME") ||
      ""
    );
  };

  const getCustomerGender = (customer) => {
    return (
      getFieldValue(customer, "GENDER") ||
      getFieldValue(customer, "Gender") ||
      getFieldValue(customer, "gender") ||
      ""
    );
  };

  const applyTemplate = (template, customer = {}) => {
    return (template || "").replace(/{{(.*?)}}/g, (_, rawKey) => {
      const key = rawKey.trim();

      if (key === "welcome_link") {
        const rawName = getCustomerFirstName(customer);
        const name = encodeURIComponent(toProperCase(rawName));

        const gender = encodeURIComponent(
          transformValue("gender", getCustomerGender(customer)),
        );

        return `https://support.winwaylottery.lk/?name=${name}&gender=${gender}`;
      }

      const rawValue = getFieldValue(customer, key);
      return transformValue(key, rawValue);
    });
  };

  /* ================= LOGIN ================= */
  const handleLogin = async () => {
    if (!login.username || !login.password) {
      return message.warning("Enter username and password");
    }

    setLoading(true);

    try {
      await axios.post(`${API_SMS}/sms/login`, login);
      setStep(1);
      message.success("Login successful");
    } catch (err) {
      console.error(err);
      message.error("Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);

    try {
      await axios.post(`${API_SMS}/sms/refresh`);
      message.success("Session refreshed");
    } catch (err) {
      console.error(err);
      message.error("Refresh failed");
    } finally {
      setLoading(false);
    }
  };

  /* ================= WELCOME SMS TEMPLATE ================= */
  const getWelcomeTemplate = (lang) => {
    const templates = {
      e: `Hello {{GENDER}} {{FIRSTNAME}},

Welcome to WIN WAY!

Thank you for registering with us. To get started easily, please watch our quick guide video here:
{{welcome_link}}

If you need any assistance, our Customer Care team is ready to help you.
Call us on 0707 884 884 anytime.

- Team WIN WAY`,

      s: `{{FIRSTNAME}} {{GENDER}},

WIN WAY වෙත ඔබව සාදරයෙන් පිළිගනිමු!

අපගේ වෙබ් අඩවිය / App පහසුවෙන්ම භාවිතා කරන විදිහ ගැන දැනගන්න කෙටි මාර්ගෝපදේශ වීඩියෝව මෙතැනින් නරඹන්න:
{{welcome_link}}

ඔබට අපේ සහය අවශ්‍යනම් 0707 884 884 අංකයට ඕනෑම වේලාවක සම්බන්ධ වන්න.

- Team WIN WAY`,

      t: `{{FIRSTNAME}},

winway.lk க்கு வரவேற்கிறோம்!

எங்களுடன் பதிவு செய்ததற்கு நன்றி. எளிதாக தொடங்க, எங்கள் விரைவான வழிகாட்டி வீடியோவை இங்கே பார்க்கவும்:
{{welcome_link}}

உங்களுக்கு ஏதேனும் உதவி தேவைப்பட்டால், 0707 884 884 என்ற எண்ணில் எங்களை தொடர்பு கொள்ளவும்.

- Team WIN WAY`,
    };

    return templates[lang] || templates.e;
  };

  /* ================= CSV UPLOAD ================= */
  const handleCsvUpload = async ({ file, onSuccess, onError }) => {
    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/csv-upload-process`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const rows = (res.data.data || []).map((row, index) => ({
        _rowId: `${index}-${Date.now()}`,
        ...row,
      }));

      const detectedMobileColumn =
        res.data.detected_columns?.mobile_column || "MobileNumber";

      setMobileColumn(detectedMobileColumn);
      setCustomers(rows);
      setFilteredCustomers(rows);

      if (rows.length > 0) {
        setVisibleColumns(
          Object.keys(rows[0]).filter(
            (key) => key !== "_rowId" && key !== detectedMobileColumn,
          ),
        );
      }

      setSelectedCustomers([]);
      setSelectedRowKeys([]);

      message.success(
        `CSV loaded (${res.data.total_rows || rows.length} rows)`,
      );
      onSuccess?.("ok");
    } catch (err) {
      console.error(err);
      message.error("CSV upload failed");
      onError?.(err);
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

    const filtered = customers.filter((row) => {
      const mobile = getCustomerMobileRaw(row);

      if (mobile?.toString().toLowerCase().includes(search)) {
        return true;
      }

      return visibleColumns.some((key) => {
        const value = getFieldValue(row, key);
        return value && value.toString().toLowerCase().includes(search);
      });
    });

    setFilteredCustomers(filtered);
  }, [customers, searchText, visibleColumns, mobileColumn]);

  /* ================= COMPUTED ================= */
  const excludedFields = useMemo(() => {
    return [
      "_rowId",
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
  }, [mobileColumn]);

  const dynamicColumns = useMemo(() => {
    return templateKeys
      .filter(
        (key) =>
          !excludedFields.some(
            (excluded) => normalizeKey(excluded) === normalizeKey(key),
          ) && visibleColumns.includes(key),
      )
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
  }, [templateKeys, visibleColumns, excludedFields]);

  const columns = useMemo(() => {
    return [
      {
        title: "Mobile",
        key: "mobile",
        fixed: "left",
        width: 160,
        render: (_, record) => getCustomerMobileRaw(record) || "-",
      },
      ...dynamicColumns,
    ];
  }, [dynamicColumns, mobileColumn]);

  const validNumbers = useMemo(() => {
    return selectedCustomers
      .map((customer) => getCustomerMobile(customer))
      .filter(Boolean);
  }, [selectedCustomers, mobileColumn]);

  const smsCount = isTestMode
    ? validNumbers.length > 0
      ? 1
      : 0
    : validNumbers.length;

  const step2Ready = customers.length > 0 && selectedCustomers.length > 0;

  const step3Ready =
    sms.campaignName.trim() && sms.mask.trim() && sms.content.trim();

  const progressPercent = totalToSend
    ? Math.round(((sentCount + failedCount) / totalToSend) * 100)
    : 0;

  const elapsedSeconds = startTime
    ? Math.max((Date.now() - startTime) / 1000, 1)
    : 1;

  const processedCount = sentCount + failedCount;
  const smsPerSecond = processedCount / elapsedSeconds;

  const etaSeconds =
    smsPerSecond > 0
      ? Math.round((totalToSend - processedCount) / smsPerSecond)
      : 0;

  /* ================= NAVIGATION ================= */
  const goNext = () => {
    if (step === 1 && !step2Ready) {
      return message.warning("Select at least one customer");
    }

    if (step === 2 && !step3Ready) {
      return message.warning("Fill campaign name, mask, and message");
    }

    setStep((previous) => previous + 1);
  };

  const goBack = () => {
    setStep((previous) => Math.max(previous - 1, 0));
  };

  /* ================= SEND TEST SMS ================= */
  const handleSendTestSms = async () => {
    const mobile = normalizeLK(testNumber);

    if (!mobile) {
      return message.error("Enter a valid Sri Lankan mobile number");
    }

    if (!sms.content || !sms.mask || !sms.campaignName) {
      return message.warning("Fill campaign name, mask, and message first");
    }

    setTestSending(true);

    try {
      await axios.post(`${API_SMS}/sms/send`, {
        campaignName: sms.campaignName,
        mask: sms.mask,
        numbers: mobile,
        content: applyTemplate(sms.content, selectedCustomers[0] || {}),
      });

      message.success(`Test SMS sent to ${mobile}`);
      setTestModalOpen(false);
      setTestNumber("");
    } catch (err) {
      console.error(err);
      message.error("Test SMS failed");
    } finally {
      setTestSending(false);
    }
  };

  /* ================= SEND CAMPAIGN ================= */
  const sendSms = async () => {
    if (!selectedCustomers.length) {
      return message.warning("No customers selected");
    }

    if (!step3Ready) {
      return message.warning("Fill campaign name, mask, and message");
    }

    const targets = isTestMode
      ? selectedCustomers.slice(0, 1)
      : selectedCustomers;

    setTotalToSend(targets.length);
    setSentCount(0);
    setFailedCount(0);
    setCurrentNumber("");
    setSending(true);
    setStartTime(Date.now());

    let success = 0;
    let failed = 0;

    for (const customer of targets) {
      const mobile = isTestMode
        ? normalizeLK("0718553224")
        : getCustomerMobile(customer);

      if (!mobile) {
        failed += 1;
        setFailedCount(failed);
        continue;
      }

      setCurrentNumber(mobile);

      try {
        await axios.post(`${API_SMS}/sms/send`, {
          campaignName: sms.campaignName,
          mask: sms.mask,
          numbers: mobile,
          content: applyTemplate(sms.content, customer),
        });

        success += 1;
        setSentCount(success);
      } catch (err) {
        console.error(err);
        failed += 1;
        setFailedCount(failed);
      }
    }

    setSending(false);
    setCurrentNumber("");

    if (failed > 0) {
      message.warning(
        `Campaign completed. Success: ${success}, Failed: ${failed}`,
      );
    } else {
      message.success("Campaign completed successfully");
    }
  };

  /* ================= UPLOAD CARD ================= */
  const renderUpload = (title, accept, icon, text, onUpload) => (
    <Upload accept={accept} showUploadList={false} customRequest={onUpload}>
      <Card
        hoverable
        style={{
          textAlign: "center",
          borderRadius: 12,
          height: 140,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
          <Text strong>{title}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {text}
          </Text>
        </div>
      </Card>
    </Upload>
  );

  return (
    <Card>
      <Row justify="space-between" align="middle" gutter={[16, 16]}>
        <Col>
          <Title level={3} style={{ marginBottom: 0 }}>
            SMS Portal {isTestMode && "(TEST MODE)"}
          </Title>
        </Col>

        <Col>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 14px",
              borderRadius: 12,
              background: isTestMode
                ? "linear-gradient(90deg,#fff7e6,#fff1b8)"
                : "linear-gradient(90deg,#e6f4ff,#bae0ff)",
              border: `1px solid ${isTestMode ? "#ffd591" : "#91caff"}`,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 0.3,
                color: isTestMode ? "#d46b08" : "#0958d9",
              }}
            >
              {isTestMode ? "TEST MODE ACTIVATED" : "LIVE MODE ACTIVATED"}
            </span>

            <Switch checked={isTestMode} onChange={setIsTestMode} />
          </div>
        </Col>
      </Row>

      <Divider />

      <Steps current={step} style={{ marginBottom: 24 }}>
        <Step title="Login" />
        <Step title="Customer Selection" />
        <Step title="SMS Compose" />
        <Step title="Send" />
      </Steps>

      {/* ================= STEP 1 : LOGIN ================= */}
      {step === 0 && (
        <Row justify="center" align="middle" style={{ minHeight: "60vh" }}>
          <Col xs={24} sm={20} md={14} lg={10}>
            <Card
              style={{
                borderRadius: 12,
                boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
              }}
            >
              <Space direction="vertical" size={24} style={{ width: "100%" }}>
                <div style={{ textAlign: "center" }}>
                  <Title level={3}>SMS Gateway Login</Title>
                  <Text type="secondary">Authenticate to continue</Text>
                </div>

                <Form layout="vertical">
                  <Form.Item label="Username">
                    <Input
                      size="large"
                      value={login.username}
                      onChange={(e) =>
                        setLogin((previous) => ({
                          ...previous,
                          username: e.target.value,
                        }))
                      }
                    />
                  </Form.Item>

                  <Form.Item label="Password">
                    <Input.Password
                      size="large"
                      value={login.password}
                      onChange={(e) =>
                        setLogin((previous) => ({
                          ...previous,
                          password: e.target.value,
                        }))
                      }
                    />
                  </Form.Item>

                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Button
                      type="primary"
                      size="large"
                      block
                      loading={loading}
                      onClick={handleLogin}
                    >
                      Login & Continue
                    </Button>

                    <Button
                      size="large"
                      block
                      loading={loading}
                      onClick={handleRefresh}
                    >
                      Refresh Session
                    </Button>
                  </Space>
                </Form>
              </Space>
            </Card>
          </Col>
        </Row>
      )}

      {/* ================= STEP 2 : CUSTOMER SELECTION ================= */}
      {step === 1 && (
        <Card>
          <Row justify="center">
            <Col>
              {renderUpload(
                "Customer CSV (.csv)",
                ".csv",
                <UploadOutlined style={{ color: "#52c41a" }} />,
                customers.length ? "CSV Uploaded" : "Click to upload CSV",
                handleCsvUpload,
              )}
            </Col>
          </Row>

          {customers.length > 0 && (
            <>
              <Divider />

              <Row gutter={[16, 16]}>
                <Col xs={24} md={6}>
                  <Statistic
                    title="Customers Loaded"
                    value={customers.length}
                  />
                </Col>
                <Col xs={24} md={6}>
                  <Statistic
                    title="Selected Customers"
                    value={selectedCustomers.length}
                  />
                </Col>
                <Col xs={24} md={6}>
                  <Statistic
                    title="Valid Numbers"
                    value={validNumbers.length}
                  />
                </Col>
                <Col xs={24} md={6}>
                  <Statistic title="SMS Count" value={smsCount} />
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
                    .filter(
                      (key) =>
                        !excludedFields.some(
                          (excluded) =>
                            normalizeKey(excluded) === normalizeKey(key),
                        ),
                    )
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

                <Text
                  type="secondary"
                  style={{ display: "block", marginTop: 8 }}
                >
                  Click a field to show or hide it from the table.
                </Text>
              </Card>

              <Card
                size="small"
                style={{ marginBottom: 16, background: "#fafafa" }}
              >
                <Space
                  wrap
                  style={{ width: "100%", justifyContent: "space-between" }}
                >
                  <Input.Search
                    placeholder="Search customers, mobile, or any field..."
                    allowClear
                    enterButton
                    style={{ maxWidth: 420 }}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onSearch={(value) => setSearchText(value)}
                  />

                  <Text type="secondary">
                    Showing {filteredCustomers.length} result(s)
                  </Text>
                </Space>
              </Card>

              <Space style={{ marginBottom: 12 }}>
                <Button
                  type="primary"
                  onClick={() => {
                    const allKeys = filteredCustomers.map(
                      (customer) => customer._rowId,
                    );
                    setSelectedRowKeys(allKeys);
                    setSelectedCustomers(filteredCustomers);
                  }}
                >
                  Select All Customers
                </Button>

                <Button
                  danger
                  onClick={() => {
                    setSelectedRowKeys([]);
                    setSelectedCustomers([]);
                  }}
                >
                  Clear Selection
                </Button>
              </Space>

              <Table
                rowKey="_rowId"
                columns={columns}
                dataSource={filteredCustomers}
                rowSelection={{
                  selectedRowKeys,
                  preserveSelectedRowKeys: true,
                  onChange: (keys, rows) => {
                    setSelectedRowKeys(keys);
                    setSelectedCustomers(rows);
                  },
                }}
                pagination={{ pageSize: 10 }}
                scroll={{ x: "max-content" }}
              />
            </>
          )}
        </Card>
      )}

      {/* ================= STEP 3 : SMS COMPOSE ================= */}
      {step === 2 && (
        <Card>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={6}>
              <Statistic
                title="Selected Customers"
                value={selectedCustomers.length}
              />
            </Col>
            <Col xs={24} md={6}>
              <Statistic title="Valid Numbers" value={validNumbers.length} />
            </Col>
          </Row>

          <Divider />

          <Row gutter={[24, 24]}>
            <Col xs={24} lg={14}>
              <Form layout="vertical">
                <Form.Item label="Campaign Name">
                  <Input
                    value={sms.campaignName}
                    onChange={(e) =>
                      setSms((previous) => ({
                        ...previous,
                        campaignName: e.target.value,
                      }))
                    }
                  />
                </Form.Item>

                <Form.Item label="Mask">
                  <Input
                    value={sms.mask}
                    onChange={(e) =>
                      setSms((previous) => ({
                        ...previous,
                        mask: e.target.value,
                      }))
                    }
                  />
                </Form.Item>

                <Divider />

                <Form.Item label="Load WinWay Welcome Template">
                  <Select
                    value={welcomeLang}
                    onChange={setWelcomeLang}
                    style={{ marginBottom: 10 }}
                  >
                    <Option value="e">English</Option>
                    <Option value="s">Sinhala</Option>
                    <Option value="t">Tamil</Option>
                  </Select>

                  <Button
                    type="dashed"
                    block
                    onClick={() =>
                      setSms((previous) => ({
                        ...previous,
                        content: getWelcomeTemplate(welcomeLang),
                      }))
                    }
                  >
                    Load Welcome SMS Template
                  </Button>
                </Form.Item>

                <Divider />

                <Form.Item label="Insert Dynamic Field">
                  <Select
                    placeholder="Select field to insert"
                    onSelect={(value) =>
                      setSms((previous) => ({
                        ...previous,
                        content: `${previous.content} {{${value}}}`,
                      }))
                    }
                  >
                    {templateKeys.map((key) => (
                      <Option key={key} value={key}>
                        {key}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item label={`Message (${sms.content.length} characters)`}>
                  <Input.TextArea
                    rows={8}
                    value={sms.content}
                    onChange={(e) =>
                      setSms((previous) => ({
                        ...previous,
                        content: e.target.value,
                      }))
                    }
                  />
                </Form.Item>
              </Form>
            </Col>

            <Col xs={24} lg={10}>
              <Card size="small" title="📱 SMS Preview">
                {selectedCustomers.length ? (
                  <Alert
                    type="info"
                    showIcon
                    message={
                      <pre
                        style={{
                          whiteSpace: "pre-wrap",
                          margin: 0,
                          fontFamily: "inherit",
                        }}
                      >
                        {applyTemplate(
                          sms.content || "Start typing...",
                          selectedCustomers[0],
                        )}
                      </pre>
                    }
                  />
                ) : (
                  <Alert
                    type="warning"
                    showIcon
                    message="Select a customer to preview"
                  />
                )}
              </Card>
            </Col>
          </Row>
        </Card>
      )}

      {/* ================= STEP 4 : SEND ================= */}
      {step === 3 && (
        <Card>
          {isTestMode && (
            <Alert
              type="warning"
              showIcon
              message="TEST MODE ACTIVE"
              description="Only one SMS will be sent to your fixed test number: 0718553224"
              style={{ marginBottom: 16 }}
            />
          )}

          <Row gutter={[16, 16]}>
            <Col xs={24} md={6}>
              <Statistic title="Customers Loaded" value={customers.length} />
            </Col>
            <Col xs={24} md={6}>
              <Statistic
                title="Selected Customers"
                value={selectedCustomers.length}
              />
            </Col>
            <Col xs={24} md={6}>
              <Statistic title="Valid Numbers" value={validNumbers.length} />
            </Col>
            <Col xs={24} md={6}>
              <Statistic title="SMS Count" value={smsCount} />
            </Col>
          </Row>

          <Divider />

          <Card style={{ marginTop: 16, background: "#fafafa" }}>
            <Space direction="vertical" style={{ width: "100%" }} size={12}>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={6}>
                  <Statistic title="Sent" value={sentCount} />
                </Col>
                <Col xs={24} md={6}>
                  <Statistic title="Failed" value={failedCount} />
                </Col>
                <Col xs={24} md={6}>
                  <Statistic title="Total" value={totalToSend} />
                </Col>
                <Col xs={24} md={6}>
                  <Statistic
                    title="Success Rate"
                    value={
                      totalToSend
                        ? Math.round((sentCount / totalToSend) * 100)
                        : 0
                    }
                    suffix="%"
                  />
                </Col>
              </Row>

              <Progress
                percent={progressPercent}
                status={sending ? "active" : "normal"}
              />

              <Text>
                📤 Sending to: <b>{currentNumber || "Preparing..."}</b>
              </Text>

              {startTime && (
                <Text type="secondary">
                  ⏱ Speed: {smsPerSecond.toFixed(2)} SMS/sec | ETA:{" "}
                  {Math.max(0, etaSeconds)} sec
                </Text>
              )}
            </Space>
          </Card>

          <Divider />

          <Space style={{ width: "100%", justifyContent: "flex-end" }} wrap>
            <Button
              size="large"
              onClick={() => setTestModalOpen(true)}
              disabled={sending}
            >
              🧪 Test Run (Custom Number)
            </Button>

            <Button
              type="primary"
              size="large"
              loading={sending}
              disabled={sending || !smsCount}
              onClick={sendSms}
            >
              {sending ? "Sending..." : "Run Campaign"}
            </Button>
          </Space>
        </Card>
      )}

      {/* ================= TEST MODAL ================= */}
      <Modal
        title="🧪 Test SMS"
        open={testModalOpen}
        onCancel={() => setTestModalOpen(false)}
        onOk={handleSendTestSms}
        okText="Send Test SMS"
        confirmLoading={testSending}
        centered
      >
        <Form layout="vertical">
          <Form.Item
            label="Mobile Number"
            required
            help="Supports 07XXXXXXXX, +94XXXXXXXXX, or 947XXXXXXXX"
          >
            <Input
              placeholder="0712345678"
              value={testNumber}
              onChange={(e) => setTestNumber(e.target.value)}
            />
          </Form.Item>

          <Text type="secondary">
            This will send <b>only one SMS</b> to the entered number.
          </Text>
        </Form>
      </Modal>

      {/* ================= FOOTER ================= */}
      <Divider />

      {step !== 0 && (
        <Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Button disabled={step === 0 || sending} onClick={goBack}>
            Back
          </Button>

          {step < 3 && (
            <Button type="primary" onClick={goNext}>
              Next
            </Button>
          )}
        </Space>
      )}
    </Card>
  );
}

export default CustomSMS;
