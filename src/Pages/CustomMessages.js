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

/* 🔁 SWITCH MODE HERE */

/* 🇱🇰 Sri Lanka number normalizer */

/* ================= COMPONENT ================= */
function CustomMessages() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [IS_TEST_MODE, Set_IS_TEST_MODE] = useState(true);

  /* Login */
  const [login, setLogin] = useState({
    username: "imesha@thinkcube.com",
    password: "wc%@08FG",
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  /* Customers */

  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [mobile_column, setMobileColoum] = useState("Mobile Number");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  // which dynamic columns are visible
  const [visibleColumns, setVisibleColumns] = useState([]);
  /* ================= WELCOME TEMPLATE STATE ================= */
  const [welcomeLang, setWelcomeLang] = useState("e");
  /* SMS */
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [totalToSend, setTotalToSend] = useState(0);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [sms, setSms] = useState({
    campaignName: "",
    mask: "TB Alert",
    content: "",
  });
  const transformValue = (key, value) => {
    if (!value) return "";

    // Gender → Mr / Ms mapping
    if (key.toLowerCase() === "gender") {
      const v = value.toString().toLowerCase();
      if (["male", "m"].includes(v)) return "Mr";
      if (["female", "f"].includes(v)) return "Ms";
      return "";
    }

    return value;
  };

  const toProperCase = (str = "") =>
    str
      .toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const applyTemplate = (template, customer) =>
    template.replace(/{{(.*?)}}/g, (_, key) => {
      if (key === "welcome_link") {
        const rawName =
          customer?.FirstName || customer?.Name || customer?.FIRSTNAME || "";

        const name = encodeURIComponent(toProperCase(rawName));
        const gender = encodeURIComponent(customer?.gender || "");

        return `https://notification.thoroughbreds.lk/?name=${name}&gender=${gender}`;
      }

      let rawValue =
        customer?.[key] ||
        customer?.[key.toUpperCase()] ||
        customer?.[key.toLowerCase()] ||
        customer?.FirstName ||
        customer?.FIRSTNAME ||
        customer?.Name ||
        "";

      if (key.toLowerCase() === "firstname") {
        rawValue = toProperCase(rawValue);
      }

      return transformValue(key, rawValue) ?? "";
    });
  const getSendNumber = (customer) => {
    console.log(customer);
    const mobile = normalizeLK(customer?.MOBILENUMBER);

    if (!mobile) {
      console.warn("Invalid mobile for customer:", customer);
    }

    return IS_TEST_MODE
      ? normalizeLK("0718553224")
      : normalizeLK(customer?.MOBILENUMBER);
  };

  /* ================= TEMPLATE UTILS ================= */
  const extractKeys = (obj, prefix = "") =>
    Object.entries(obj || {}).flatMap(([k, v]) =>
      typeof v === "object" && v !== null
        ? extractKeys(v, `${prefix}${k}.`)
        : `${prefix}${k}`,
    );
  const templateKeys = useMemo(
    () => (customers.length ? extractKeys(customers[0]) : []),
    [customers],
  );

  /* ================= LOGIN ================= */
  const handleLogin = async () => {
    if (!login.username || !login.password)
      return message.warning("Enter username and password");

    setLoading(true);
    try {
      await axios.post(`${API_SMS}/sms/login`, login);
      setIsLoggedIn(true);
      setStep(1);
      message.success("Login successful");
    } catch {
      message.error("Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!login.username || !login.password)
      return message.warning("Enter username and password");

    setLoading(true);
    try {
      await axios.post(`${API_SMS}/sms/refresh`);
      setIsLoggedIn(true);
      setStep(1);
      message.success("Login successful");
    } catch {
      message.error("Login failed");
    } finally {
      setLoading(false);
    }
  };
  const normalizeLK = (n) => {
    if (!n) return null;
    let num = n.toString().trim().replace(/\s+/g, "");
    if (num.startsWith("+94")) num = num.replace("+94", "94");
    if (num.startsWith("0")) num = "94" + num.slice(1);
    if (num.length === 9) num = "94" + num;
    return num.startsWith("94") && num.length === 11 ? num : null;
  };
  /* ================= WELCOME SMS TEMPLATE ================= */
  const getWelcomeTemplate = (lang) => {
    const templates = {
      e: `Hello {{gender}} {{FIRSTNAME}},

Welcome to winway!

Thank you for registering with us. To get started easily, please watch our quick guide video here:
{{welcome_link}}

If you need any assistance, our Customer Care team is ready to help you.
Call us on 0707 884 884 anytime.

- WIN WAY`,

      s: `{{FIRSTNAME}} {{gender}},

winway වෙත ඔබව සාදරයෙන් පිළිගනිමු!

අපගේ වෙබ් අඩවිය / App පහසුවෙන්ම භාවිතා කරන විදිහ ගැන දැනගන්න කෙටි මාර්ගෝපදේශ වීඩියෝව මෙතැනින් නරඹන්න:
{{welcome_link}}

ඔබට අපේ සහය අවශ්‍යනම් 0707 884 884 අංකයට ඕනෑම වේලාවක සම්බන්ධ වන්න.

- WIN WAY`,

      t: `{{FIRSTNAME}},

winway.lk க்கு வரவேற்கிறோம்!

எங்களுடன் பதிவு செய்ததற்கு நன்றி. எளிதாக தொடங்க, எங்கள் விரைவான வழிகாட்டி வீடியோவை இங்கே பார்க்கவும்:
{{welcome_link}}

உங்களுக்கு ஏதேனும் உதவி தேவைப்பட்டால், 0707 884 884 என்ற எண்ணில் எங்களை தொடர்பு கொள்ளவும்.

- WIN WAY`,
    };

    return templates[lang] || templates.e;
  };

  const getThoroughbredsTemplate = (lang) => {
    const templates = {
      e: `Dear Mr. {{FIRSTNAME}},

Thank you for purchasing a ticket for the Thoroughbreds – 147th Battle of the Blues.

To learn how to successfully claim your MATCH ticket through ROYAL THOMIAN Tickerting system, please refer to the following link and watch the 
{{welcome_link}}

If you require any assistance, please Message WhatsApp Support +9470 379 6655


Thank you.`,

      s: `Dear Mr. {{FIRSTNAME}},

Thank you for purchasing a ticket for the Thoroughbreds – 147th Battle of the Blues.

To learn how to successfully claim your MATCH ticket through ROYAL THOMIAN Tickerting system, please refer to the following link and watch the 
{{welcome_link}}

If you require any assistance, please Message WhatsApp Support +9470 379 6655


Thank you.`,

      t: `Dear Mr. {{FIRSTNAME}},

Thank you for purchasing a ticket for the Thoroughbreds – 147th Battle of the Blues.

To learn how to successfully claim your MATCH ticket through ROYAL THOMIAN Tickerting system, please refer to the following link and watch the 
{{welcome_link}}

If you require any assistance, please Message WhatsApp Support +9470 379 6655


Thank you.`,
    };

    return templates[lang] || templates.e;
  };

  /* ================= CARD UPLOADER ================= */
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

  useEffect(() => {
    if (!searchText) {
      setFilteredCustomers(customers);
      return;
    }

    const s = searchText.toLowerCase();

    const filtered = customers.filter((row) =>
      visibleColumns.some((key) => {
        const value = key.split(".").reduce((o, i) => (o ? o[i] : ""), row);

        return value && value.toString().toLowerCase().includes(s);
      }),
    );

    setFilteredCustomers(filtered);
  }, [customers, searchText, visibleColumns]);
  /* ================= CSV UPLOAD ================= */
  const handleCsvUpload = async ({ file }) => {
    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/csv-upload-process`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const rows = res.data.data || [];

      const cleanedRows = rows.map((row) => {
        if (row.FIRSTNAME) {
          const words = row.FIRSTNAME.trim().split(/\s+/);
          row.FIRSTNAME = words[words.length - 1]; // get last word
        }
        return row;
      });

      console.log(cleanedRows);

      setCustomers(cleanedRows);

      setFilteredCustomers(cleanedRows);

      // ✅ FIXED HERE
      setMobileColoum(
        res.data.detected_columns?.mobile_column || "MobileNumber",
      );

      if (rows.length > 0) {
        setVisibleColumns(Object.keys(rows[0]));
      }

      setSelectedCustomers([]);
      setSelectedRowKeys([]);

      message.success(`CSV loaded (${res.data.total_rows} rows)`);
    } catch (err) {
      console.error(err);
      message.error("CSV upload failed");
    } finally {
      setLoading(false);
    }
  };
  // Fields you DON'T want as table columns
  const EXCLUDED_FIELDS = ["id", "createdAt", "updatedAt", mobile_column];

  const dynamicColumns = useMemo(() => {
    return templateKeys
      .filter(
        (key) => !EXCLUDED_FIELDS.includes(key) && visibleColumns.includes(key),
      )
      .map((key) => ({
        title: key,
        dataIndex: key,
        key,
        render: (value) =>
          value !== undefined && value !== null ? value.toString() : "-",
      }));
  }, [templateKeys, visibleColumns, mobile_column]);

  const columns = useMemo(() => {
    return [
      {
        title: "Mobile",
        dataIndex: mobile_column,
        key: mobile_column,
        fixed: "left",
      },

      ...dynamicColumns,
    ];
  }, [dynamicColumns]);

  /* ================= COMPUTED ================= */

  const validNumbers = selectedCustomers
    .map((c) => normalizeLK(c.MobileNumber))
    .filter(Boolean);

  const smsCount = IS_TEST_MODE
    ? validNumbers.length > 0
      ? 1
      : 0
    : validNumbers.length;

  const step2Ready = customers.length && selectedCustomers.length;
  const step3Ready =
    sms.campaignName.trim() && sms.mask.trim() && sms.content.trim();

  /* ================= NAV ================= */
  const goNext = () => {
    if (step === 1 && !step2Ready)
      return message.warning("Select at least one customer");
    if (step === 2 && !step3Ready)
      return message.warning("Fill all SMS fields");
    setStep((s) => s + 1);
  };
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testNumber, setTestNumber] = useState("");
  const [testSending, setTestSending] = useState(false);

  const goBack = () => setStep((s) => s - 1);

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
        content: applyTemplate(sms.content, selectedCustomers[0]),
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
  const [sendingModalOpen, setSendingModalOpen] = useState(false);
  const [sendingNumbers, setSendingNumbers] = useState([]);
  const sendSms = async () => {
    if (!selectedCustomers.length)
      return message.warning("No customers selected");

    const targets = IS_TEST_MODE
      ? selectedCustomers.slice(0, 1)
      : selectedCustomers;

    setTotalToSend(targets.length);
    setSentCount(0);
    setSending(true);

    // OPEN MODAL
    setSendingNumbers([]);
    setSendingModalOpen(true);

    try {
      let count = 0;

      for (const c of targets) {
        const mobile = getSendNumber(c);

        if (!mobile) continue;

        // ADD NUMBER TO MODAL LIST
        setSendingNumbers((prev) => [...prev, mobile]);

        await axios.post(`${API_SMS}/sms/send`, {
          campaignName: sms.campaignName,
          mask: sms.mask,
          numbers: mobile,
          content: applyTemplate(sms.content, c),
        });

        count += 1;
        setSentCount(count);
      }

      message.success(
        IS_TEST_MODE
          ? "SMS sent successfully (TEST MODE)"
          : "All SMS sent successfully",
      );
    } catch (err) {
      message.error("Error occurred while sending SMS");
    } finally {
      setSending(false);
    }
  };

  /* ================= TABLE ================= */

  /* ================= UI ================= */
  return (
    <>
      <Card>
        <Title level={3}>SMS Portal {IS_TEST_MODE && "(TEST MODE)"}</Title>
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
              {IS_TEST_MODE ? "TEST MODE ACTIVATED" : "LIVE MODE ACTIVATED"}
            </span>

            <Switch checked={IS_TEST_MODE} onChange={Set_IS_TEST_MODE} />
          </div>
        </Col>
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
                          setLogin((p) => ({
                            ...p,
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
                          setLogin((p) => ({
                            ...p,
                            password: e.target.value,
                          }))
                        }
                      />
                    </Form.Item>

                    <Button
                      type="primary"
                      size="large"
                      block
                      loading={loading}
                      onClick={handleLogin}
                    >
                      Login & Continue
                    </Button>
                  </Form>
                </Space>
              </Card>
            </Col>
          </Row>
        )}

        {/* ================= STEP 2 ================= */}
        {step === 1 && (
          <Card>
            {/* ================= UPLOAD ================= */}
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

            {/* ================= DATA PART ================= */}
            {customers.length > 0 && (
              <>
                <Divider />

                {/* ===== STATS ===== */}
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic
                      title="Customers Loaded"
                      value={customers.length}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Selected Customers"
                      value={selectedCustomers.length}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Valid Numbers"
                      value={validNumbers.length}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic title="SMS Count" value={smsCount} />
                  </Col>
                </Row>

                <Divider />

                {/* ================= DYNAMIC FIELDS ================= */}
                <Card
                  size="small"
                  title="Available Dynamic Fields (Click to show / hide columns)"
                  style={{ marginBottom: 16, background: "#fafafa" }}
                >
                  <Space wrap>
                    {templateKeys
                      .filter((key) => !EXCLUDED_FIELDS.includes(key))
                      .map((key) => {
                        const active = visibleColumns.includes(key);

                        return (
                          <Tag
                            key={key}
                            color={active ? "blue" : "default"}
                            style={{ cursor: "pointer", userSelect: "none" }}
                            onClick={() =>
                              setVisibleColumns((prev) =>
                                prev.includes(key)
                                  ? prev.filter((k) => k !== key)
                                  : [...prev, key],
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
                    Click a field to add or remove it from the table view.
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
                    {/* 🔍 Global Search */}
                    <Input.Search
                      placeholder="Search customers, mobile, or any field..."
                      allowClear
                      enterButton
                      style={{ maxWidth: 420 }}
                      onChange={(e) => setSearchText(e.target.value)}
                    />

                    {/* Optional helper text / count */}
                    <Text type="secondary">
                      Showing {filteredCustomers.length} result(s)
                    </Text>
                  </Space>

                  <Text
                    type="secondary"
                    style={{ display: "block", marginTop: 8 }}
                  >
                    Type to search across all visible columns.
                  </Text>
                </Card>

                {/* ================= TABLE ================= */}
                <Table
                  rowKey={(record, index) =>
                    `${record[mobile_column]}-${index}`
                  }
                  columns={columns}
                  dataSource={filteredCustomers}
                  rowSelection={{
                    selectedRowKeys,
                    onChange: (k, r) => {
                      console.log(r, k);
                      setSelectedRowKeys(k);
                      setSelectedCustomers(r);
                    },
                  }}
                  pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: filteredCustomers.length,
                    showSizeChanger: true,
                    pageSizeOptions: ["10", "20", "50", "200"],
                    showQuickJumper: true,
                    showTotal: (total, range) =>
                      `${range[0]}-${range[1]} of ${total} customers`,
                    onChange: (page, pageSize) => {
                      setPagination({
                        current: page,
                        pageSize: pageSize,
                      });
                    },
                  }}
                  scroll={{ x: "max-content" }}
                />
              </>
            )}
          </Card>
        )}

        {/* ================= STEP 3 ================= */}
        {step === 2 && (
          <Card>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="Selected Customers"
                  value={selectedCustomers.length}
                />
              </Col>
            </Row>
            <Divider />
            <Row gutter={24}>
              <Col span={14}>
                <Form layout="vertical">
                  <Form.Item label="Campaign Name">
                    <Input
                      value={sms.campaignName}
                      onChange={(e) =>
                        setSms((p) => ({
                          ...p,
                          campaignName: e.target.value,
                        }))
                      }
                    />
                  </Form.Item>

                  <Form.Item label="Mask">
                    <Input
                      value={sms.mask}
                      onChange={(e) =>
                        setSms((p) => ({ ...p, mask: e.target.value }))
                      }
                    />
                  </Form.Item>
                  {/* ================= WELCOME TEMPLATE SECTION ================= */}
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
                        setSms((p) => ({
                          ...p,
                          content: getWelcomeTemplate(welcomeLang),
                        }))
                      }
                    >
                      Load Welcome SMS Template
                    </Button>
                  </Form.Item>
                  <Button
                    type="dashed"
                    block
                    onClick={() =>
                      setSms((p) => ({
                        ...p,
                        content: getThoroughbredsTemplate(welcomeLang),
                      }))
                    }
                  >
                    Load SMS Template
                  </Button>
                  <Divider />
                  <Form.Item label="Insert Dynamic Field">
                    <Select
                      onSelect={(v) =>
                        setSms((p) => ({
                          ...p,
                          content: `${p.content} {{${v}}}`,
                        }))
                      }
                    >
                      {templateKeys.map((k) => (
                        <Option key={k}>{k}</Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    label={`Message (${sms.content.length} characters)`}
                  >
                    <Input.TextArea
                      rows={6}
                      value={sms.content}
                      onChange={(e) =>
                        setSms((p) => ({ ...p, content: e.target.value }))
                      }
                    />
                  </Form.Item>
                </Form>
              </Col>

              <Col span={10}>
                <Card size="small" title="📱 SMS Preview">
                  {selectedCustomers.length ? (
                    <Alert
                      type="info"
                      showIcon
                      message={applyTemplate(
                        sms.content || "Start typing...",
                        selectedCustomers[0],
                      )}
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

        {/* ================= STEP 4 ================= */}
        {step === 3 && (
          <Card>
            {IS_TEST_MODE && (
              <Alert
                type="warning"
                showIcon
                message="TEST MODE ACTIVE"
                description="Only one SMS will be sent"
                style={{ marginBottom: 16 }}
              />
            )}

            <Row gutter={16}>
              <Col span={6}>
                <Statistic title="Customers Loaded" value={customers.length} />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Selected Customers"
                  value={selectedCustomers.length}
                />
              </Col>
              <Col span={6}>
                <Statistic title="Valid Numbers" value={validNumbers.length} />
              </Col>
              <Col span={6}>
                <Statistic title="SMS Count" value={smsCount} />
              </Col>
            </Row>

            <Divider />

            {/* ===== PROGRESS ===== */}
            {sending && (
              <>
                <Text strong>
                  Sending SMS {sentCount} / {totalToSend}
                </Text>

                <Progress
                  percent={Math.round((sentCount / totalToSend) * 100)}
                  status="active"
                  style={{ marginTop: 8, marginBottom: 16 }}
                />
              </>
            )}
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button
                type="default"
                size="large"
                block
                onClick={() => setTestModalOpen(true)}
                disabled={sending}
              >
                🧪 Test Run (Custom Number)
              </Button>

              <Button
                type="primary"
                size="large"
                block
                loading={sending}
                disabled={sending}
                onClick={() => sendSms()}
              >
                {sending ? "Sending..." : "Run Campaign"}
              </Button>
            </Space>
          </Card>
        )}

        {/* ================= FOOTER ================= */}
        <Divider />
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
              help="Supports 07XXXXXXXX, +94XXXXXXXXX"
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

{step !== 0 && (
        <><Space style={{ width: "100%", justifyContent: "space-between" }}>
          <Button disabled={step === 0} onClick={goBack}>
            Back
          </Button>

          {step < 3 && (
            <Button type="primary" onClick={goNext}>
              Next
            </Button>
          )}
        </Space>
        </>
)}

        
      </Card>

      <Modal
        title="📨 Sending SMS Numbers"
        open={sendingModalOpen}
        onCancel={() => setSendingModalOpen(false)}
        footer={null}
        width={500}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text strong>Total Sent: {sendingNumbers.length}</Text>

          <div
            style={{
              maxHeight: 350,
              overflowY: "auto",
              border: "1px solid #eee",
              padding: 10,
              borderRadius: 6,
              background: "#fafafa",
            }}
          >
            {sendingNumbers.map((num, i) => (
              <Tag
                key={i}
                color="blue"
                style={{ marginBottom: 6, fontSize: 14 }}
              >
                {num}
              </Tag>
            ))}
          </div>
        </Space>
      </Modal>
    </>
  );
}

export default CustomMessages;
