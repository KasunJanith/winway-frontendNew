import { useEffect, useMemo, useState } from "react";
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
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  Upload,
  Checkbox,
  Select,
} from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  DatabaseOutlined,
  FileZipOutlined,
  NumberOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  uploadArchive,
  getSessionByDate,
  getSessionLotteries,
  getLatestOrderDate,
  listSessionsByDate,
  getOrderBulks,
} from "./api/index";

import {
  loadConfig,
  isValidationEnabled,
} from "../config/splitterConfig";

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

// Load active lotteries from settings (falls back to defaults)
const getLotterySortKey = (item) => {
  const code = String(
    (typeof item === "object"
      ? item?.lottery_code || item?.lottery_name || item?.code
      : item) || ""
  )
    .trim()
    .toLowerCase();
  const name = String(
    (typeof item === "object" && (item?.lottery_name || item?.displayName || item?.name)) ||
      code
  )
    .trim()
    .toLowerCase();
  return name || code;
};

const getActiveLotteryOrder = () => {
  const cfg = loadConfig();
  return (cfg.lotteries || [])
    .filter((l) => l.active !== false)
    .map((l) => l.code);
};


const normalizeLotteryCode = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized.includes("ada sampatha")) return "ada";
  if (normalized.includes("dhana") || normalized.includes("dana")) {
    return "dana";
  }

  if (
    normalized.includes("govi") ||
    normalized.includes("govi setha") ||
    normalized.includes("govisetha")
  ) {
    return "govi";
  }

  if (normalized.includes("handahana")) return "hada";

  if (
    normalized.includes("mahajana") ||
    normalized.includes("maha")
  ) {
    return "maha";
  }

  if (
    normalized.includes("mega power") ||
    normalized.includes("mgap")
  ) {
    return "mgap";
  }

  if (
    normalized.includes("nlb jaya") ||
    normalized === "jaya" ||
    normalized.includes("jaya")
  ) {
    return "jaya";
  }

  if (
    normalized.includes("suba dawasak") ||
    normalized.includes("suba")
  ) {
    return "suba";
  }

  return normalized;
};

const UploadPage = () => {
  const [selectedDate, setSelectedDate] = useState("");
  const [fileList, setFileList] = useState([]);

  const [uploading, setUploading] = useState(false);
  const [isBulk, setIsBulk] = useState(false);
  const [selectedBulkNumber, setSelectedBulkNumber] = useState(2);
  const [loadingSession, setLoadingSession] = useState(true);

  const [sessionId, setSessionId] = useState(null);
  const [bulkSessions, setBulkSessions] = useState([]);
  const [orderBulks, setOrderBulks] = useState([]);
  const [lotteries, setLotteries] = useState([]);
  const [error, setError] = useState("");

  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();

  useEffect(() => {
    loadLatestDate();
  }, []);

  const loadLatestDate = async () => {
    setLoadingSession(true);
    setError("");

    try {
      const response = await getLatestOrderDate();
      const latestDate = response.data?.date;

      if (latestDate) {
        setSelectedDate(latestDate);
        await loadSession(latestDate);
      } else {
        const today = dayjs().format("YYYY-MM-DD");

        setSelectedDate(today);
        await loadSession(today);
      }
    } catch (err) {
      console.error("Failed to load latest order date:", err);

      const today = dayjs().format("YYYY-MM-DD");

      setSelectedDate(today);
      await loadSession(today);
    } finally {
      setLoadingSession(false);
    }
  };

  const loadSession = async (date) => {
    if (!date) return;

    setLoadingSession(true);
    setError("");

    try {
      try {
        const bulkRes = await getOrderBulks(date);
        setOrderBulks(bulkRes.data?.bulks || []);
      } catch (e) {
        setOrderBulks([]);
      }

      let sessions = [];
      try {
        const listRes = await listSessionsByDate(date);
        sessions = listRes.data?.sessions || [];
      } catch (e) {
        sessions = [];
      }

      // Sort each bulk's lotteries alphabetically
      sessions = sessions.map((s) => ({
        ...s,
        lotteries: [...(s.lotteries || [])].sort((a, b) =>
          getLotterySortKey(a).localeCompare(getLotterySortKey(b), undefined, {
            sensitivity: "base",
          })
        ),
      }));
      setBulkSessions(sessions);

      if (!sessions.length) {
        // Fallback to single session API
        const sessionResponse = await getSessionByDate(date);
        const foundSessionId = sessionResponse.data?.session_id;
        if (!foundSessionId) {
          setSessionId(null);
          setLotteries([]);
          return;
        }
        setSessionId(foundSessionId);
        const lotteryResponse = await getSessionLotteries(foundSessionId);
        const lotteryData = Array.isArray(lotteryResponse.data)
          ? lotteryResponse.data
          : [];
        const sortedLotteries = [...lotteryData].sort((a, b) =>
          getLotterySortKey(a).localeCompare(getLotterySortKey(b), undefined, {
            sensitivity: "base",
          })
        );
        setLotteries(sortedLotteries);
        return;
      }

      // Latest bulk as "active" session
      const latest = sessions[sessions.length - 1];
      setSessionId(latest.session_id);
      // Flatten all lottery rows across bulks for summary stats (tag with bulk)
      const allRows = [];
      sessions.forEach((s) => {
        (s.lotteries || []).forEach((lf) => {
          allRows.push({
            ...lf,
            bulk_number: s.bulk_number,
            session_id: s.session_id,
            bulk_filename: s.original_filename,
          });
        });
      });
      allRows.sort((a, b) => {
        const byName = getLotterySortKey(a).localeCompare(
          getLotterySortKey(b),
          undefined,
          { sensitivity: "base" }
        );
        if (byName !== 0) return byName;
        return (a.bulk_number || 1) - (b.bulk_number || 1);
      });
      setLotteries(allRows);
    } catch (err) {
      console.error("Failed to load upload session:", err);
      setSessionId(null);
      setLotteries([]);
      setBulkSessions([]);
    } finally {
      setLoadingSession(false);
    }
  };

  const handleDateChange = async (date) => {
    if (!date) return;

    const formattedDate = date.format("YYYY-MM-DD");

    setSelectedDate(formattedDate);
    setFileList([]);
    setError("");

    await loadSession(formattedDate);
  };

  const beforeUpload = (selectedFile) => {
    const extension = selectedFile.name
      .split(".")
      .pop()
      ?.toLowerCase();

    // Validation: require ZIP or RAR (can be toggled in Splitter Settings)
    if (isValidationEnabled("requireArchiveExtension")) {
      const validExtension =
        extension === "zip" || extension === "rar";

      if (!validExtension) {
        messageApi.error(
          "Only ZIP and RAR archive files are allowed.",
        );

        return Upload.LIST_IGNORE;
      }
    }

    // Validation: enforce 100 MB size limit (can be toggled in Splitter Settings)
    if (isValidationEnabled("requireFileSizeLimit")) {
      const isBelowLimit =
        selectedFile.size / 1024 / 1024 <= 100;

      if (!isBelowLimit) {
        messageApi.error(
          "Archive file must be smaller than 100 MB.",
        );

        return Upload.LIST_IGNORE;
      }
    }

    setFileList([selectedFile]);
    setError("");

    return false;
  };

  const handleRemoveFile = () => {
    setFileList([]);
    return true;
  };

  const validateUpload = () => {
    if (!selectedDate) {
      messageApi.warning(
        "Please select a draw date before uploading.",
      );

      return false;
    }

    if (!fileList.length) {
      messageApi.warning(
        "Please select a ZIP or RAR archive.",
      );

      return false;
    }

    return true;
  };

  const uploadSelectedArchive = async () => {
    const selectedFile = fileList[0];

    if (!selectedFile) return;

    setUploading(true);
    setError("");

    try {
      const targetBulk = isBulk
        ? (selectedBulkNumber || (orderBulks.find((b) => b.bulk_number > 1)?.bulk_number) || 2)
        : 1;
      const uploadRes = await uploadArchive(selectedFile, selectedDate, {
        isBulk: targetBulk > 1,
        bulkNumber: targetBulk,
      });
      const data = uploadRes?.data || uploadRes || {};
      const wasMerged = Boolean(data.merged);
      const totalNow = data.total_lotteries;

      messageApi.success({
        content: wasMerged
          ? `Files merged into existing session${totalNow != null ? ` (${totalNow} lottery file(s) total)` : ""}.`
          : "Archive uploaded successfully.",
        icon: (
          <CheckCircleOutlined
            style={{ color: "#52c41a" }}
          />
        ),
      });

      setFileList([]);

      await loadSession(selectedDate);
    } catch (err) {
      console.error("Archive upload failed:", err);

      // FastAPI may return detail as string or list of validation errors
      let errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        "Upload failed. Please check the archive and try again.";

      if (Array.isArray(errorMessage)) {
        errorMessage = errorMessage
          .map((e) => (typeof e === "object" ? e.msg || JSON.stringify(e) : String(e)))
          .join("; ");
      }

      setError(String(errorMessage));
      messageApi.error({
        content: String(errorMessage),
        duration: 8,
      });

      // Do NOT rethrow — avoids React "Uncaught runtime errors" overlay
      // and lets the Modal close cleanly after the user sees the message.
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = () => {
    if (!validateUpload()) return;

    const selectedFile = fileList[0];

    modalApi.confirm({
      title: "Upload DBF archive?",
      icon: (
        <CloudUploadOutlined
          style={{ color: "#1677ff" }}
        />
      ),
      centered: true,
      width: 500,
      content: (
        <div style={{ marginTop: 16 }}>
          <Descriptions
            size="small"
            column={1}
            bordered
          >
            <Descriptions.Item label="File">
              <Text strong>{selectedFile.name}</Text>
            </Descriptions.Item>

            <Descriptions.Item label="Draw date">
              <Text strong>
                {dayjs(selectedDate).format(
                  "DD MMMM YYYY",
                )}
              </Text>
            </Descriptions.Item>

            <Descriptions.Item label="File size">
              <Text strong>
                {(
                  selectedFile.size /
                  1024 /
                  1024
                ).toFixed(2)}{" "}
                MB
              </Text>
            </Descriptions.Item>
          </Descriptions>

          {sessionId && (
            <Alert
              type="info"
              showIcon
              message="An archive already exists for this date"
              description={
                isValidationEnabled("requireExactFileCount")
                  ? "Uploading a new archive will create a new session for this date."
                  : "Exact file count is OFF — new files will be merged into the existing session (missing lotteries can be added later)."
              }
              style={{ marginTop: 16 }}
            />
          )}
        </div>
      ),
      okText: "Upload Archive",
      cancelText: "Cancel",
      onOk: async () => {
        await uploadSelectedArchive();
      },
    });
  };

  const totalRecords = useMemo(() => {
    return lotteries.reduce(
      (total, lottery) =>
        total + Number(lottery.record_count || 0),
      0,
    );
  }, [lotteries]);

  const uploadedFileCount = lotteries.length;

  const completeArchive =
    uploadedFileCount === getActiveLotteryOrder().length;

  const uploadProgress = Math.min(
    (uploadedFileCount / getActiveLotteryOrder().length) * 100,
    100,
  );

  const columns = [
    {
      title: "#",
      key: "index",
      width: 50,
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
      render: (_, record) => (
        <Tag color="blue">Bulk #{record.bulk_number || 1}</Tag>
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
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
              {value || record.lottery_code || "Unknown"}
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
      title: "Draw Number",
      dataIndex: "draw_number",
      key: "draw_number",
      width: 150,
      align: "center",
      render: (value) =>
        value ? (
          <Tag
            color="blue"
            icon={<NumberOutlined />}
          >
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
      title: "Start Serial",
      dataIndex: "start_serial",
      key: "start_serial",
      width: 180,
      render: (value) => (
        <Text code>{value || "-"}</Text>
      ),
    },
    {
      title: "End Serial",
      dataIndex: "end_serial",
      key: "end_serial",
      width: 180,
      render: (value) => (
        <Text code>{value || "-"}</Text>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 130,
      align: "center",
      render: (_, record) => {
        const hasRecords =
          Number(record.record_count || 0) > 0;

        const hasSerialRange =
          record.start_serial && record.end_serial;

        if (hasRecords && hasSerialRange) {
          return <Tag color="success">Ready</Tag>;
        }

        if (hasRecords) {
          return <Tag color="warning">Check serials</Tag>;
        }

        return <Tag color="error">Empty</Tag>;
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
                Upload DBF Archive
              </Title>

              <Text type="secondary">
                Upload the DBF archive for the selected
                lottery draw date.
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
            message="Archive upload error"
            description={error}
            style={{ marginBottom: 24 }}
            onClose={() => setError("")}
          />
        )}

        <Row
          gutter={[20, 20]}
          style={{ marginBottom: 24 }}
        >
          <Col xs={24} sm={12} xl={8}>
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
                title="Uploaded DBF Files"
                value={uploadedFileCount}
                suffix={`/ ${getActiveLotteryOrder().length}`}
                prefix={
                  <FileZipOutlined
                    style={{ color: "#1677ff" }}
                  />
                }
                valueStyle={{ fontWeight: 700 }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} xl={8}>
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
                title="Total Uploaded Records"
                value={totalRecords}
                prefix={
                  <DatabaseOutlined
                    style={{ color: "#722ed1" }}
                  />
                }
                valueStyle={{ fontWeight: 700 }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} xl={8}>
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
                title="Archive Status"
                value={
                  completeArchive
                    ? "Complete"
                    : sessionId
                      ? "Partial"
                      : "Not uploaded"
                }
                prefix={
                  completeArchive ? (
                    <CheckCircleOutlined
                      style={{ color: "#52c41a" }}
                    />
                  ) : (
                    <CloudUploadOutlined
                      style={{
                        color: sessionId
                          ? "#fa8c16"
                          : "#8c8c8c",
                      }}
                    />
                  )
                }
                valueStyle={{
                  fontWeight: 700,
                  color: completeArchive
                    ? "#52c41a"
                    : sessionId
                      ? "#fa8c16"
                      : "#8c8c8c",
                }}
              />
            </Card>
          </Col>
        </Row>

        <Card
          title={
            <Space>
              <CloudUploadOutlined
                style={{ color: "#1677ff" }}
              />
              <span>Select Archive</span>
            </Space>
          }
          bordered={false}
          style={{
            marginBottom: 24,
            borderRadius: 16,
            boxShadow:
              "0 4px 16px rgba(0, 0, 0, 0.04)",
          }}
        >
          <Alert
            type="info"
            showIcon
            message="Archive requirements"
            description={
              <div>
                <div>
                  The archive must contain{" "}
                  {isValidationEnabled("requireExactFileCount") ? (
                    <>
                      exactly <strong>{getActiveLotteryOrder().length}</strong> DBF
                      files (one per active lottery).
                    </>
                  ) : (
                    <>
                      DBF files for the lotteries being processed (exact
                      count check is currently{" "}
                      <strong>disabled</strong> in Splitter Settings).
                    </>
                  )}
                </div>

                <div style={{ marginTop: 6 }}>
                  DBF filenames are matched{" "}
                  <strong>case-insensitively</strong> by prefix — e.g.{" "}
                  <Text code>jaya0595.DBF</Text>,{" "}
                  <Text code>JAYA0595.dbf</Text>, and{" "}
                  <Text code>Jaya0595.dbf</Text> are all accepted.{" "}
                  The <strong>draw number must be exact</strong>.
                </div>

                <div style={{ marginTop: 6 }}>
                  Example DBF filename:{" "}
                  <Text code>ada0786.dbf</Text>
                </div>

                <div>
                  Example archive filename:{" "}
                  <Text code>
                    2026 06 05 DBS.zip
                  </Text>
                </div>
              </div>
            }
            style={{ marginBottom: 20 }}
          />

          
          {orderBulks.filter((b) => b.bulk_number > 1).length > 0 && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 12 }}
              message="Additional bulk orders exist for this date"
              description={
                <div>
                  {orderBulks
                    .filter((b) => b.bulk_number > 1)
                    .map((b) => {
                      const uploaded = bulkSessions.some(
                        (s) => Number(s.bulk_number) === Number(b.bulk_number)
                      );
                      return (
                        <div key={b.bulk_number}>
                          <Tag color={uploaded ? "green" : "orange"}>
                            {b.label}
                          </Tag>{" "}
                          {b.lottery_count} lottery(ies),{" "}
                          {Number(b.total_records || 0).toLocaleString()} records —{" "}
                          {uploaded ? "uploaded" : "awaiting upload"}
                        </div>
                      );
                    })}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Upload the Initial archive first. Upload each bulk when you receive it.
                  </Text>
                </div>
              }
            />
          )}
          <div style={{ marginBottom: 12 }}>
            <Checkbox
              checked={isBulk}
              onChange={(e) => setIsBulk(e.target.checked)}
            >
              <Text strong>This is a bulk (additional) shipment — not the initial archive</Text>
            </Checkbox>
            {isBulk && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ marginRight: 8 }}>
                  Order bulk to match:
                </Text>
                <Select
                  style={{ width: 160 }}
                  value={selectedBulkNumber}
                  onChange={setSelectedBulkNumber}
                  options={(orderBulks.filter((b) => b.bulk_number > 1).length
                    ? orderBulks.filter((b) => b.bulk_number > 1)
                    : [{ bulk_number: 2, label: "Bulk 2" }]
                  ).map((b) => ({
                    value: b.bulk_number,
                    label: b.label || `Bulk ${b.bulk_number}`,
                  }))}
                />
              </div>
            )}
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Initial upload = bulk 1. Bulk uploads are stored and split separately from the initial archive.
              </Text>
            </div>
          </div>
<Dragger
            accept=".zip,.rar"
            multiple={false}
            maxCount={1}
            fileList={fileList}
            beforeUpload={beforeUpload}
            onRemove={handleRemoveFile}
            disabled={uploading}
          >
            <p className="ant-upload-drag-icon">
              <FileZipOutlined />
            </p>

            <p className="ant-upload-text">
              Click or drag a ZIP/RAR archive to this
              area
            </p>

            <p className="ant-upload-hint">
              Only one archive can be uploaded at a
              time. Maximum file size is 100 MB.
            </p>
          </Dragger>

          {fileList.length > 0 && (
            <Card
              size="small"
              style={{
                marginTop: 16,
                background: "#fafafa",
              }}
            >
              <Row
                gutter={[16, 16]}
                align="middle"
                justify="space-between"
              >
                <Col>
                  <Space>
                    <FileZipOutlined
                      style={{
                        color: "#1677ff",
                        fontSize: 20,
                      }}
                    />

                    <div>
                      <Text strong>
                        {fileList[0].name}
                      </Text>

                      <div>
                        <Text
                          type="secondary"
                          style={{ fontSize: 12 }}
                        >
                          {(
                            fileList[0].size /
                            1024 /
                            1024
                          ).toFixed(2)}{" "}
                          MB
                        </Text>
                      </div>
                    </div>
                  </Space>
                </Col>

                <Col>
                  <Tag color="blue">
                    Ready to upload
                  </Tag>
                </Col>
              </Row>
            </Card>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 20,
            }}
          >
            <Button
              type="primary"
              size="large"
              icon={<UploadOutlined />}
              loading={uploading}
              disabled={
                !fileList.length ||
                !selectedDate ||
                uploading
              }
              onClick={handleUpload}
              style={{ minWidth: 180 }}
            >
              Upload Archive
            </Button>
          </div>
        </Card>

        {sessionId && (
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
            >
              <Col xs={24} lg={8}>
                <Text strong>
                  Archive completeness
                </Text>

                <div style={{ marginTop: 4 }}>
                  <Text type="secondary">
                    {uploadedFileCount} of{" "}
                    {getActiveLotteryOrder().length} DBF files
                    detected
                  </Text>
                </div>
              </Col>

              <Col xs={24} lg={16}>
                <Progress
                  percent={Number(
                    uploadProgress.toFixed(1),
                  )}
                  status={
                    completeArchive
                      ? "success"
                      : "active"
                  }
                />
              </Col>
            </Row>
          </Card>
        )}

        <Card
          title={
            <Space>
              <DatabaseOutlined
                style={{ color: "#1677ff" }}
              />
              <span>Uploaded Files</span>
            </Space>
          }
          extra={
            sessionId ? (
              <Tag
                color={
                  completeArchive
                    ? "success"
                    : "warning"
                }
              >
                {completeArchive
                  ? "Archive complete"
                  : `${uploadedFileCount}/8 files`}
              </Tag>
            ) : (
              <Tag>No session</Tag>
            )
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
              `${record.lottery_code || record.lottery_name}-${index}`
            }
            columns={columns}
            dataSource={lotteries}
            loading={loadingSession}
            pagination={false}
            scroll={{ x: 1050 }}
            locale={{
              emptyText: (
                <Empty
                  image={
                    Empty.PRESENTED_IMAGE_SIMPLE
                  }
                  description={
                    selectedDate
                      ? "No archive uploaded for this date"
                      : "Select a draw date"
                  }
                />
              ),
            }}
            summary={() =>
              lotteries.length > 0 ? (
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
                        {totalRecords.toLocaleString()}
                      </Text>
                    </Table.Summary.Cell>

                    <Table.Summary.Cell
                      index={4}
                    />

                    <Table.Summary.Cell
                      index={5}
                    />

                    <Table.Summary.Cell
                      index={6}
                    />
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

export default UploadPage;