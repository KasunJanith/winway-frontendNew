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
} from "./api/index";

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

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
  const [loadingSession, setLoadingSession] = useState(true);

  const [sessionId, setSessionId] = useState(null);
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
      const sessionResponse = await getSessionByDate(date);
      const foundSessionId = sessionResponse.data?.session_id;

      if (!foundSessionId) {
        setSessionId(null);
        setLotteries([]);
        return;
      }

      setSessionId(foundSessionId);

      const lotteryResponse =
        await getSessionLotteries(foundSessionId);

      const lotteryData = Array.isArray(lotteryResponse.data)
        ? lotteryResponse.data
        : [];

      const sortedLotteries = [...lotteryData].sort((a, b) => {
        const codeA = normalizeLotteryCode(
          a.lottery_code || a.lottery_name,
        );

        const codeB = normalizeLotteryCode(
          b.lottery_code || b.lottery_name,
        );

        const indexA = LOTTERY_ORDER.indexOf(codeA);
        const indexB = LOTTERY_ORDER.indexOf(codeB);

        const safeIndexA =
          indexA === -1 ? LOTTERY_ORDER.length : indexA;

        const safeIndexB =
          indexB === -1 ? LOTTERY_ORDER.length : indexB;

        return safeIndexA - safeIndexB;
      });

      setLotteries(sortedLotteries);
    } catch (err) {
      console.error("Failed to load upload session:", err);

      setSessionId(null);
      setLotteries([]);
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

    const validExtension =
      extension === "zip" || extension === "rar";

    if (!validExtension) {
      messageApi.error(
        "Only ZIP and RAR archive files are allowed.",
      );

      return Upload.LIST_IGNORE;
    }

    const isBelowLimit =
      selectedFile.size / 1024 / 1024 <= 100;

    if (!isBelowLimit) {
      messageApi.error(
        "Archive file must be smaller than 100 MB.",
      );

      return Upload.LIST_IGNORE;
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
      await uploadArchive(selectedFile, selectedDate);

      messageApi.success({
        content: "Archive uploaded successfully.",
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

      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Upload failed. Please check the archive and try again.";

      setError(errorMessage);
      messageApi.error(errorMessage);

      throw err;
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
              type="warning"
              showIcon
              message="An archive already exists for this date"
              description="Uploading a new archive may replace or update the current session data."
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
    uploadedFileCount === LOTTERY_ORDER.length;

  const uploadProgress = Math.min(
    (uploadedFileCount / LOTTERY_ORDER.length) * 100,
    100,
  );

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
                suffix={`/ ${LOTTERY_ORDER.length}`}
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
                  The archive must contain exactly eight
                  DBF files.
                </div>

                <div>
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
                    {LOTTERY_ORDER.length} DBF files
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
