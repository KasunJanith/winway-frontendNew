import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  message,
  Modal,
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
  getSplitsByDate,
  downloadFile,
  downloadAgentZip,
  getLatestOrderDate,
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

  if (normalized === "hada" || normalized.includes("handahana")) {
    return "hada";
  }

  if (normalized === "maha" || normalized.includes("mahajana sampatha")) {
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

const SplitDownload = () => {
  const [selectedDate, setSelectedDate] = useState("");
  const [agent, setAgent] = useState("JAYAWAY");
  const [splits, setSplits] = useState([]);

  const [loading, setLoading] = useState(true);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState("");
  const [error, setError] = useState("");

  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();

  useEffect(() => {
    loadLatestDate();
  }, []);

  useEffect(() => {
    if (!selectedDate || !agent) return;

    loadSplits(selectedDate, agent);
  }, [selectedDate, agent]);

  const loadLatestDate = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getLatestOrderDate();
      const latestDate = response.data?.date;

      if (latestDate) {
        setSelectedDate(latestDate);
        await loadSplits(latestDate, agent);
      } else {
        const today = dayjs().format("YYYY-MM-DD");

        setSelectedDate(today);
        await loadSplits(today, agent);
      }
    } catch (err) {
      console.error("Failed to load latest order date:", err);

      const today = dayjs().format("YYYY-MM-DD");

      setSelectedDate(today);
      await loadSplits(today, agent);
    } finally {
      setLoading(false);
    }
  };

  const loadSplits = async (date, agentName) => {
    if (!date || !agentName) return;

    setLoading(true);
    setError("");

    try {
      const response = await getSplitsByDate(agentName, date);

      const splitData = Array.isArray(response.data) ? response.data : [];

      const sortedSplits = [...splitData].sort((a, b) => {
        const valueA = a.lottery_code || a.lottery_name;

        const valueB = b.lottery_code || b.lottery_name;

        return getLotterySortIndex(valueA) - getLotterySortIndex(valueB);
      });

      setSplits(
        sortedSplits.map((item) => ({
          ...item,
          record_count: Number(item.record_count || 0),
        })),
      );
    } catch (err) {
      console.error("Failed to load split files:", err);

      setSplits([]);
      setError(`Failed to load split files for ${agentName}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date) => {
    if (!date) return;

    const formattedDate = date.format("YYYY-MM-DD");

    setSelectedDate(formattedDate);
    setSplits([]);
    setError("");
  };

  const saveBlobToDevice = (response, fallbackFilename) => {
    const contentDisposition =
      response.headers?.["content-disposition"] ||
      response.headers?.get?.("content-disposition");

    let downloadName = fallbackFilename;

    if (contentDisposition) {
      const utfFilenameMatch = contentDisposition.match(
        /filename\*=UTF-8''([^;]+)/i,
      );

      const standardFilenameMatch =
        contentDisposition.match(/filename="?([^"]+)"?/i);

      if (utfFilenameMatch?.[1]) {
        downloadName = decodeURIComponent(utfFilenameMatch[1]);
      } else if (standardFilenameMatch?.[1]) {
        downloadName = standardFilenameMatch[1].trim();
      }
    }

    const blob =
      response.data instanceof Blob ? response.data : new Blob([response.data]);

    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = downloadName;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);
  };

  const handleDownloadSingle = async (split) => {
    const fileKey =
      split.filename ||
      split.original_filename ||
      `${split.lottery_code}-${split.draw_number}`;

    setDownloadingFile(fileKey);

    try {
      const response = await downloadFile(
        split.session_id,
        split.filename,
        split.original_filename,
      );

      saveBlobToDevice(
        response,
        split.original_filename || split.filename || "split-file.dbf",
      );

      messageApi.success(
        `${split.lottery_name || "Split file"} downloaded successfully.`,
      );
    } catch (err) {
      console.error("Single file download failed:", err);

      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Failed to download the selected file.";

      messageApi.error(errorMessage);
    } finally {
      setDownloadingFile("");
    }
  };

  const downloadAllFiles = async () => {
    if (!splits.length) return;

    const sessionId = splits[0]?.session_id;

    if (!sessionId) {
      messageApi.error("Session information is missing.");

      return;
    }

    setDownloadingAll(true);

    try {
      const response = await downloadAgentZip(sessionId, agent);

      saveBlobToDevice(response, `${agent}_splits_${selectedDate}.zip`);

      messageApi.success(`${agent} split archive downloaded successfully.`);
    } catch (err) {
      console.error("ZIP download failed:", err);

      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Failed to download the split archive.";

      messageApi.error(errorMessage);
      throw err;
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleDownloadAll = () => {
    if (!selectedDate) {
      messageApi.warning("Please select a date.");
      return;
    }

    if (!splits.length) {
      messageApi.warning(`No split files are available for ${agent}.`);
      return;
    }

    modalApi.confirm({
      title: `Download all ${agent} split files?`,
      icon: <FileZipOutlined style={{ color: "#722ed1" }} />,
      centered: true,
      width: 500,
      content: (
        <div style={{ marginTop: 16 }}>
          <p style={{ marginBottom: 8 }}>
            Agent: <strong>{agent}</strong>
          </p>

          <p style={{ marginBottom: 8 }}>
            Date: <strong>{dayjs(selectedDate).format("DD MMMM YYYY")}</strong>
          </p>

          <p style={{ marginBottom: 8 }}>
            Files: <strong>{splits.length}</strong>
          </p>

          <p style={{ marginBottom: 0 }}>
            Total records: <strong>{totalRecords.toLocaleString()}</strong>
          </p>
        </div>
      ),
      okText: "Download ZIP",
      cancelText: "Cancel",
      onOk: async () => {
        await downloadAllFiles();
      },
    });
  };

  const totalRecords = useMemo(() => {
    return splits.reduce(
      (total, item) => total + Number(item.record_count || 0),
      0,
    );
  }, [splits]);

  const totalSerialRange = useMemo(() => {
    return splits.reduce((total, item) => {
      const start = Number(item.start_serial || 0);
      const end = Number(item.end_serial || 0);

      if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
        return total;
      }

      return total + (end - start + 1);
    }, 0);
  }, [splits]);

  const columns = [
    {
      title: "#",
      key: "index",
      width: 65,
      align: "center",
      render: (_, __, index) => <Text type="secondary">{index + 1}</Text>,
    },
    {
      title: "Lottery",
      dataIndex: "lottery_name",
      key: "lottery_name",
      width: 250,
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
              background: agent === "JAYAWAY" ? "#f9f0ff" : "#e6fffb",
              color: agent === "JAYAWAY" ? "#722ed1" : "#13c2c2",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {normalizeLotteryCode(record.lottery_code || value)
              .slice(0, 2)
              .toUpperCase()}
          </div>

          <div>
            <Text strong>{value || record.lottery_code || "Unknown"}</Text>

            <div>
              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                }}
              >
                {record.lottery_code || normalizeLotteryCode(value)}
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
          <Tag color="blue" icon={<NumberOutlined />}>
            {value}
          </Tag>
        ) : (
          <Tag>No draw</Tag>
        ),
    },
    {
      title: "Start Serial",
      dataIndex: "start_serial",
      key: "start_serial",
      width: 180,
      render: (value) => <Text code>{value || "—"}</Text>,
    },
    {
      title: "End Serial",
      dataIndex: "end_serial",
      key: "end_serial",
      width: 180,
      render: (value) => <Text code>{value || "—"}</Text>,
    },
    {
      title: "Records",
      dataIndex: "record_count",
      key: "record_count",
      width: 150,
      align: "right",
      render: (value) => (
        <Text strong>{Number(value || 0).toLocaleString()}</Text>
      ),
    },
    {
      title: "File",
      key: "filename",
      width: 240,
      render: (_, record) => (
        <Text
          ellipsis={{
            tooltip: record.original_filename || record.filename,
          }}
          style={{ maxWidth: 210 }}
        >
          {record.original_filename || record.filename || "Split file"}
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
          record.filename ||
          record.original_filename ||
          `${record.lottery_code}-${record.draw_number}`;

        const isDownloading = downloadingFile === fileKey;

        return (
          <Button
            type="link"
            icon={<DownloadOutlined />}
            loading={isDownloading}
            disabled={downloadingAll}
            onClick={() => handleDownloadSingle(record)}
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
      {modalContextHolder}

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
                Download Split Files
              </Title>

              <Text type="secondary">
                Download individual DBF files or all agent files as a ZIP
                archive.
              </Text>
            </Col>

            <Col>
              <Space wrap>
                <Text type="secondary">Split date:</Text>

                <DatePicker
                  value={selectedDate ? dayjs(selectedDate) : null}
                  onChange={handleDateChange}
                  allowClear={false}
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
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
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
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
              }}
            >
              <Statistic
                title="Serial Range Total"
                value={totalSerialRange}
                prefix={<NumberOutlined style={{ color: "#13c2c2" }} />}
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
                      color: agent === "JAYAWAY" ? "#722ed1" : "#13c2c2",
                    }}
                  />
                }
                valueStyle={{
                  fontWeight: 700,
                  color: agent === "JAYAWAY" ? "#722ed1" : "#13c2c2",
                }}
              />
            </Card>
          </Col>
        </Row>

        <Card
          title={
            <Space>
              <CloudDownloadOutlined style={{ color: "#1677ff" }} />
              <span>{agent} Split Files</span>
            </Space>
          }
          extra={
            <Button
              type="primary"
              icon={<FileZipOutlined />}
              loading={downloadingAll}
              disabled={
                loading || downloadingFile !== "" || splits.length === 0
              }
              onClick={handleDownloadAll}
              style={{
                background: "#722ed1",
              }}
            >
              Download All as ZIP
            </Button>
          }
          bordered={false}
          style={{
            borderRadius: 16,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
          }}
        >
          <Table
            rowKey={(record, index) =>
              `${
                record.filename ||
                record.original_filename ||
                record.lottery_code
              }-${index}`
            }
            columns={columns}
            dataSource={splits}
            loading={loading}
            pagination={false}
            scroll={{ x: 1350 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    selectedDate
                      ? `No split files found for ${agent} on ${dayjs(
                          selectedDate,
                        ).format("DD MMM YYYY")}`
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

                    <Table.Summary.Cell index={3} />

                    <Table.Summary.Cell index={4} />

                    <Table.Summary.Cell index={5} align="right">
                      <Text strong>{totalRecords.toLocaleString()}</Text>
                    </Table.Summary.Cell>

                    <Table.Summary.Cell index={6} />

                    <Table.Summary.Cell index={7} />
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

export default SplitDownload;
