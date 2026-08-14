import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  message,
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
  CloudDownloadOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  FileZipOutlined,
  NumberOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  listAgentWinningSplits,
  downloadWinningFile,
  downloadAgentWinningZip,
  getLatestOrderDate,
  getWinningSessionByDate,
} from "./api/index";

import { formatDate } from "../utils/dateUtils";

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

  if (normalized === "hada" || normalized.includes("handahana")) {
    return "hada";
  }

  if (
    normalized === "maha" ||
    normalized.includes("mahajana sampatha")
  ) {
    return "maha";
  }

  if (normalized === "mgap" || normalized.includes("mega power")) {
    return "mgap";
  }

  if (normalized === "jaya" || normalized.includes("nlb jaya")) {
    return "jaya";
  }

  if (normalized === "suba" || normalized.includes("suba dawasak")) {
    return "suba";
  }

  return normalized;
};

const getLotterySortIndex = (value) => {
  const normalizedCode = normalizeLotteryCode(value);
  const index = LOTTERY_ORDER.indexOf(normalizedCode);

  return index === -1 ? LOTTERY_ORDER.length : index;
};

const ResultDownload = () => {
  const [date, setDate] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [agent, setAgent] = useState("JAYAWAY");
  const [splits, setSplits] = useState([]);

  const [loading, setLoading] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState("");
  const [error, setError] = useState("");

  const [messageApi, messageContextHolder] = message.useMessage();

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
    setSessionId(null);

    try {
      const res = await getWinningSessionByDate(selectedDate);

      setSessionId(res.data.session_id);

      if (res.data.session_id) {
        loadSplits(res.data.session_id, agent);
      } else {
        setSplits([]);
      }
    } catch (e) {
      console.error(e);
      setSplits([]);
    }
  };

  useEffect(() => {
    if (sessionId && agent) {
      loadSplits(sessionId, agent);
    }
  }, [sessionId, agent]);

  const loadSplits = async (selectedSessionId, agentName) => {
    setLoading(true);
    setError("");

    try {
      const res = await listAgentWinningSplits(
        selectedSessionId,
        agentName,
      );

      const splitData = Array.isArray(res.data) ? res.data : [];

      const sortedSplits = [...splitData].sort((a, b) => {
        const valueA = a.lottery_code || a.lottery_name;
        const valueB = b.lottery_code || b.lottery_name;

        return (
          getLotterySortIndex(valueA) - getLotterySortIndex(valueB)
        );
      });

      setSplits(sortedSplits);
    } catch (e) {
      console.error(e);
      setSplits([]);
      setError(`Failed to load split files for ${agentName}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (selectedDate) => {
    if (!selectedDate) {
      setDate("");
      setSessionId(null);
      setSplits([]);
      return;
    }

    setDate(selectedDate.format("YYYY-MM-DD"));
  };

  const saveBlobToDevice = (response, filename) => {
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);
  };

  const handleDownloadSingle = async (
    filename,
    originalFilename,
    lotteryName,
  ) => {
    const fileKey = filename || originalFilename;

    setDownloadingFile(fileKey);

    try {
      const res = await downloadWinningFile(
        sessionId,
        filename,
        originalFilename,
      );

      saveBlobToDevice(res, filename);

      messageApi.success(
        `${lotteryName || "Winning file"} downloaded successfully.`,
      );
    } catch (e) {
      console.error(e);

      messageApi.error(
        e.response?.data?.detail ||
          e.response?.data?.message ||
          "Failed to download the selected file.",
      );
    } finally {
      setDownloadingFile("");
    }
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);

    try {
      const res = await downloadAgentWinningZip(sessionId, agent);

      saveBlobToDevice(
        res,
        `${agent}_winning_${date}.zip`,
      );

      messageApi.success(
        `${agent} winning ZIP downloaded successfully.`,
      );
    } catch (e) {
      console.error(e);

      messageApi.error(
        e.response?.data?.detail ||
          e.response?.data?.message ||
          "Failed to download the winning ZIP.",
      );
    } finally {
      setDownloadingAll(false);
    }
  };

  const totalRecords = useMemo(() => {
    return splits.reduce(
      (total, item) => total + Number(item.record_count || 0),
      0,
    );
  }, [splits]);

  const totalPrice = useMemo(() => {
    return splits.reduce(
      (total, item) => total + Number(item.total_price || 0),
      0,
    );
  }, [splits]);

  const columns = [
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
      title: "Lottery",
      dataIndex: "lottery_name",
      key: "lottery_name",
      width: 260,
      render: (value, record) => (
        <Space>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                agent === "JAYAWAY" ? "#f9f0ff" : "#e6fffb",
              color:
                agent === "JAYAWAY" ? "#722ed1" : "#13c2c2",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {normalizeLotteryCode(record.lottery_code || value)
              .slice(0, 2)
              .toUpperCase()}
          </div>

          <div>
            <Text strong>
              {value || record.lottery_code || "Unknown Lottery"}
            </Text>

            <div>
              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                }}
              >
                {record.lottery_code ||
                  normalizeLotteryCode(value)}
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
      width: 160,
      align: "center",
      render: (value) =>
        value ? (
          <Tag color="blue" icon={<NumberOutlined />}>
            {value}
          </Tag>
        ) : (
          <Tag>No draw</Tag>
        ),
    },
    {
      title: "Records",
      dataIndex: "record_count",
      key: "record_count",
      width: 150,
      align: "right",
      render: (value) => (
        <Text strong>
          {Number(value || 0).toLocaleString()}
        </Text>
      ),
    },
    {
      title: "Total Price",
      dataIndex: "total_price",
      key: "total_price",
      width: 190,
      align: "right",
      render: (value) => (
        <Text strong>
          Rs. {Number(value || 0).toLocaleString()}
        </Text>
      ),
    },
    {
      title: "File",
      key: "filename",
      width: 260,
      render: (_, record) => (
        <Text
          ellipsis={{
            tooltip: record.original_filename || record.filename,
          }}
          style={{ maxWidth: 225 }}
        >
          {record.original_filename ||
            record.filename ||
            "Winning split file"}
        </Text>
      ),
    },
    {
      title: "Download",
      key: "download",
      width: 150,
      align: "center",
      fixed: "right",
      render: (_, record) => {
        const fileKey =
          record.filename || record.original_filename;

        return (
          <Button
            type="link"
            icon={<DownloadOutlined />}
            loading={downloadingFile === fileKey}
            disabled={downloadingAll}
            onClick={() =>
              handleDownloadSingle(
                record.filename,
                record.original_filename,
                record.lottery_name,
              )
            }
          >
            Download
          </Button>
        );
      },
    },
  ];

  return (
    <>
      {messageContextHolder}

      <div>
        <Card
          bordered={false}
          style={{
            marginBottom: 24,
            borderRadius: 16,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
          }}
        >
          <Row gutter={[20, 20]} align="middle" justify="space-between">
            <Col>
              <Title level={2} style={{ margin: 0 }}>
                Download Winning Splits
              </Title>

              <Text type="secondary">
                Download individual winning files or all agent files as a
                ZIP archive.
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
                  style={{ width: 185 }}
                />

                <Select
                  value={agent}
                  onChange={setAgent}
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

        {error && (
          <Alert
            showIcon
            closable
            type="error"
            message="Unable to load split files"
            description={error}
            style={{ marginBottom: 24 }}
            onClose={() => setError("")}
          />
        )}

        {!sessionId && !loading && date && (
          <Alert
            showIcon
            type="warning"
            message="No winning splits found"
            description={`No winning splits are available for ${formatDate(
              date,
            )}.`}
            style={{ marginBottom: 24 }}
          />
        )}

        <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} xl={6}>
            <Card
              bordered={false}
              style={{
                height: "100%",
                borderRadius: 16,
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
              }}
            >
              <Statistic
                title="Split Files"
                value={splits.length}
                prefix={<DatabaseOutlined style={{ color: "#1677ff" }} />}
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
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
              }}
            >
              <Statistic
                title="Total Records"
                value={totalRecords}
                prefix={<DatabaseOutlined style={{ color: "#722ed1" }} />}
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
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
              }}
            >
              <Statistic
                title="Total Price"
                value={totalPrice}
                prefix="Rs."
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
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
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
              <CloudDownloadOutlined style={{ color: "#1677ff" }} />
              <span>{agent} Winning Split Files</span>
            </Space>
          }
          extra={
            <Button
              type="primary"
              icon={<FileZipOutlined />}
              loading={downloadingAll}
              disabled={
                loading ||
                downloadingFile !== "" ||
                splits.length === 0
              }
              onClick={handleDownloadAll}
              style={{
                background: "#722ed1",
              }}
            >
              Download ZIP
            </Button>
          }
          bordered={false}
          style={{
            borderRadius: 16,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
          }}
        >
          {sessionId && (
            <Alert
              showIcon
              type="info"
              message={
                <span>
                  Session ID:{" "}
                  <Text code copyable>
                    {sessionId}
                  </Text>
                </span>
              }
              style={{ marginBottom: 20 }}
            />
          )}

          <Table
            rowKey={(record, index) =>
              `${
                record.filename ||
                record.original_filename ||
                record.lottery_code ||
                record.lottery_name
              }-${index}`
            }
            columns={columns}
            dataSource={splits}
            loading={loading}
            pagination={false}
            scroll={{ x: 1200 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    date
                      ? `No split files found for ${agent} on ${formatDate(
                          date,
                        )}`
                      : "Select a date and agent"
                  }
                />
              ),
            }}
            summary={() =>
              splits.length > 0 ? (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} />

                    <Table.Summary.Cell index={1}>
                      <Text strong>Total</Text>
                    </Table.Summary.Cell>

                    <Table.Summary.Cell index={2} />

                    <Table.Summary.Cell index={3} align="right">
                      <Text strong>
                        {totalRecords.toLocaleString()}
                      </Text>
                    </Table.Summary.Cell>

                    <Table.Summary.Cell index={4} align="right">
                      <Text strong>
                        Rs. {totalPrice.toLocaleString()}
                      </Text>
                    </Table.Summary.Cell>

                    <Table.Summary.Cell index={5} />

                    <Table.Summary.Cell index={6} />
                  </Table.Summary.Row>
                </Table.Summary>
              ) : null
            }
          />
        </Card>
      </div>
    </>
  );
};

export default ResultDownload;