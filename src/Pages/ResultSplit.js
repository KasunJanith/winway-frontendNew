import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  List,
  message,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileSearchOutlined,
  FileZipOutlined,
  SafetyCertificateOutlined,
  ScissorOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  validateWinning,
  splitWinning,
  getLatestOrderDate,
  getWinningSessionByDate,
} from "./api/index";
import { formatDate } from "../utils/dateUtils";

const { Title, Text } = Typography;

const ResultSplit = () => {
  const [date, setDate] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [loadingSession, setLoadingSession] = useState(false);

  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);

  const [agent, setAgent] = useState("JAYAWAY");
  const [splitting, setSplitting] = useState(false);

  const [messageApi, messageContextHolder] = message.useMessage();

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await getLatestOrderDate();

        if (res.data.date) {
          setDate(res.data.date);
          fetchSession(res.data.date);
        }
      } catch (e) {
        console.error("Failed to load latest order date:", e);
      }
    })();
  }, []);

  useEffect(() => {
    if (date) {
      fetchSession(date);
    }
  }, [date]);

  const fetchSession = async (selectedDate) => {
    setLoadingSession(true);
    setSessionId(null);
    setValidation(null);

    try {
      const res = await getWinningSessionByDate(selectedDate);
      setSessionId(res.data.session_id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSession(false);
    }
  };

  const handleValidate = async () => {
    if (!sessionId) {
      messageApi.warning("No winning session loaded.");
      return;
    }

    setValidating(true);
    setValidation(null);

    try {
      const res = await validateWinning(sessionId);

      setValidation(res.data);

      if (res.data?.valid) {
        messageApi.success("All winning records passed validation.");
      } else {
        messageApi.error("Some winning records failed validation.");
      }
    } catch (e) {
      messageApi.error(
        e.response?.data?.detail || "Validation failed",
      );
    } finally {
      setValidating(false);
    }
  };

  const handleSplit = async () => {
    if (!validation?.valid) return;

    setSplitting(true);

    try {
      await splitWinning({
        session_id: sessionId,
        agent_name: agent,
      });

      messageApi.success("Split completed");
      navigate("/result-download");
    } catch (e) {
      messageApi.error(e.response?.data?.detail || "Split failed");
    } finally {
      setSplitting(false);
    }
  };

  const handleDateChange = (selectedDate) => {
    if (!selectedDate) {
      setDate("");
      setSessionId(null);
      setValidation(null);
      return;
    }

    setDate(selectedDate.format("YYYY-MM-DD"));
  };

  const mismatches = useMemo(() => {
    return Array.isArray(validation?.mismatches)
      ? validation.mismatches
      : [];
  }, [validation]);

  const validationStatus = useMemo(() => {
    if (!validation) return "Not Validated";
    return validation.valid ? "Passed" : "Failed";
  }, [validation]);

  return (
    <>
      {messageContextHolder}

      <div>
        <Card
          bordered={false}
          style={{
            marginBottom: 24,
            borderRadius: 16,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
          }}
        >
          <Row gutter={[20, 20]} align="middle" justify="space-between">
            <Col>
              <Title level={2} style={{ margin: 0 }}>
                Split Winning Files
              </Title>

              <Text type="secondary">
                Validate all winning records and split them for the selected
                agent.
              </Text>
            </Col>

            <Col>
              <Space wrap>
                <Text type="secondary">Winning date:</Text>

                <DatePicker
                  value={date ? dayjs(date) : null}
                  onChange={handleDateChange}
                  format="DD MMM YYYY"
                  suffixIcon={<CalendarOutlined />}
                  disabled={validating || splitting}
                  style={{ width: 185 }}
                />

                <Select
                  value={agent}
                  onChange={setAgent}
                  disabled={splitting}
                  style={{ width: 170 }}
                  options={[
                    {
                      value: "JAYAWAY",
                      label: "JAYAWAY",
                    },
                    {
                      value: "WINWAY",
                      label: "WINWAY",
                    },
                  ]}
                />
              </Space>
            </Col>
          </Row>
        </Card>

        <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} xl={6}>
            <Card
              bordered={false}
              style={{
                height: "100%",
                borderRadius: 16,
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
              }}
            >
              <Statistic
                title="Session Status"
                value={sessionId ? "Loaded" : "Not Loaded"}
                prefix={
                  <FileZipOutlined
                    style={{
                      color: sessionId ? "#52c41a" : "#faad14",
                    }}
                  />
                }
                valueStyle={{
                  fontWeight: 700,
                  fontSize: 22,
                  color: sessionId ? "#52c41a" : "#faad14",
                }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} xl={6}>
            <Card
              bordered={false}
              style={{
                height: "100%",
                borderRadius: 16,
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
              }}
            >
              <Statistic
                title="Validation Status"
                value={validationStatus}
                prefix={
                  validation?.valid ? (
                    <CheckCircleOutlined style={{ color: "#52c41a" }} />
                  ) : validation ? (
                    <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
                  ) : (
                    <SafetyCertificateOutlined
                      style={{ color: "#1677ff" }}
                    />
                  )
                }
                valueStyle={{
                  fontWeight: 700,
                  fontSize: 22,
                  color: validation?.valid
                    ? "#52c41a"
                    : validation
                      ? "#ff4d4f"
                      : "#1677ff",
                }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} xl={6}>
            <Card
              bordered={false}
              style={{
                height: "100%",
                borderRadius: 16,
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
              }}
            >
              <Statistic
                title="Validation Mismatches"
                value={mismatches.length}
                prefix={<WarningOutlined style={{ color: "#fa8c16" }} />}
                valueStyle={{ fontWeight: 700 }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} xl={6}>
            <Card
              bordered={false}
              style={{
                height: "100%",
                borderRadius: 16,
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
              }}
            >
              <Statistic
                title="Selected Agent"
                value={agent}
                prefix={
                  <UserOutlined
                    style={{
                      color:
                        agent === "JAYAWAY" ? "#722ed1" : "#13c2c2",
                    }}
                  />
                }
                valueStyle={{
                  fontWeight: 700,
                  color:
                    agent === "JAYAWAY" ? "#722ed1" : "#13c2c2",
                }}
              />
            </Card>
          </Col>
        </Row>

        <Card
          title={
            <Space>
              <FileSearchOutlined style={{ color: "#1677ff" }} />
              <span>Winning Session</span>
            </Space>
          }
          bordered={false}
          style={{
            marginBottom: 24,
            borderRadius: 16,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
          }}
        >
          {loadingSession ? (
            <div
              style={{
                minHeight: 150,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text type="secondary">Loading session...</Text>
            </div>
          ) : !sessionId ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                date
                  ? `No winning archive uploaded for ${formatDate(date)}.`
                  : "Select a date to load a winning session."
              }
            />
          ) : (
            <Space
              direction="vertical"
              size={20}
              style={{ width: "100%" }}
            >
              <Alert
                showIcon
                type="info"
                message="Winning session loaded"
                description={
                  <Space direction="vertical" size={4}>
                    <span>
                      Date: <Text strong>{formatDate(date)}</Text>
                    </span>

                    <span>
                      Session ID:{" "}
                      <Text code copyable>
                        {sessionId}
                      </Text>
                    </span>
                  </Space>
                }
              />

              <Button
                type="primary"
                size="large"
                icon={<SafetyCertificateOutlined />}
                loading={validating}
                disabled={splitting}
                onClick={handleValidate}
              >
                Validate All Records
              </Button>
            </Space>
          )}
        </Card>

        {validation && (
          <Card
            title={
              <Space>
                {validation.valid ? (
                  <CheckCircleOutlined style={{ color: "#52c41a" }} />
                ) : (
                  <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
                )}

                <span>Validation Result</span>
              </Space>
            }
            bordered={false}
            style={{
              marginBottom: 24,
              borderRadius: 16,
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
            }}
          >
            {validation.valid ? (
              <Alert
                showIcon
                type="success"
                message="Validation passed"
                description="All records are within the assigned daytime splits."
              />
            ) : (
              <Space
                direction="vertical"
                size={20}
                style={{ width: "100%" }}
              >
                <Alert
                  showIcon
                  type="error"
                  message="Validation failed"
                  description="Some records are outside the assigned ranges."
                />

                {mismatches.length > 0 && (
                  <List
                    bordered
                    dataSource={mismatches}
                    header={
                      <Text strong>
                        Validation Mismatches ({mismatches.length})
                      </Text>
                    }
                    renderItem={(item, index) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<Tag color="red">{index + 1}</Tag>}
                          title={
                            <Text strong>
                              {item.lottery || "Unknown Lottery"}
                            </Text>
                          }
                          description={
                            item.message || "Validation mismatch detected."
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Space>
            )}
          </Card>
        )}

        {validation?.valid && (
          <Card
            title={
              <Space>
                <ScissorOutlined style={{ color: "#722ed1" }} />
                <span>Split Files for Agent</span>
              </Space>
            }
            bordered={false}
            style={{
              borderRadius: 16,
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
            }}
          >
            <Row gutter={[20, 20]} align="middle">
              <Col xs={24} md={12}>
                <Alert
                  showIcon
                  type="success"
                  message="Files are ready to split"
                  description={
                    <span>
                      All validations passed. The winning files can now be
                      split for <Text strong>{agent}</Text>.
                    </span>
                  }
                />
              </Col>

              <Col xs={24} md={12}>
                <Space
                  wrap
                  style={{
                    width: "100%",
                    justifyContent: "flex-end",
                  }}
                >
                  <Select
                    value={agent}
                    onChange={setAgent}
                    disabled={splitting}
                    style={{ width: 180 }}
                    options={[
                      {
                        value: "JAYAWAY",
                        label: "JAYAWAY",
                      },
                      {
                        value: "WINWAY",
                        label: "WINWAY",
                      },
                    ]}
                  />

                  <Button
                    type="primary"
                    size="large"
                    icon={<ScissorOutlined />}
                    loading={splitting}
                    onClick={handleSplit}
                    style={{
                      background: "#722ed1",
                    }}
                  >
                    Split for Agent
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>
        )}
      </div>
    </>
  );
};

export default ResultSplit;