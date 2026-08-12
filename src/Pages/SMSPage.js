import React, { useMemo, useState } from "react";
import {
  Card,
  Input,
  Button,
  Form,
  message,
  Typography,
  Row,
  Col,
  Steps,
  Modal,
  Table,
  Tag,
  Select,
  Space,
  Statistic,
  Alert,
} from "antd";
import axios from "axios";
import {
  TeamOutlined,
  TrophyOutlined,
  GiftOutlined,
  RiseOutlined,
} from "@ant-design/icons";

import { ENV } from "../config/env";
const API_BASE = ENV.API_BASE_LOCAL;

const { Title, Text } = Typography;
const { Step } = Steps;
const { Option } = Select;


/* =====================================================
   🔁 TEST / LIVE SWITCH (ONLY CHANGE THIS)
===================================================== */
const IS_TEST_MODE = true;

/* 🇱🇰 Sri Lanka number normalizer */

const normalizeLK = (n) => {
  if (!n) return null;
  let num = n.toString().trim().replace(/\s+/g, "");

  if (num.startsWith("+94")) num = num.replace("+94", "94");
  if (num.startsWith("0")) num = "94" + num.substring(1);
  if (num.length === 9) num = "94" + num;

  return num.startsWith("94") && num.length === 11 ? num : null;
};

/* 🔥 ONE PLACE TO DECIDE NUMBER */
const getSendNumber = (customer) =>
  IS_TEST_MODE ? normalizeLK("0718553224") : normalizeLK(customer.MobileNumber);

/* 🔁 Extract ALL nested keys */
const extractKeys = (obj, prefix = "") => {
  let keys = [];
  Object.entries(obj || {}).forEach(([k, v]) => {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null) {
      keys = keys.concat(extractKeys(v, fullKey));
    } else {
      keys.push(fullKey);
    }
  });
  return keys;
};

/* 🔁 Apply {{template}} */
const applyTemplate = (template, customer) => {
  return template.replace(/{{(.*?)}}/g, (_, key) => {
    return key.split(".").reduce((o, i) => (o ? o[i] : ""), customer) || "";
  });
};

function SMSPage({ loyaltyCustomers = [] }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  /* 🔐 Login */
  const [login, setLogin] = useState({
    username: "",
    password: "",
  });

  /* ✉️ SMS (NO numbers here) */
  const [sms, setSms] = useState({
    campaignName: "",
    mask: "WIN WAY",
    content: "",
  });

  /* 📦 Modal + selection */
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectedTier, setSelectedTier] = useState("");
  const [searchText, setSearchText] = useState("");
  const [tierFilter, setTierFilter] = useState("ALL");

  /* 🔐 LOGIN */
  const handleLogin = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/sms/login`, login);
      message.success("Login successful");
      setStep(1);
    } catch {
      message.error("Login failed");
    } finally {
      setLoading(false);
    }
  };

  /* 🎨 Tier styles */
  const tierColors = {
    Platinum: "#7b2ff7",
    Gold: "#facc15",
    Silver: "#9ca3af",
    Blue: "#2563eb",
  };

  const tierColorsFade = {
    Platinum: "linear-gradient(145deg, #f3e8ff, #ffffff)",
    Gold: "linear-gradient(145deg, #fff8e1, #ffffff)",
    Silver: "linear-gradient(145deg, #f5f5f5, #ffffff)",
    Blue: "linear-gradient(145deg, #e3f2fd, #ffffff)",
  };

  const tierIcons = {
    Platinum: <TrophyOutlined />,
    Gold: <GiftOutlined />,
    Silver: <RiseOutlined />,
    Blue: <TeamOutlined />,
  };
  const recipientCount = useMemo(() => {
    if (IS_TEST_MODE) return selectedCustomers.length ? 1 : 0;
    return selectedCustomers.length;
  }, [selectedCustomers]);

  /* 🔍 FILTERED CUSTOMERS */
  const filteredCustomers = useMemo(() => {
    const s = searchText.toLowerCase();
    return loyaltyCustomers.filter((c) => {
      const name = `${c.CustomerInfo?.FirstName || ""} ${
        c.CustomerInfo?.LastName || ""
      }`.toLowerCase();
      const tier = c.CustomerInfo?.Current_Loyalty_Tier || "";
      return (
        (!s || name.includes(s)) &&
        (tierFilter === "ALL" || tier === tierFilter)
      );
    });
  }, [loyaltyCustomers, searchText, tierFilter]);

  /* 📊 MODAL SUMMARY */
  const modalSummary = useMemo(() => {
    const s = { Platinum: 0, Gold: 0, Silver: 0, Blue: 0 };
    filteredCustomers.forEach((c) => {
      const t = c.CustomerInfo?.Current_Loyalty_Tier;
      if (s[t] !== undefined) s[t]++;
    });
    return s;
  }, [filteredCustomers]);

  /* 🔽 TEMPLATE KEYS */
  const templateKeys = useMemo(() => {
    if (!loyaltyCustomers.length) return [];
    return extractKeys(loyaltyCustomers[0]);
  }, [loyaltyCustomers]);

  /* 📦 Selection helpers */
  const selectAllFiltered = () => {
    setSelectedRowKeys(loyaltyCustomers.map((c) => c.MobileNumber));
    setSelectedCustomers(loyaltyCustomers);
  };

  const clearSelection = () => {
    setSelectedRowKeys([]);
    setSelectedCustomers([]);
  };

  const filterByTier = (tier = "") => {
    setTierFilter(tier || "ALL");
    setSelectedTier(tier);
  };

  const confirmSelection = () => {
    if (!selectedCustomers.length) {
      message.warning("Select at least one customer");
      return;
    }
    setModalOpen(false);
  };

  /* 📤 SEND SMS */
  const sendSms = async () => {
    if (!sms.campaignName || !sms.mask || !sms.content) {
      return message.warning("Fill all SMS fields");
    }

    if (!selectedCustomers.length) {
      return message.warning("No recipients selected");
    }

    setLoading(true);
    try {
      console.log(selectedCustomers);

      for (const c of selectedCustomers) {
        const mobile = getSendNumber(c);
        if (!mobile) continue;

        const personalizedMsg = applyTemplate(sms.content, c);

        await axios.post(`${API_BASE}/sms/send`, {
          campaignName: sms.campaignName,
          mask: sms.mask,
          numbers: mobile,
          content: personalizedMsg,
        });
      }

      message.success(
        IS_TEST_MODE
          ? "SMS sent in TEST MODE (0718553224)"
          : "SMS sent successfully"
      );
    } catch {
      message.error("SMS sending failed");
    } finally {
      setLoading(false);
    }
  };

  /* 📞 SHOW NUMBERS SEPARATELY (READ-ONLY) */
  const displayedNumbers = IS_TEST_MODE
    ? ["0718553224"]
    : selectedCustomers.map((c) => normalizeLK(c.MobileNumber)).filter(Boolean);

  /* 📋 TABLE */
  const columns = [
    {
      title: "Customer",
      render: (_, r) =>
        `${r.CustomerInfo?.FirstName || ""} ${r.CustomerInfo?.LastName || ""}`,
    },
    {
      title: "Tier",
      render: (_, r) => {
        const t = r.CustomerInfo?.Current_Loyalty_Tier || "None";
        return <Tag color={tierColors[t]}>{t}</Tag>;
      },
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys, rows) => {
      setSelectedRowKeys(keys);
      setSelectedCustomers(rows);
    },
  };

  return (
    <Card>
      <Title level={3}>     sdadasdasd {IS_TEST_MODE && "(TEST MODE)"}</Title>

      <Steps current={step} style={{ marginBottom: 24 }}>
        <Step title="Login" />
        <Step title="Compose & Send" />
      </Steps>

      {step === 0 && (
        <Form layout="vertical" style={{ maxWidth: 420 }}>
          <Form.Item label="Username">
            <Input
              value={login.username}
              onChange={(e) => setLogin({ ...login, username: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="Password">
            <Input.Password
              value={login.password}
              onChange={(e) => setLogin({ ...login, password: e.target.value })}
            />
          </Form.Item>
          <Button type="primary" block loading={loading} onClick={handleLogin}>
            Login & Continue
          </Button>
        </Form>
      )}

      {step === 1 && (
        <Row gutter={16}>
          <Col span={14}>
            <Form layout="vertical">
              <Form.Item label="Campaign Name">
                <Input
                  value={sms.campaignName}
                  onChange={(e) =>
                    setSms({ ...sms, campaignName: e.target.value })
                  }
                />
              </Form.Item>

              <Form.Item label="Mask">
                <Input
                  value={sms.mask}
                  onChange={(e) => setSms({ ...sms, mask: e.target.value })}
                />
              </Form.Item>

              <Button onClick={() => setModalOpen(true)}>
                Select Loyalty Customers
              </Button>

              {/* 📞 NUMBERS SHOWN SEPARATELY */}
              <Form.Item label="Recipients (Read Only)">
                <Input.TextArea
                  rows={3}
                  readOnly
                  value={displayedNumbers.join(", ")}
                />
              </Form.Item>

              <Form.Item label="Insert Dynamic Field">
                <Select
                  showSearch
                  placeholder="Select a field"
                  onSelect={(v) =>
                    setSms((p) => ({
                      ...p,
                      content: `${p.content} {{${v}}}`,
                    }))
                  }
                >
                  {templateKeys.map((k) => (
                    <Option key={k} value={k}>
                      {k}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item label="Message">
                <Input.TextArea
                  rows={5}
                  value={sms.content}
                  onChange={(e) => setSms({ ...sms, content: e.target.value })}
                />
              </Form.Item>
              <Form.Item>
                <Card
                  size="small"
                  style={{
                    background: IS_TEST_MODE
                      ? "linear-gradient(145deg, #fff3cd, #ffffff)"
                      : "linear-gradient(145deg, #e3f2fd, #ffffff)",
                    border: IS_TEST_MODE
                      ? "1px solid #facc15"
                      : "1px solid #90caf9",
                  }}
                >
                  <Text strong>📤 Messages will be sent to:</Text>

                  <div style={{ marginTop: 6 }}>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: IS_TEST_MODE ? "#d97706" : "#2563eb",
                      }}
                    >
                      {recipientCount}
                    </Text>{" "}
                    <Text>customer(s)</Text>
                  </div>

                  {IS_TEST_MODE && (
                    <div style={{ marginTop: 4 }}>
                      <Tag color="gold">TEST MODE</Tag>
                      <Text type="secondary">
                        All messages go to 0718553224
                      </Text>
                    </div>
                  )}
                </Card>
              </Form.Item>

              <Button type="primary" loading={loading} onClick={sendSms}>
                Send Loyalty SMS
              </Button>
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
                    selectedCustomers[0]
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
      )}

      {/* MODAL */}
      <Modal
        open={modalOpen}
        width={1100}
        title="Select Loyalty Customers"
        onOk={confirmSelection}
        onCancel={() => setModalOpen(false)}
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {["Platinum", "Gold", "Silver", "Blue"].map((tier) => (
            <Col span={6} key={tier}>
              <Card
                onClick={() =>
                  selectedTier === tier ? filterByTier() : filterByTier(tier)
                }
                style={{
                  cursor: "pointer",
                  border:
                    selectedTier === tier
                      ? `1px solid ${tierColors[tier]}`
                      : "1px solid #eee",
                  background:
                    selectedTier === tier ? tierColorsFade[tier] : "#fff",
                }}
              >
                <Statistic
                  title={tier}
                  value={modalSummary[tier]}
                  prefix={tierIcons[tier]}
                  valueStyle={{ color: tierColors[tier] }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        <Row justify="space-between" style={{ marginBottom: 12 }}>
          <Input.Search
            placeholder="Search by name"
            style={{ width: 300 }}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Space>
            <Button onClick={selectAllFiltered}>
              Select All ({loyaltyCustomers.length})
            </Button>
            <Button danger onClick={clearSelection}>
              Clear
            </Button>
          </Space>
        </Row>

        <Table
          rowKey="MobileNumber"
          columns={columns}
          dataSource={filteredCustomers}
          rowSelection={rowSelection}
        />
      </Modal>
    </Card>
  );
}

export default SMSPage;
