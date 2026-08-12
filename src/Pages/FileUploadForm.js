import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Input,
  Statistic,
  Tooltip,
  Space,
  Tag,
} from "antd";
import {
  LoadingOutlined,
  FileZipOutlined,
  FileTextOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  EditOutlined,
  CheckCircleTwoTone,
  GiftOutlined,
  CrownOutlined,
  TeamOutlined,
  PhoneOutlined,
  SaveOutlined,
  TrophyOutlined,
  WalletOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import axios from "axios";
import ResultsView from "./ResultsView";
import logo from "../assets/logo.png";
import { getSettings, saveSettingsGroup } from "../api/endPoints";
import { ENV } from "../config/env";

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;
const API_BASE = ENV.REACT_APP_API_BASE_PY;

function FileUploadForm() {
  // ---------------- STATE ----------------
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState({});
  const [lotteryPrizes, setLotteryPrizes] = useState({});
  const [numCustomers, setNumCustomers] = useState("");
  const [mobileNumber, setMobileNumber] = useState(""); // ✅ new input
  const [editingPrize, setEditingPrize] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [lastGenerated, setLastGenerated] = useState(null);
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const rawDate = settings?.LastUpdatedPrizes;

  const formattedDate = rawDate
    ? new Date(rawDate).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Colombo",
      })
    : "N/A";

  const saveSettingGroup = async (group) => {
    try {
      setSaving(true);

      await saveSettingsGroup(group);

      message.success("Settings saved successfully");
    } catch (err) {
      console.error(err);
      message.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // 🔄 Load settings from backend
  const fetchSettings = async () => {
    try {
      setLoading(true);

      const settingsArray = await getSettings();
      const map = Object.fromEntries(
        settingsArray.data.data.map((s) => [s.key, s.value]),
      );

      setSettings(map);
      setLotteryPrizes({
        AdaSampatha: map.AdaSampatha,
        DhanaNidhanaya: map.DhanaNidhanaya,
        Govisetha: map.Govisetha,
        Handahana: map.Handahana,
        MahajanaSampatha: map.MahajanaSampatha,
        MegaPower: map.MegaPower,
        NLBJaya: map.NLBJaya,
        SubaDawasak: map.SubaDawasak,
      });
      console.log(map);
    } catch (err) {
      message.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };
  // ---------------- LOCAL STORAGE ----------------
  useEffect(() => {
    const savedPrizes = localStorage.getItem("lotteryPrizes");
    const savedNum = localStorage.getItem("numCustomers");
    if (savedPrizes) setLotteryPrizes(JSON.parse(savedPrizes));
    if (savedNum) setNumCustomers(savedNum);
  }, []);
  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    localStorage.setItem("lotteryPrizes", JSON.stringify(lotteryPrizes));
  }, [lotteryPrizes]);

  useEffect(() => {
    if (numCustomers) localStorage.setItem("numCustomers", numCustomers);
  }, [numCustomers]);

  // ---------------- COMPUTATIONS ----------------
  const totalPrizePool = useMemo(
    () =>
      Object.values(lotteryPrizes)
        .map((v) => parseInt(v) || 0)
        .reduce((a, b) => a + b, 0),
    [lotteryPrizes],
  );

  const maxPrize = useMemo(
    () =>
      Math.max(...Object.values(lotteryPrizes).map((v) => parseInt(v) || 0)),
    [lotteryPrizes],
  );

  // ---------------- HANDLERS ----------------
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
    setEditingPrize(null);
    setResults(null);
    setProgress(0);
    setError(null);
    setLastGenerated(null);
    setNumCustomers("");
    setMobileNumber("");
    message.info("Form reset successfully");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleNextFromPrizes = () => {
    const missingPrize = Object.values(lotteryPrizes).some(
      (val) => !val.trim() || parseInt(val) <= 0,
    );
    if (missingPrize) {
      message.warning("⚠️ Please fill valid prize values for all lotteries!");
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ✅ Updated handleSubmit
  const handleSubmit = async () => {
    console.log(files);

    if (!files.ticket_sales || !files.prizes || !files.customers) {
      message.warning("⚠️ Please upload all required files before proceeding!");
      return;
    }

    const formData = new FormData();
    Object.entries(files).forEach(([key, file]) => formData.append(key, file));
    formData.append("lottery_prizes", JSON.stringify(lotteryPrizes));
    formData.append("num_customers", numCustomers);
    let formattedMobile = mobileNumber;
    if (formattedMobile) {
      if (mobileNumber.startsWith("0")) {
        // 0712345678 → +94712345678
        formattedMobile = "+94" + mobileNumber.slice(1);
      } else if (mobileNumber.startsWith("94")) {
        // 94712345678 → +94712345678
        formattedMobile = "+" + mobileNumber;
      } else if (mobileNumber.startsWith("+94")) {
        formattedMobile = mobileNumber || "";
      } else if (
        !mobileNumber.startsWith("0") &&
        !mobileNumber.startsWith("94")
      ) {
        formattedMobile = "+94" + mobileNumber;
      } else {
        // keep original
        formattedMobile = mobileNumber || "";
      }
    }

    formData.append("mobile_number", formattedMobile);

    try {
      setLoading(true);
      setError(null);
      setProgress(0);

      const res = await axios.post(`${API_BASE}/upload-files/`, formData, {
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((100 * e.loaded) / e.total));
        },
      });

      setResults(res.data);
      setStep(3);
      setLastGenerated(new Date().toLocaleString());
      message.success("✅ Files processed successfully!");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      setError("❌ Error uploading files or running pipeline!");
      message.error("Error during processing!");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- REUSABLE UPLOAD ----------------
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
            <div style={{ position: "relative" }}>
              {hasFile && (
                <CheckCircleTwoTone
                  twoToneColor="#52c41a"
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    fontSize: 20,
                    zIndex: 10,
                  }}
                />
              )}
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
            </div>
          </Form.Item>
        </Card>
      );
    },
    [files, handleChange, handleRemove],
  );

  // ---------------- RENDER ----------------
  return (
    <>
      {/* STEP 1 - Prize setup */}
      {step === 1 && (
        <>
          <Spin
            spinning={loading}
            indicator={<LoadingOutlined spin />}
            tip="Processing..."
          />
          <Title level={3} style={{ textAlign: "left" }}>
            Update Lottery Super Prizes
          </Title>
          <Divider />
          <Row gutter={[18, 18]} className="lottery-summary-row">
            <Col xs={24} sm={12} lg={8}>
              <Card
                bordered={false}
                className="lottery-summary-card lottery-summary-blue"
              >
                <div className="lottery-summary-content">
                  <div className="lottery-summary-icon lottery-summary-icon-blue">
                    <WalletOutlined />
                  </div>

                  <Statistic
                    title="Total Prize Pool"
                    value={Number(totalPrizePool || 0)}
                    prefix="Rs."
                    formatter={(value) =>
                      Number(value || 0).toLocaleString("en-GB")
                    }
                    valueStyle={{
                      color: "#1677ff",
                      fontWeight: 800,
                    }}
                  />
                </div>

                <Text className="lottery-summary-footer">
                  Combined value of all configured prizes
                </Text>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={8}>
              <Card
                bordered={false}
                className="lottery-summary-card lottery-summary-orange"
              >
                <div className="lottery-summary-content">
                  <div className="lottery-summary-icon lottery-summary-icon-orange">
                    <CrownOutlined />
                  </div>

                  <Statistic
                    title="Highest Prize"
                    value={Number(maxPrize || 0)}
                    prefix="Rs."
                    formatter={(value) =>
                      Number(value || 0).toLocaleString("en-GB")
                    }
                    valueStyle={{
                      color: "#fa8c16",
                      fontWeight: 800,
                    }}
                  />
                </div>

                <Text className="lottery-summary-footer">
                  Largest super prize currently available
                </Text>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={8}>
              <Card
                bordered={false}
                className="lottery-summary-card lottery-summary-green"
              >
                <div className="lottery-summary-content">
                  <div className="lottery-summary-icon lottery-summary-icon-green">
                    <GiftOutlined />
                  </div>

                  <Statistic
                    title="Total Lotteries"
                    value={Object.keys(lotteryPrizes || {}).length}
                    valueStyle={{
                      color: "#389e0d",
                      fontWeight: 800,
                    }}
                  />
                </div>

                <Text className="lottery-summary-footer">
                  Number of lottery prize configurations
                </Text>
              </Card>
            </Col>
          </Row>{" "}
          <Divider />
          <Row gutter={[24, 24]}>
            <Card
              headStyle={{
                background: "#001529",
                color: "#fff",
                fontWeight: "600",
                borderRadius: "10px 10px 0 0",
              }}
              title="Super Prize Amounts"
              extra={
                <Space size="middle">
                  {/* Optional Refresh */}
                  <Tooltip title="Refresh latest values">
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={fetchSettings} // <-- your existing reload function
                    />
                  </Tooltip>

                  {/* Save Button */}
                  <Button
                    icon={<SaveOutlined />}
                    type="primary"
                    loading={saving}
                    onClick={() =>
                      saveSettingGroup({
                        AdaSampatha: lotteryPrizes.AdaSampatha,
                        DhanaNidhanaya: lotteryPrizes.DhanaNidhanaya,
                        Govisetha: lotteryPrizes.Govisetha,
                        Handahana: lotteryPrizes.Handahana,
                        MahajanaSampatha: lotteryPrizes.MahajanaSampatha,
                        MegaPower: lotteryPrizes.MegaPower,
                        NLBJaya: lotteryPrizes.NLBJaya,
                        SubaDawasak: lotteryPrizes.SubaDawasak,
                        LastUpdatedPrizes: new Date().toISOString(),
                      })
                    }
                  >
                    Save
                  </Button>
                </Space>
              }
            >
              <Row gutter={[20, 20]}>
                {lotteryPrizes &&
                  Object.entries(lotteryPrizes).map(([prize, value]) => {
                    return (
                      <Col xs={24} sm={12} md={8} lg={6} key={prize}>
                        <Card hoverable bordered={false}>
                          {/* Header */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 12,
                            }}
                          >
                            <Text>{prize}</Text>
                          </div>

                          {/* Body */}
                          <>
                            <Input
                              autoFocus
                              size="large"
                              prefix="Rs."
                              value={Number(value || 0).toLocaleString()}
                              onChange={(e) => {
                                const val = e.target.value.replace(
                                  /[^\d]/g,
                                  "",
                                );
                                setLotteryPrizes({
                                  ...lotteryPrizes,
                                  [prize]: val,
                                });
                              }}
                              style={{
                                fontSize: 18,
                                textAlign: "center",
                                borderRadius: 10,
                              }}
                            />
                          </>
                        </Card>
                      </Col>
                    );
                  })}
              </Row>
            </Card>
          </Row>
          <div style={{ textAlign: "center", marginTop: 30 }}>
            <Button
              type="primary"
              size="large"
              icon={<ArrowRightOutlined />}
              onClick={handleNextFromPrizes}
            >
              Proceed to File Uploads
            </Button>
          </div>
        </>
      )}

      {/* STEP 2 - Upload */}
      {step === 2 && (
        <>
          <div style={{ position: "relative" }}>
            <Spin
              spinning={loading}
              indicator={<LoadingOutlined spin />}
              tip="Processing..."
            >
              <Title level={3} style={{ textAlign: "left" }}>
                Upload Files & Specify Customers
              </Title>

              <Divider />
              <Row gutter={[24, 24]} justify="center">
                <Col xs={24} lg={20}>
                  <Form layout="vertical">
                    {/* File Uploads */}
                    <Row gutter={[12, 12]} justify="center">
                      <Col xs={24} sm={12} md={8}>
                        {renderUpload(
                          "Ticket Sales (.zip)",
                          "ticket_sales",
                          ".zip",
                          <FileZipOutlined style={{ color: "#1890ff" }} />,
                          "Ticket Sales attached",
                        )}
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        {renderUpload(
                          "Prize Data (.zip)",
                          "prizes",
                          ".zip",
                          <FileZipOutlined style={{ color: "#722ed1" }} />,
                          "Prize Data attached",
                        )}
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        {renderUpload(
                          "Customers (.csv)",
                          "customers",
                          ".csv",
                          <FileTextOutlined style={{ color: "#fa8c16" }} />,
                          "Customer list attached",
                        )}
                      </Col>
                    </Row>

                    {/* ✅ New Input Fields */}
                    <Row gutter={[12, 12]} justify="center">
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item
                          label={
                            <Text strong>Number of Customers to Include</Text>
                          }
                          style={{ marginTop: 20 }}
                        >
                          <Input
                            type="number"
                            min={1}
                            value={numCustomers}
                            onChange={(e) => setNumCustomers(e.target.value)}
                            prefix={<TeamOutlined />}
                            placeholder="e.g. 500"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8}>
                        <Form.Item
                          label={
                            <Text strong>
                              Filter by Mobile Number (Optional)
                            </Text>
                          }
                          style={{ marginTop: 20 }}
                        >
                          <Input
                            type="text"
                            value={mobileNumber}
                            onChange={(e) => setMobileNumber(e.target.value)}
                            prefix={<PhoneOutlined />}
                            placeholder="e.g. +94779488015"
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    {/* Alerts / Progress */}
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

                    {lastGenerated && (
                      <div style={{ textAlign: "center", marginTop: 10 }}>
                        <Text type="secondary">
                          🕒 Last generated on: {lastGenerated}
                        </Text>
                      </div>
                    )}

                    {/* Buttons */}
                    <div style={{ textAlign: "center", marginTop: 30 }}>
                      <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={() => setStep(1)}
                        style={{ marginRight: 10 }}
                      >
                        Back
                      </Button>

                      <Button
                        type="primary"
                        size="large"
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{ marginRight: 10 }}
                      >
                        {loading ? (
                          <>
                            <LoadingOutlined /> Generating...
                          </>
                        ) : (
                          "Generate Emails"
                        )}
                      </Button>

                      <Button
                        icon={<ReloadOutlined />}
                        danger
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
        </>
      )}

      {/* STEP 3 - Results */}
      {step === 3 && results && (
        <>
          <Title level={3} style={{ textAlign: "left" }}>
            Results
          </Title>

          <Divider />
          <ResultsView results={results} lotteryPrizes={lotteryPrizes} />
          <div style={{ textAlign: "center", marginTop: 25 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => setStep(2)}
              style={{ marginRight: 10 }}
            >
              Back to Uploads
            </Button>
            <Button type="primary" onClick={handleReset}>
              Start Over
            </Button>
          </div>
        </>
      )}
      <style>
        {`
         
         .lottery-summary-row {
  margin-bottom: 24px;
}

.lottery-summary-card {
  position: relative;
  height: 100%;
  min-height: 150px;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 18px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.07);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    border-color 0.25s ease;
}

.lottery-summary-card::after {
  position: absolute;
  top: -32px;
  right: -32px;
  width: 105px;
  height: 105px;
  content: "";
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
}

.lottery-summary-card:hover {
  transform: translateY(-4px);
  border-color: rgba(22, 119, 255, 0.2);
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.12);
}

.lottery-summary-card .ant-card-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  padding: 22px;
}

.lottery-summary-blue {
  background: linear-gradient(
    135deg,
    #ffffff 0%,
    #edf6ff 100%
  );
}

.lottery-summary-orange {
  background: linear-gradient(
    135deg,
    #ffffff 0%,
    #fff4e6 100%
  );
}

.lottery-summary-green {
  background: linear-gradient(
    135deg,
    #ffffff 0%,
    #effbea 100%
  );
}

.lottery-summary-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.lottery-summary-icon {
  display: flex;
  flex: 0 0 54px;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  font-size: 23px;
  border-radius: 16px;
}

.lottery-summary-icon-blue {
  color: #1677ff;
  background: #dbeafe;
}

.lottery-summary-icon-orange {
  color: #fa8c16;
  background: #ffedd5;
}

.lottery-summary-icon-green {
  color: #389e0d;
  background: #dcfce7;
}

.lottery-summary-card .ant-statistic {
  min-width: 0;
}

.lottery-summary-card .ant-statistic-title {
  margin-bottom: 5px;
  color: #64748b;
  font-size: 13px;
  font-weight: 650;
}

.lottery-summary-card .ant-statistic-content {
  overflow-wrap: anywhere;
  font-size: clamp(22px, 2.2vw, 29px);
  line-height: 1.25;
}

.lottery-summary-card .ant-statistic-content-prefix {
  margin-right: 5px;
  font-size: 16px;
}

.lottery-summary-footer {
  display: block;
  margin-top: 18px;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 576px) {
  .lottery-summary-card {
    min-height: 135px;
  }

  .lottery-summary-card .ant-card-body {
    padding: 18px;
  }

  .lottery-summary-icon {
    flex-basis: 47px;
    width: 47px;
    height: 47px;
    font-size: 20px;
    border-radius: 14px;
  }

  .lottery-summary-card .ant-statistic-content {
    font-size: 22px;
  }

  .lottery-summary-footer {
    margin-top: 14px;
  }
}
        `}
      </style>
    </>
  );
}

export default FileUploadForm;
