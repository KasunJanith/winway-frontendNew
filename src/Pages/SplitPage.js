import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  message,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  ScissorOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  splitForAgent,
  getLatestOrderDate,
  getAssignedCounts,
  getSessionByDate,
  getSessionLotteries,
  validateUpload,
} from "./api/index";

const { Title, Text } = Typography;

const LOTTERY_ORDER = [
  "ada",
  "dana",
  "govi",
  "hada",
  "maha",
  "mgap",
  "jaya",
  "suba",
];

const normalizeLotteryCode = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "ada" || normalized.includes("ada sampatha")) {
    return "ada";
  }

  if (
    normalized === "dana" ||
    normalized.includes("dhana nidhanaya") ||
    normalized.includes("dana nidhanaya")
  ) {
    return "dana";
  }

  if (
    normalized === "govi" ||
    normalized.includes("govi setha") ||
    normalized.includes("govisetha")
  ) {
    return "govi";
  }

  if (
    normalized === "hada" ||
    normalized.includes("handahana")
  ) {
    return "hada";
  }

  if (
    normalized === "maha" ||
    normalized.includes("mahajana sampatha")
  ) {
    return "maha";
  }

  if (
    normalized === "mgap" ||
    normalized.includes("mega power")
  ) {
    return "mgap";
  }

  if (
    normalized === "jaya" ||
    normalized.includes("nlb jaya")
  ) {
    return "jaya";
  }

  if (
    normalized === "suba" ||
    normalized.includes("suba dawasak")
  ) {
    return "suba";
  }

  return normalized;
};

const getSortedIndex = (value) => {
  const code = normalizeLotteryCode(value);
  const index = LOTTERY_ORDER.indexOf(code);

  return index === -1 ? LOTTERY_ORDER.length : index;
};

const SplitPage = () => {
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState("");
  const [agent, setAgent] = useState("JAYAWAY");

  const [sessionId, setSessionId] = useState(null);
  const [lotteries, setLotteries] = useState([]);
  const [assignedCounts, setAssignedCounts] = useState([]);
  const [validation, setValidation] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingAssignments, setLoadingAssignments] =
    useState(false);
  const [splitting, setSplitting] = useState(false);
  const [error, setError] = useState("");

  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();

  useEffect(() => {
    loadLatestDate();
  }, []);

  useEffect(() => {
    if (!selectedDate || !agent) return;

    loadAssignedCounts(selectedDate, agent);
  }, [selectedDate, agent]);

  const loadLatestDate = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getLatestOrderDate();
      const latestDate = response.data?.date;

      if (latestDate) {
        setSelectedDate(latestDate);
        await loadAllData(latestDate);
      } else {
        const today = dayjs().format("YYYY-MM-DD");

        setSelectedDate(today);
        await loadAllData(today);
      }
    } catch (err) {
      console.error("Failed to load latest order date:", err);

      const today = dayjs().format("YYYY-MM-DD");

      setSelectedDate(today);
      await loadAllData(today);
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async (date) => {
    if (!date) return;

    setLoading(true);
    setError("");

    try {
      await Promise.all([
        loadSession(date),
        loadValidation(date),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadSession = async (date) => {
    try {
      const sessionResponse = await getSessionByDate(date);
      const foundSessionId =
        sessionResponse.data?.session_id;

      if (!foundSessionId) {
        setSessionId(null);
        setLotteries([]);
        return;
      }

      setSessionId(foundSessionId);

      const lotteryResponse =
        await getSessionLotteries(foundSessionId);

      const lotteryData = Array.isArray(
        lotteryResponse.data,
      )
        ? lotteryResponse.data
        : [];

      const sortedLotteries = [...lotteryData].sort(
        (a, b) => {
          const valueA =
            a.lottery_code || a.lottery_name;

          const valueB =
            b.lottery_code || b.lottery_name;

          return (
            getSortedIndex(valueA) -
            getSortedIndex(valueB)
          );
        },
      );

      setLotteries(sortedLotteries);
    } catch (err) {
      console.error("Failed to load upload session:", err);

      setSessionId(null);
      setLotteries([]);
    }
  };

  const loadValidation = async (date) => {
    try {
      const response = await validateUpload(date);

      setValidation(response.data || null);
    } catch (err) {
      console.error("Failed to validate upload:", err);

      setValidation(null);
    }
  };

  const loadAssignedCounts = async (
    date,
    agentName,
  ) => {
    if (!date || !agentName) return;

    setLoadingAssignments(true);

    try {
      const response = await getAssignedCounts(
        agentName,
        date,
      );

      const assignmentData = Array.isArray(
        response.data,
      )
        ? response.data
        : [];

      const sortedAssignments = [
        ...assignmentData,
      ].sort(
        (a, b) =>
          getSortedIndex(
            a.lottery_code || a.lottery_name,
          ) -
          getSortedIndex(
            b.lottery_code || b.lottery_name,
          ),
      );

      setAssignedCounts(
        sortedAssignments.map((item) => ({
          ...item,
          available_quantity: Number(
            item.available_quantity || 0,
          ),
          assigned_count: Number(
            item.assigned_count || 0,
          ),
        })),
      );
    } catch (err) {
      console.error(
        "Failed to load assigned counts:",
        err,
      );

      setAssignedCounts([]);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleDateChange = async (date) => {
    if (!date) return;

    const formattedDate = date.format("YYYY-MM-DD");

    setSelectedDate(formattedDate);
    setSessionId(null);
    setLotteries([]);
    setAssignedCounts([]);
    setValidation(null);
    setError("");

    await loadAllData(formattedDate);
    await loadAssignedCounts(formattedDate, agent);
  };

  const getMismatchInfo = (lottery) => {
    if (!validation?.mismatches?.length) {
      return null;
    }

    const targetCode = normalizeLotteryCode(
      lottery.lottery_code || lottery.lottery_name,
    );

    return (
      validation.mismatches.find((item) => {
        const mismatchCode = normalizeLotteryCode(
          item.lottery_code || item.lottery_name,
        );

        return mismatchCode === targetCode;
      }) || null
    );
  };

  const getMissingInfo = (lottery) => {
    if (!validation?.missing_lotteries?.length) {
      return null;
    }

    const targetCode = normalizeLotteryCode(
      lottery.lottery_code || lottery.lottery_name,
    );

    return (
      validation.missing_lotteries.find((item) => {
        const missingCode = normalizeLotteryCode(
          item.lottery_code || item.lottery_name,
        );

        return missingCode === targetCode;
      }) || null
    );
  };

  const getAssignmentInfo = (lottery) => {
    const targetCode = normalizeLotteryCode(
      lottery.lottery_code || lottery.lottery_name,
    );

    return (
      assignedCounts.find((item) => {
        const assignedCode = normalizeLotteryCode(
          item.lottery_code || item.lottery_name,
        );

        return assignedCode === targetCode;
      }) || null
    );
  };

  const totalUploadedRecords = useMemo(() => {
    return lotteries.reduce(
      (total, item) =>
        total + Number(item.record_count || 0),
      0,
    );
  }, [lotteries]);

  const totalAvailableQuantity = useMemo(() => {
    return assignedCounts.reduce(
      (total, item) =>
        total +
        Number(item.available_quantity || 0),
      0,
    );
  }, [assignedCounts]);

  const totalAssignedToAgent = useMemo(() => {
    return assignedCounts.reduce(
      (total, item) =>
        total + Number(item.assigned_count || 0),
      0,
    );
  }, [assignedCounts]);

  const assignedLotteryCount = useMemo(() => {
    return assignedCounts.filter(
      (item) => Number(item.assigned_count || 0) > 0,
    ).length;
  }, [assignedCounts]);

  const mismatchCount =
    validation?.mismatches?.length || 0;

  const missingCount =
    validation?.missing_lotteries?.length || 0;

  const extraCount =
    validation?.extra_lotteries?.length || 0;

  const canSplit =
    Boolean(sessionId) &&
    Boolean(validation?.is_valid) &&
    assignedCounts.length > 0 &&
    totalAssignedToAgent > 0;

  const performSplit = async () => {
    setSplitting(true);

    try {
      await splitForAgent({
        session_id: sessionId,
        agent_name: agent,
        assignment_date: selectedDate,
      });

      messageApi.success(
        `DBF files split successfully for ${agent}.`,
      );

      navigate("/download");
    } catch (err) {
      console.error("Split failed:", err);

      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Split failed. Please try again.";

      messageApi.error(errorMessage);
      throw err;
    } finally {
      setSplitting(false);
    }
  };

  const handleSplit = () => {
    if (!sessionId) {
      messageApi.warning(
        "No uploaded archive exists for this date.",
      );
      return;
    }

    if (!validation?.is_valid) {
      messageApi.error(
        "The archive contains validation errors. Fix the order quantities or upload the correct archive first.",
      );
      return;
    }

    if (!assignedCounts.length) {
      messageApi.warning(
        `No assignments were found for ${agent}.`,
      );
      return;
    }

    if (totalAssignedToAgent <= 0) {
      messageApi.warning(
        `No ticket quantities are assigned to ${agent}.`,
      );
      return;
    }

    modalApi.confirm({
      title: `Split DBF files for ${agent}?`,
      icon: (
        <ScissorOutlined
          style={{ color: "#722ed1" }}
        />
      ),
      centered: true,
      width: 520,
      content: (
        <div style={{ marginTop: 16 }}>
          <Descriptions
            bordered
            size="small"
            column={1}
          >
            <Descriptions.Item label="Agent">
              <Tag
                color={
                  agent === "JAYAWAY"
                    ? "purple"
                    : "cyan"
                }
              >
                {agent}
              </Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Date">
              <Text strong>
                {dayjs(selectedDate).format(
                  "DD MMMM YYYY",
                )}
              </Text>
            </Descriptions.Item>

            <Descriptions.Item label="Lotteries">
              <Text strong>
                {assignedLotteryCount}
              </Text>
            </Descriptions.Item>

            <Descriptions.Item label="Assigned records">
              <Text strong>
                {totalAssignedToAgent.toLocaleString()}
              </Text>
            </Descriptions.Item>
          </Descriptions>

          <Alert
            type="info"
            showIcon
            message="The generated files will be available on the download page."
            style={{ marginTop: 16 }}
          />
        </div>
      ),
      okText: "Split Files",
      cancelText: "Cancel",
      onOk: async () => {
        await performSplit();
      },
    });
  };

  const uploadedColumns = [
    {
      title: "#",
      key: "index",
      width: 65,
      align: "center",
      render: (_, __, index) => (
        <Text type="secondary">{index + 1}</Text>
      ),
    },
    {
      title: "Ticket",
      dataIndex: "lottery_name",
      key: "lottery_name",
      width: 230,
      render: (value, record) => (
        <Space>
          <div
            style={{
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              background: "#e6f4ff",
              color: "#1677ff",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {normalizeLotteryCode(
              record.lottery_code || value,
            )
              .slice(0, 2)
              .toUpperCase()}
          </div>

          <div>
            <Text strong>
              {value ||
                record.lottery_code ||
                "Unknown"}
            </Text>

            <div>
              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                }}
              >
                {normalizeLotteryCode(
                  record.lottery_code || value,
                )}
              </Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "Draw",
      dataIndex: "draw_number",
      key: "draw_number",
      width: 130,
      align: "center",
      render: (value) =>
        value ? (
          <Tag color="blue">{value}</Tag>
        ) : (
          <Tag>No draw</Tag>
        ),
    },
    {
      title: "Uploaded Records",
      dataIndex: "record_count",
      key: "record_count",
      width: 170,
      align: "right",
      render: (value) => (
        <Text strong>
          {Number(value || 0).toLocaleString()}
        </Text>
      ),
    },
    {
      title: "Ordered Quantity",
      key: "orderedQuantity",
      width: 170,
      align: "right",
      render: (_, record) => {
        const assignment =
          getAssignmentInfo(record);

        const availableQuantity = Number(
          assignment?.available_quantity || 0,
        );

        return availableQuantity > 0 ? (
          <Text strong>
            {availableQuantity.toLocaleString()}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        );
      },
    },
    {
      title: "Start Serial",
      dataIndex: "start_serial",
      key: "start_serial",
      width: 170,
      render: (value) => (
        <Text code>{value || "—"}</Text>
      ),
    },
    {
      title: "End Serial",
      dataIndex: "end_serial",
      key: "end_serial",
      width: 170,
      render: (value) => (
        <Text code>{value || "—"}</Text>
      ),
    },
    {
      title: "Validation Status",
      key: "validationStatus",
      width: 190,
      align: "center",
      render: (_, record) => {
        const mismatch = getMismatchInfo(record);
        const missing = getMissingInfo(record);
        const assignment =
          getAssignmentInfo(record);

        const uploadedRecords = Number(
          record.record_count || 0,
        );

        const orderedQuantity = Number(
          assignment?.available_quantity || 0,
        );

        if (missing) {
          return (
            <Tag
              color="error"
              icon={<ExclamationCircleOutlined />}
            >
              Missing
            </Tag>
          );
        }

        if (mismatch) {
          const difference = Number(
            mismatch.difference ??
              uploadedRecords - orderedQuantity,
          );

          return (
            <Tag
              color="error"
              icon={<ExclamationCircleOutlined />}
            >
              Mismatch{" "}
              {difference > 0
                ? `+${difference}`
                : difference}
            </Tag>
          );
        }

        if (
          orderedQuantity > 0 &&
          uploadedRecords === orderedQuantity
        ) {
          return (
            <Tag
              color="success"
              icon={<CheckCircleOutlined />}
            >
              Match
            </Tag>
          );
        }

        return (
          <Tag color="warning">
            No order data
          </Tag>
        );
      },
    },
  ];

  const assignmentColumns = [
    {
      title: "#",
      key: "index",
      width: 65,
      align: "center",
      render: (_, __, index) => (
        <Text type="secondary">{index + 1}</Text>
      ),
    },
    {
      title: "Ticket",
      dataIndex: "lottery_name",
      key: "lottery_name",
      width: 250,
      render: (value, record) => (
        <Space>
          <div
            style={{
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 10,
              background:
                agent === "JAYAWAY"
                  ? "#f9f0ff"
                  : "#e6fffb",
              color:
                agent === "JAYAWAY"
                  ? "#722ed1"
                  : "#13c2c2",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {normalizeLotteryCode(
              record.lottery_code || value,
            )
              .slice(0, 2)
              .toUpperCase()}
          </div>

          <div>
            <Text strong>
              {value ||
                record.lottery_code ||
                "Unknown"}
            </Text>

            <div>
              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                }}
              >
                {record.lottery_code}
              </Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "Draw Number",
      dataIndex: "draw_number",
      key: "draw_number",
      width: 150,
      align: "center",
      render: (value) =>
        value ? (
          <Tag color="blue">{value}</Tag>
        ) : (
          <Tag>No draw</Tag>
        ),
    },
    {
      title: "Available Quantity",
      dataIndex: "available_quantity",
      key: "available_quantity",
      width: 190,
      align: "right",
      render: (value) => (
        <Text>
          {Number(value || 0).toLocaleString()}
        </Text>
      ),
    },
    {
      title: `Assigned to ${agent}`,
      dataIndex: "assigned_count",
      key: "assigned_count",
      width: 210,
      align: "right",
      render: (value) => {
        const numericValue = Number(value || 0);

        return numericValue > 0 ? (
          <Tag
            color={
              agent === "JAYAWAY"
                ? "purple"
                : "cyan"
            }
          >
            {numericValue.toLocaleString()}
          </Tag>
        ) : (
          <Tag>Not assigned</Tag>
        );
      },
    },
    {
      title: "Percentage",
      key: "percentage",
      width: 230,
      render: (_, record) => {
        const available = Number(
          record.available_quantity || 0,
        );

        const assigned = Number(
          record.assigned_count || 0,
        );

        const percentage =
          available > 0
            ? Math.min(
                (assigned / available) * 100,
                100,
              )
            : 0;

        return (
          <Progress
            percent={Number(
              percentage.toFixed(1),
            )}
            size="small"
            strokeColor={
              agent === "JAYAWAY"
                ? "#722ed1"
                : "#13c2c2"
            }
          />
        );
      },
    },
  ];

  return (
    <>
      {messageContextHolder}
      {modalContextHolder}

      <div

      >
        <Card
          bordered={false}
          style={{
            marginBottom: 24,
            borderRadius: 16,
            boxShadow:
              "0 4px 16px rgba(0, 0, 0, 0.04)",
          }}
        >
          <Row
            gutter={[20, 20]}
            align="middle"
            justify="space-between"
          >
            <Col>
              <Title level={2} style={{ margin: 0 }}>
                Split DBF Files
              </Title>

              <Text type="secondary">
                Validate uploaded DBF records and
                generate agent-specific files.
              </Text>
            </Col>

            <Col>
              <Space wrap>
                <Text type="secondary">
                  Draw date:
                </Text>

                <DatePicker
                  value={
                    selectedDate
                      ? dayjs(selectedDate)
                      : null
                  }
                  onChange={handleDateChange}
                  allowClear={false}
                  format="DD MMM YYYY"
                  suffixIcon={<CalendarOutlined />}
                  style={{ width: 185 }}
                />
              </Space>
            </Col>
          </Row>
        </Card>

        {error && (
          <Alert
            showIcon
            closable
            type="error"
            message="Unable to load split data"
            description={error}
            style={{ marginBottom: 24 }}
            onClose={() => setError("")}
          />
        )}

        {validation &&
          !validation.upload_exists && (
            <Alert
              type="warning"
              showIcon
              message="No archive uploaded"
              description="No DBF archive exists for this date. Upload the archive before splitting."
              style={{ marginBottom: 24 }}
            />
          )}

        {validation?.upload_exists &&
          !validation?.is_valid && (
            <Alert
              type="error"
              showIcon
              message="Validation errors found"
              description={
                <Space
                  direction="vertical"
                  size={4}
                >
                  <Text>
                    Splitting is disabled until the
                    errors are fixed.
                  </Text>

                  {mismatchCount > 0 && (
                    <Text type="danger">
                      Mismatches:{" "}
                      <strong>
                        {mismatchCount}
                      </strong>
                    </Text>
                  )}

                  {missingCount > 0 && (
                    <Text type="danger">
                      Missing lotteries:{" "}
                      <strong>
                        {missingCount}
                      </strong>
                    </Text>
                  )}

                  {extraCount > 0 && (
                    <Text
                      style={{ color: "#d48806" }}
                    >
                      Extra lotteries:{" "}
                      <strong>{extraCount}</strong>
                    </Text>
                  )}
                </Space>
              }
              style={{ marginBottom: 24 }}
            />
          )}

        {validation?.is_valid && (
          <Alert
            type="success"
            showIcon
            message="Archive validation completed"
            description="All uploaded records match the order quantities. The archive is ready to split."
            style={{ marginBottom: 24 }}
          />
        )}

        <Row
          gutter={[20, 20]}
          style={{ marginBottom: 24 }}
        >
          <Col xs={24} sm={12} xl={6}>
            <Card
              bordered={false}
              style={{
                height: "100%",
                borderRadius: 16,
                boxShadow:
                  "0 4px 16px rgba(0, 0, 0, 0.04)",
              }}
            >
              <Statistic
                title="Uploaded Files"
                value={lotteries.length}
                suffix="/ 8"
                prefix={
                  <DatabaseOutlined
                    style={{ color: "#1677ff" }}
                  />
                }
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
                boxShadow:
                  "0 4px 16px rgba(0, 0, 0, 0.04)",
              }}
            >
              <Statistic
                title="Uploaded Records"
                value={totalUploadedRecords}
                prefix={
                  <DatabaseOutlined
                    style={{ color: "#722ed1" }}
                  />
                }
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
                boxShadow:
                  "0 4px 16px rgba(0, 0, 0, 0.04)",
              }}
            >
              <Statistic
                title={`${agent} Assigned`}
                value={totalAssignedToAgent}
                prefix={
                  <UserOutlined
                    style={{
                      color:
                        agent === "JAYAWAY"
                          ? "#722ed1"
                          : "#13c2c2",
                    }}
                  />
                }
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
                boxShadow:
                  "0 4px 16px rgba(0, 0, 0, 0.04)",
              }}
            >
              <Statistic
                title="Validation Status"
                value={
                  validation?.is_valid
                    ? "Ready"
                    : validation?.upload_exists
                      ? "Errors"
                      : "No upload"
                }
                prefix={
                  validation?.is_valid ? (
                    <CheckCircleOutlined
                      style={{ color: "#52c41a" }}
                    />
                  ) : (
                    <WarningOutlined
                      style={{
                        color:
                          validation?.upload_exists
                            ? "#ff4d4f"
                            : "#fa8c16",
                      }}
                    />
                  )
                }
                valueStyle={{
                  fontWeight: 700,
                  color: validation?.is_valid
                    ? "#52c41a"
                    : validation?.upload_exists
                      ? "#ff4d4f"
                      : "#fa8c16",
                }}
              />
            </Card>
          </Col>
        </Row>

        <Card
          title={
            <Space>
              <DatabaseOutlined
                style={{ color: "#1677ff" }}
              />
              <span>Uploaded File Validation</span>
            </Space>
          }
          extra={
            validation?.is_valid ? (
              <Tag
                color="success"
                icon={<CheckCircleOutlined />}
              >
                Ready
              </Tag>
            ) : (
              <Tag
                color="warning"
                icon={<WarningOutlined />}
              >
                Check required
              </Tag>
            )
          }
          bordered={false}
          style={{
            marginBottom: 24,
            borderRadius: 16,
            boxShadow:
              "0 4px 16px rgba(0, 0, 0, 0.04)",
          }}
        >
          <Table
            rowKey={(record, index) =>
              `${
                record.lottery_code ||
                record.lottery_name
              }-${index}`
            }
            columns={uploadedColumns}
            dataSource={lotteries}
            loading={loading}
            pagination={false}
            scroll={{ x: 1350 }}
            rowClassName={(record) => {
              const mismatch =
                getMismatchInfo(record);

              const missing =
                getMissingInfo(record);

              return mismatch || missing
                ? "split-error-row"
                : "";
            }}
            locale={{
              emptyText: (
                <Empty
                  image={
                    Empty.PRESENTED_IMAGE_SIMPLE
                  }
                  description={
                    selectedDate
                      ? "No uploaded archive found for this date"
                      : "Select a draw date"
                  }
                />
              ),
            }}
          />
        </Card>

        {sessionId &&
          validation?.is_valid && (
            <>
              <Card
                bordered={false}
                style={{
                  marginBottom: 24,
                  borderRadius: 16,
                  boxShadow:
                    "0 4px 16px rgba(0, 0, 0, 0.04)",
                }}
              >
                <Row
                  gutter={[20, 20]}
                  align="middle"
                  justify="space-between"
                >
                  <Col>
                    <Space>
                      <TeamOutlined
                        style={{
                          color: "#1677ff",
                          fontSize: 20,
                        }}
                      />

                      <div>
                        <Text strong>
                          Select split agent
                        </Text>

                        <div>
                          <Text
                            type="secondary"
                            style={{ fontSize: 12 }}
                          >
                            Choose the agent whose
                            assigned DBF records should
                            be generated.
                          </Text>
                        </div>
                      </div>
                    </Space>
                  </Col>

                  <Col>
                    <Select
                      value={agent}
                      onChange={setAgent}
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
                  </Col>
                </Row>
              </Card>

              <Card
                title={
                  <Space>
                    <UserOutlined
                      style={{
                        color:
                          agent === "JAYAWAY"
                            ? "#722ed1"
                            : "#13c2c2",
                      }}
                    />

                    <span>
                      Assigned Counts for {agent}
                    </span>
                  </Space>
                }
                extra={
                  <Tag
                    color={
                      agent === "JAYAWAY"
                        ? "purple"
                        : "cyan"
                    }
                  >
                    {totalAssignedToAgent.toLocaleString()}{" "}
                    records
                  </Tag>
                }
                bordered={false}
                style={{
                  borderRadius: 16,
                  boxShadow:
                    "0 4px 16px rgba(0, 0, 0, 0.04)",
                }}
              >
                <Table
                  rowKey={(record, index) =>
                    `${
                      record.lottery_code ||
                      record.lottery_name
                    }-${index}`
                  }
                  columns={assignmentColumns}
                  dataSource={assignedCounts}
                  loading={loadingAssignments}
                  pagination={false}
                  scroll={{ x: 1050 }}
                  locale={{
                    emptyText: (
                      <Empty
                        image={
                          Empty.PRESENTED_IMAGE_SIMPLE
                        }
                        description={`No assignments found for ${agent}`}
                      />
                    ),
                  }}
                  summary={() =>
                    assignedCounts.length > 0 ? (
                      <Table.Summary fixed>
                        <Table.Summary.Row>
                          <Table.Summary.Cell
                            index={0}
                          />

                          <Table.Summary.Cell
                            index={1}
                          >
                            <Text strong>Total</Text>
                          </Table.Summary.Cell>

                          <Table.Summary.Cell
                            index={2}
                          />

                          <Table.Summary.Cell
                            index={3}
                            align="right"
                          >
                            <Text strong>
                              {totalAvailableQuantity.toLocaleString()}
                            </Text>
                          </Table.Summary.Cell>

                          <Table.Summary.Cell
                            index={4}
                            align="right"
                          >
                            <Text strong>
                              {totalAssignedToAgent.toLocaleString()}
                            </Text>
                          </Table.Summary.Cell>

                          <Table.Summary.Cell
                            index={5}
                          />
                        </Table.Summary.Row>
                      </Table.Summary>
                    ) : null
                  }
                />

                {assignedCounts.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginTop: 24,
                    }}
                  >
                    <Button
                      type="primary"
                      size="large"
                      icon={<ScissorOutlined />}
                      loading={splitting}
                      disabled={
                        !canSplit ||
                        loadingAssignments
                      }
                      onClick={handleSplit}
                      style={{
                        minWidth: 190,
                        background: "#722ed1",
                      }}
                    >
                      Split for {agent}
                    </Button>
                  </div>
                )}
              </Card>
            </>
          )}
      </div>

      <style>
        {`
          .split-error-row > td {
            background: #fff2f0 !important;
          }

          .split-error-row:hover > td {
            background: #ffccc7 !important;
          }
        `}
      </style>
    </>
  );
};

export default SplitPage;

