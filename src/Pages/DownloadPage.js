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
  listSessionsByDate,
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

const getLotterySortKey = (item) => {
  const code = normalizeLotteryCode(
    typeof item === "object"
      ? item?.lottery_code || item?.lottery_name || item?.code
      : item
  );
  const name = String(
    (typeof item === "object" &&
      (item?.lottery_name || item?.displayName || item?.name)) ||
      code
  )
    .trim()
    .toLowerCase();
  return name || code;
};

const SplitDownload = () => {
  const [selectedDate, setSelectedDate] = useState("");
  const [agent, setAgent] = useState("JAYAWAY");
  const [splits, setSplits] = useState([]);
  const [bulkFilter, setBulkFilter] = useState("all");
  const [dateSessions, setDateSessions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingBulk, setDownloadingBulk] = useState(null);
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
      let sessions = [];
      try {
        const listRes = await listSessionsByDate(date);
        sessions = listRes.data?.sessions || [];
      } catch (e) {
        sessions = [];
      }
      setDateSessions(sessions);

      const response = await getSplitsByDate(agentName, date);
      const splitData = Array.isArray(response.data) ? response.data : [];

      // Map session_id -> bulk_number from sessions list (authoritative)
      const sessBulk = {};
      sessions.forEach((s) => {
        sessBulk[s.session_id] = Number(s.bulk_number || 1);
      });

      const sortedSplits = [...splitData]
        .map((item) => {
          const bn = Number(
            item.bulk_number ??
              sessBulk[item.session_id] ??
              1
          );
          return {
            ...item,
            record_count: Number(item.record_count || 0),
            bulk_number: bn,
          };
        })
        .sort((a, b) => {
          if (a.bulk_number !== b.bulk_number) return a.bulk_number - b.bulk_number;
          return getLotterySortKey(a).localeCompare(getLotterySortKey(b), undefined, {
            sensitivity: "base",
          });
        });

      setSplits(sortedSplits);
      setBulkFilter("all");
    } catch (err) {
      console.error("Failed to load split files:", err);
      setSplits([]);
      setDateSessions([]);
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
    const rows = filteredSplits.length ? filteredSplits : splits;
    if (!rows.length) return;

    // Group by session/bulk and download each bulk ZIP separately
    const bySession = {};
    rows.forEach((r) => {
      const sid = r.session_id;
      if (!sid) return;
      if (!bySession[sid]) {
        bySession[sid] = { bulk: r.bulk_number || 1, rows: [] };
      }
      bySession[sid].rows.push(r);
    });

    const sessionIds = Object.keys(bySession);
    if (!sessionIds.length) {
      messageApi.error("Session information is missing.");
      return;
    }

    setDownloadingAll(true);
    try {
      for (const sid of sessionIds) {
        const bulk = bySession[sid].bulk;
        const response = await downloadAgentZip(sid, agent);
        const name =
          sessionIds.length > 1 || bulkFilter !== "all"
            ? `${agent}_bulk${bulk}_splits_${selectedDate}.zip`
            : `${agent}_splits_${selectedDate}.zip`;
        saveBlobToDevice(response, name);
      }
      messageApi.success(
        sessionIds.length > 1
          ? `Downloaded ${sessionIds.length} bulk ZIP archives for ${agent}.`
          : `${agent} split archive downloaded successfully.`
      );
    } catch (err) {
      console.error("ZIP download failed:", err);
      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Failed to download the split archive.";
      messageApi.error(errorMessage);
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleDownloadAll = () => {
    if (!selectedDate) {
      messageApi.warning("Please select a date.");
      return;
    }

    if (!filteredSplits.length) {
      messageApi.warning(
        bulkFilter === "all"
          ? `No split files are available for ${agent}.`
          : `No split files for ${Number(bulkFilter) === 1 ? "Initial" : `Bulk ${bulkFilter}`}.`
      );
      return;
    }

    // Single bulk selected → download only that bulk's ZIP
    if (bulkFilter !== "all") {
      const group = bulkGroups.find(
        (g) => Number(g.bulk_number) === Number(bulkFilter)
      );
      if (group?.session_id) {
        modalApi.confirm({
          title: `Download ${group.label} for ${agent}?`,
          icon: <FileZipOutlined style={{ color: "#722ed1" }} />,
          centered: true,
          content: (
            <div style={{ marginTop: 16 }}>
              <p>
                <strong>{group.label}</strong> — {group.files} file(s),{" "}
                {Number(group.records).toLocaleString()} records
              </p>
            </div>
          ),
          okText: "Download ZIP",
          onOk: async () => {
            await downloadOneBulk(group);
          },
        });
        return;
      }
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
            Scope: <strong>Both (Initial + all bulks)</strong>
          </p>
          <p style={{ marginBottom: 8 }}>
            Files: <strong>{filteredSplits.length}</strong>
          </p>
          <p style={{ marginBottom: 0 }}>
            Total records: <strong>{filteredRecords.toLocaleString()}</strong>
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


  const bulkOptions = useMemo(() => {
    const set = new Set(splits.map((s) => Number(s.bulk_number || 1)));
    return ["all", ...[...set].sort((a, b) => a - b)];
  }, [splits]);

  const bulkGroups = useMemo(() => {
    const map = {};
    // Prefer sessions for the date so every uploaded bulk appears in the filter
    (dateSessions || []).forEach((s) => {
      const bn = Number(s.bulk_number || 1);
      const sid = s.session_id;
      const key = sid || `bulk-${bn}`;
      map[key] = {
        key,
        session_id: sid,
        bulk_number: bn,
        label: bn === 1 ? "Initial" : `Bulk ${bn}`,
        files: 0,
        records: 0,
      };
    });
    splits.forEach((s) => {
      const bn = Number(s.bulk_number || 1);
      const sid = s.session_id;
      const key = sid || `bulk-${bn}`;
      if (!map[key]) {
        map[key] = {
          key,
          session_id: sid,
          bulk_number: bn,
          label: bn === 1 ? "Initial" : `Bulk ${bn}`,
          files: 0,
          records: 0,
        };
      }
      map[key].files += 1;
      map[key].records += Number(s.record_count || 0);
      if (sid) map[key].session_id = sid;
    });
    return Object.values(map).sort((a, b) => a.bulk_number - b.bulk_number);
  }, [splits, dateSessions]);

  const filteredSplits = useMemo(() => {
    if (bulkFilter === "all" || bulkFilter === "" || bulkFilter == null) {
      return splits;
    }
    const want = Number(bulkFilter);
    return splits.filter((s) => Number(s.bulk_number) === want);
  }, [splits, bulkFilter]);

  const filteredRecords = useMemo(
    () => filteredSplits.reduce((t, i) => t + Number(i.record_count || 0), 0),
    [filteredSplits]
  );

  const totalSerialRange = useMemo(() => {
    return filteredSplits.reduce((total, item) => {
      const start = Number(item.start_serial || 0);
      const end = Number(item.end_serial || 0);
      if (Number.isNaN(start) || Number.isNaN(end) || end < start) return total;
      return total + (end - start + 1);
    }, 0);
  }, [filteredSplits]);


  const downloadOneBulk = async (group) => {
    if (!group?.session_id) {
      messageApi.error("Session missing for this bulk.");
      return;
    }
    setDownloadingBulk(group.bulk_number);
    try {
      const response = await downloadAgentZip(group.session_id, agent);
      const label = group.bulk_number === 1 ? "Initial" : `Bulk${group.bulk_number}`;
      saveBlobToDevice(
        response,
        `${agent}_${label}_splits_${selectedDate}.zip`
      );
      messageApi.success(
        `${group.label} ZIP downloaded for ${agent} (${group.files} files).`
      );
    } catch (err) {
      console.error(err);
      messageApi.error(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          `Failed to download ${group.label} ZIP.`
      );
    } finally {
      setDownloadingBulk(null);
    }
  };

const columns = [
  {
    title: "#",
    key: "index",
    width: 45,
    align: "center",
    render: (_, __, index) => (
      <Text type="secondary">{index + 1}</Text>
    ),
  },
  {
    title: "Bulk",
    key: "bulk_number",
    width: 90,
    align: "center",
    render: (_, record) => {
      const bn = Number(record.bulk_number || 1);
      return (
        <Tag color={bn === 1 ? "blue" : "purple"}>
          {bn === 1 ? "Initial" : `Bulk ${bn}`}
        </Tag>
      );
    },
  },
  {
    title: "Lottery / Draw",
    key: "lottery",
    width: 240,
    render: (_, record) => {
      const code = normalizeLotteryCode(
        record.lottery_code || record.lottery_name,
      );

      return (
        <Space size={10}>
          <div
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
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
            {code.slice(0, 2).toUpperCase()}
          </div>

          <div>
            <Text strong style={{ display: "block" }}>
              {record.lottery_name ||
                record.lottery_code ||
                "Unknown"}
            </Text>

            <Space size={6} style={{ marginTop: 3 }}>
              <Text
                type="secondary"
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                }}
              >
                {record.lottery_code || code}
              </Text>

              <Tag
                color={record.draw_number ? "blue" : "default"}
                style={{
                  margin: 0,
                  fontSize: 11,
                }}
              >
                {record.draw_number
                  ? `Draw ${record.draw_number}`
                  : "No draw"}
              </Tag>
            </Space>
          </div>
        </Space>
      );
    },
  },

  {
    title: "Serial Range",
    key: "serialRange",
    width: 230,
    render: (_, record) => (
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Text
            type="secondary"
            style={{
              width: 38,
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            START
          </Text>

          <Text code>
            {record.start_serial || "—"}
          </Text>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 5,
          }}
        >
          <Text
            type="secondary"
            style={{
              width: 38,
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            END
          </Text>

          <Text code>
            {record.end_serial || "—"}
          </Text>
        </div>
      </div>
    ),
  },

  {
    title: "Records",
    dataIndex: "record_count",
    key: "record_count",
    width: 120,
    align: "right",
    render: (value) => (
      <Tag
        color={agent === "JAYAWAY" ? "purple" : "cyan"}
        style={{
          margin: 0,
          minWidth: 70,
          textAlign: "center",
          fontWeight: 600,
        }}
      >
        {Number(value || 0).toLocaleString()}
      </Tag>
    ),
  },

  {
    title: "File",
    key: "filename",
    width: 260,
    render: (_, record) => {
      const filename =
        record.original_filename ||
        record.filename ||
        "Split file";

      return (
        <Space size={8}>
          <DatabaseOutlined
            style={{
              color: "#8c8c8c",
            }}
          />

          <Text
            ellipsis={{
              tooltip: filename,
            }}
            style={{
              maxWidth: 210,
            }}
          >
            {filename}
          </Text>
        </Space>
      );
    },
  },

  {
    title: "",
    key: "download",
    width: 70,
    align: "center",
    fixed: "right",
    render: (_, record) => {
      const fileKey =
        record.filename ||
        record.original_filename ||
        `${record.lottery_code}-${record.draw_number}`;

      const isDownloading =
        downloadingFile === fileKey;

      return (
        <Button
          type="text"
          shape="circle"
          icon={<DownloadOutlined />}
          loading={isDownloading}
          disabled={downloadingAll}
          onClick={() => handleDownloadSingle(record)}
          style={{
            color:
              agent === "JAYAWAY"
                ? "#722ed1"
                : "#13c2c2",
          }}
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
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
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
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
              }}
            >
              <Statistic
                title="Split Files"
                value={filteredSplits.length}
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
                value={filteredRecords}
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
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
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
            <Space wrap size="middle">
              {bulkGroups.length > 0 && (
                <Select
                  value={String(bulkFilter)}
                  onChange={(v) => setBulkFilter(v === "all" ? "all" : Number(v))}
                  style={{ width: 160 }}
                  options={[
                    { value: "all", label: "Both" },
                    ...bulkGroups.map((g) => ({
                      value: String(g.bulk_number),
                      label: g.label,
                    })),
                  ]}
                />
              )}
              <Button
                type="primary"
                icon={<FileZipOutlined />}
                loading={downloadingAll || downloadingBulk != null}
                disabled={
                  loading || downloadingFile !== "" || filteredSplits.length === 0
                }
                onClick={handleDownloadAll}
                style={{
                  background: "#722ed1",
                }}
              >
                Download All as ZIP
              </Button>
            </Space>
          }
          bordered={false}
          style={{
            borderRadius: 16,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
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
            dataSource={filteredSplits}
            loading={loading}
            pagination={false}
            scroll={{ x: 900 }}
         
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    selectedDate
                      ? bulkFilter !== "all"
                        ? `No ${Number(bulkFilter) === 1 ? "Initial" : `Bulk ${bulkFilter}`} split files for ${agent} on ${dayjs(selectedDate).format("DD MMM YYYY")}. Split that bulk on the Split page first.`
                        : `No split files found for ${agent} on ${dayjs(selectedDate).format("DD MMM YYYY")}`
                      : "Select a date and agent"
                  }
                />
              ),
            }}
            summary={() =>
              filteredSplits.length > 0 ? (
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
                      <Text strong>{filteredRecords.toLocaleString()}</Text>
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