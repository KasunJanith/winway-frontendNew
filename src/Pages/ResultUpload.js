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
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  Upload,
} from "antd";
import {
  CalendarOutlined,
  CloudUploadOutlined,
  DatabaseOutlined,
  FileDoneOutlined,
  FileZipOutlined,
  InboxOutlined,
  NumberOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  uploadWinningArchive,
  getLatestOrderDate,
  getWinningFilesByDate,
} from "./api/index";

import { formatDate } from "../utils/dateUtils";

const { Title, Text } = Typography;
const { Dragger } = Upload;

const ResultUpload = () => {
  const [date, setDate] = useState("");
  const [file, setFile] = useState(null);
  const [fileList, setFileList] = useState([]);

  const [uploading, setUploading] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState("");

  const [existingFiles, setExistingFiles] = useState([]);
  const [existingSessionId, setExistingSessionId] = useState(null);

  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();

  useEffect(() => {
    (async () => {
      try {
        const res = await getLatestOrderDate();

        if (res.data.date) {
          setDate(res.data.date);
          fetchExistingFiles(res.data.date);
        }
      } catch (e) {
        console.error("Failed to load latest order date:", e);
      }
    })();
  }, []);

  useEffect(() => {
    if (date) {
      fetchExistingFiles(date);
      setUploadResult(null);
    }
  }, [date]);

  const fetchExistingFiles = async (selectedDate) => {
    setLoadingFiles(true);

    try {
      const res = await getWinningFilesByDate(selectedDate);

      if (res.data.session_id) {
        setExistingSessionId(res.data.session_id);
        setExistingFiles(res.data.files || []);
      } else {
        setExistingSessionId(null);
        setExistingFiles([]);
      }
    } catch (e) {
      console.error(e);
      setExistingSessionId(null);
      setExistingFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  const uploadArchive = async () => {
    setUploading(true);
    setError("");

    try {
      const res = await uploadWinningArchive(file, date);

      setUploadResult(res.data);
      setFile(null);
      setFileList([]);

      messageApi.success("Winning archive uploaded successfully.");

      fetchExistingFiles(date);
    } catch (e) {
      const errorMessage = e.response?.data?.detail || "Upload failed";

      setError(errorMessage);
      messageApi.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      messageApi.warning("Please select an archive file.");
      return;
    }

    if (!date) {
      messageApi.warning("Please select a date.");
      return;
    }

    modalApi.confirm({
      title: "Upload winning archive?",
      icon: <CloudUploadOutlined style={{ color: "#1677ff" }} />,
      centered: true,
      width: 500,
      content: (
        <div style={{ marginTop: 16 }}>
          <p style={{ marginBottom: 8 }}>
            Date: <strong>{formatDate(date)}</strong>
          </p>

          <p style={{ marginBottom: 8 }}>
            File: <strong>{file.name}</strong>
          </p>

          <p style={{ marginBottom: 0 }}>
            The archive will be uploaded and processed for the selected date.
          </p>
        </div>
      ),
      okText: "Upload Archive",
      cancelText: "Cancel",
      onOk: uploadArchive,
    });
  };

  const handleDateChange = (selectedDate) => {
    if (!selectedDate) {
      setDate("");
      setExistingSessionId(null);
      setExistingFiles([]);
      return;
    }

    setDate(selectedDate.format("YYYY-MM-DD"));
  };

  const handleFileChange = ({ fileList: selectedFiles }) => {
    const latestFileList = selectedFiles.slice(-1);
    const selectedFile = latestFileList[0]?.originFileObj || null;

    setFileList(latestFileList);
    setFile(selectedFile);
    setError("");
    setUploadResult(null);
  };

  const totalRecords = useMemo(() => {
    return existingFiles.reduce(
      (total, item) => total + Number(item.record_count || 0),
      0,
    );
  }, [existingFiles]);

  const totalPrice = useMemo(() => {
    return existingFiles.reduce(
      (total, item) => total + Number(item.total_price || 0),
      0,
    );
  }, [existingFiles]);

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
      width: 280,
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
            {String(record.lottery_code || value || "LO")
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
                {record.lottery_code || "No code"}
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
      width: 160,
      align: "right",
      render: (value) => (
        <Text strong>{Number(value || 0).toLocaleString()}</Text>
      ),
    },
    {
      title: "Total Price",
      dataIndex: "total_price",
      key: "total_price",
      width: 200,
      align: "right",
      render: (value) => (
        <Text strong>Rs. {Number(value || 0).toLocaleString()}</Text>
      ),
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
                Upload Winning Files
              </Title>

              <Text type="secondary">
                Upload a ZIP or RAR winning archive for the selected date.
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
              </Space>
            </Col>
          </Row>
        </Card>

        {error && (
          <Alert
            showIcon
            closable
            type="error"
            message="Upload failed"
            description={error}
            style={{ marginBottom: 24 }}
            onClose={() => setError("")}
          />
        )}

        {uploadResult && (
          <Alert
            showIcon
            closable
            type="success"
            message="Winning archive uploaded successfully"
            description={
              <span>
                Session ID:{" "}
                <Text code copyable>
                  {uploadResult.session_id}
                </Text>
              </span>
            }
            style={{ marginBottom: 24 }}
            onClose={() => setUploadResult(null)}
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
                title="Uploaded Files"
                value={existingFiles.length}
                prefix={<FileDoneOutlined style={{ color: "#1677ff" }} />}
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
                title="Session Status"
                value={existingSessionId ? "Available" : "Not Available"}
                prefix={
                  <FileZipOutlined
                    style={{
                      color: existingSessionId ? "#52c41a" : "#faad14",
                    }}
                  />
                }
                valueStyle={{
                  fontWeight: 700,
                  fontSize: 22,
                  color: existingSessionId ? "#52c41a" : "#faad14",
                }}
              />
            </Card>
          </Col>
        </Row>

        <Card
          title={
            <Space>
              <CloudUploadOutlined style={{ color: "#1677ff" }} />
              <span>Upload New Archive</span>
            </Space>
          }
          bordered={false}
          style={{
            marginBottom: 24,
            borderRadius: 16,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
          }}
        >
          <Dragger
            accept=".zip,.rar"
            maxCount={1}
            fileList={fileList}
            beforeUpload={() => false}
            onChange={handleFileChange}
            onRemove={() => {
              setFile(null);
              setFileList([]);
            }}
            disabled={uploading}
            style={{
              borderRadius: 12,
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>

            <p className="ant-upload-text">
              Click or drag the winning archive here
            </p>

            <p className="ant-upload-hint">
              Only ZIP and RAR archive files are supported.
            </p>
          </Dragger>

          <div style={{ marginTop: 20 }}>
            <Button
              type="primary"
              size="large"
              icon={<CloudUploadOutlined />}
              loading={uploading}
              disabled={!file || !date}
              onClick={handleUpload}
            >
              Upload Archive
            </Button>
          </div>
        </Card>

        <Card
          title={
            <Space>
              <FileZipOutlined style={{ color: "#1677ff" }} />
              <span>
                Uploaded Files for {date ? formatDate(date) : "Selected Date"}
              </span>
            </Space>
          }
          bordered={false}
          style={{
            borderRadius: 16,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
          }}
        >
          {existingSessionId && (
            <Alert
              showIcon
              type="info"
              message={
                <span>
                  Session ID:{" "}
                  <Text code copyable>
                    {existingSessionId}
                  </Text>
                </span>
              }
              style={{ marginBottom: 20 }}
            />
          )}

          <Table
            rowKey={(record, index) =>
              `${record.lottery_code || record.lottery_name}-${index}`
            }
            columns={columns}
            dataSource={existingFiles}
            loading={loadingFiles}
            pagination={false}
            scroll={{ x: 900 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    date
                      ? "No winning files uploaded for this date."
                      : "Select a date to view uploaded files."
                  }
                />
              ),
            }}
            summary={() =>
              existingFiles.length > 0 ? (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} />

                    <Table.Summary.Cell index={1}>
                      <Text strong>Total</Text>
                    </Table.Summary.Cell>

                    <Table.Summary.Cell index={2} />

                    <Table.Summary.Cell index={3} align="right">
                      <Text strong>{totalRecords.toLocaleString()}</Text>
                    </Table.Summary.Cell>

                    <Table.Summary.Cell index={4} align="right">
                      <Text strong>Rs. {totalPrice.toLocaleString()}</Text>
                    </Table.Summary.Cell>
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

export default ResultUpload;
