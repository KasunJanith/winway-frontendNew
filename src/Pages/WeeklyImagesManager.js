
import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Card,
  Row,
  Col,
  Statistic,
  Spin,
  Divider,
  message,
  Button,
  Typography,
  Space,
  Tooltip,
  Modal,
  Popconfirm,
  Tag,
  Empty,
} from "antd";
import {
  FileImageOutlined,
  FileExcelOutlined,
  FileZipOutlined,
  FileTextOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { saveAs } from "file-saver";

import { ENV } from "../config/env";
const API_BASE = ENV.API_BASE_LOCAL;

const { Title, Text } = Typography;

function WeeklyImagesManager() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);

    try {
      const res = await axios.get(`${API_BASE}/weekly-images`);
      setFiles(res.data?.files || []);
    } catch {
      message.error("Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // ---------------- METRICS ----------------
  const totalSizeKB = useMemo(() => {
    if (!files.length) return 0;

    return (files.reduce((sum, file) => sum + file.size_bytes, 0) / 1024).toFixed(2);
  }, [files]);

  // ---------------- FILE ICON ----------------
  const getFileIcon = (ext) => {
    switch (ext) {
      case ".png":
      case ".jpg":
      case ".jpeg":
      case ".gif":
      case ".webp":
        return <FileImageOutlined style={{ color: "#faad14" }} />;

      case ".csv":
      case ".xlsx":
        return <FileExcelOutlined style={{ color: "#52c41a" }} />;

      case ".zip":
        return <FileZipOutlined style={{ color: "#722ed1" }} />;

      default:
        return <FileTextOutlined style={{ color: "#8c8c8c" }} />;
    }
  };

  const isImage = (ext) =>
    [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext);

  // ---------------- DELETE SINGLE FILE ----------------
  const deleteFile = async (filename) => {
    try {
      await axios.delete(
        `${API_BASE}/weekly-images/${encodeURIComponent(filename)}`
      );

      message.success("File deleted successfully");
      fetchFiles();
    } catch {
      message.error("Delete failed");
    }
  };

  // ---------------- DOWNLOAD SELECTED AS ZIP ----------------
  const downloadZip = async () => {
    if (!selectedRowKeys.length) {
      message.warning("No files selected");
      return;
    }

    try {
      const res = await axios.post(
        `${API_BASE}/weekly-images/download-zip`,
        { files: selectedRowKeys },
        { responseType: "blob" }
      );

      saveAs(res.data, `weekly_files_${Date.now()}.zip`);
      message.success("ZIP downloaded");
    } catch {
      message.error("ZIP download failed");
    }
  };

  // ---------------- DELETE SELECTED ----------------
  const deleteSelected = async () => {
    if (!selectedRowKeys.length) {
      message.warning("No files selected");
      return;
    }

    try {
      setLoading(true);

      for (const filename of selectedRowKeys) {
        await axios.delete(
          `${API_BASE}/weekly-images/${encodeURIComponent(filename)}`
        );
      }

      message.success("Selected files deleted successfully");
      setSelectedRowKeys([]);
      fetchFiles();
    } catch (err) {
      console.error(err);
      message.error("Some files failed to delete");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- EMAIL ALL WEEKLY FILES ----------------
  const emailAllWeeklyFiles = async () => {
    try {
      setSendingEmail(true);

      await axios.post(`${API_BASE}/email/all-weekly-files`);

      message.success(
        "📧 Weekly files sent successfully to chamikadeshan97@gmail.com"
      );

      setEmailModalOpen(false);
    } catch {
      message.error("Failed to send weekly files");
    } finally {
      setSendingEmail(false);
    }
  };

  // ---------------- TABLE ----------------
  const columns = [
    {
      title: "Preview",
      width: 120,
      align: "center",
      render: (_, record) =>
        isImage(record.extension) ? (
          <img
            src={`${API_BASE}/weekly-images/view/${encodeURIComponent(record.name)}`}
            alt={record.name}
            style={{
              width: 80,
              height: 60,
              objectFit: "cover",
              borderRadius: 8,
              cursor: "pointer",
              border: "1px solid #f0f0f0",
            }}
            onClick={() => {
              setPreviewImage(
                `${API_BASE}/weekly-images/view/${encodeURIComponent(record.name)}`
              );
              setPreviewOpen(true);
            }}
          />
        ) : (
          getFileIcon(record.extension)
        ),
    },
    {
      title: "File Name",
      dataIndex: "name",
      render: (name, record) => (
        <div>
          <Space>
            {getFileIcon(record.extension)}
            <Text strong>{name}</Text>
          </Space>

          <div style={{ fontSize: 12, color: "#999" }}>
            {record.modified
              ? `Modified: ${new Date(record.modified).toLocaleDateString()}`
              : ""}
          </div>
        </div>
      ),
    },
    {
      title: "Size",
      align: "center",
      render: (_, record) => (
        <Tag color="blue">{(record.size_bytes / 1024).toFixed(2)} KB</Tag>
      ),
    },
    {
      title: "Actions",
      align: "center",
      render: (_, record) => (
        <Space>
          {isImage(record.extension) && (
            <Tooltip title="Preview">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => {
                  setPreviewImage(
                    `${API_BASE}/weekly-images/view/${encodeURIComponent(record.name)}`
                  );
                  setPreviewOpen(true);
                }}
              />
            </Tooltip>
          )}

          <Tooltip title="Download">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              href={`${API_BASE}/weekly-images/download/${encodeURIComponent(
                record.name
              )}`}
            />
          </Tooltip>

          <Popconfirm
            title="Delete this file?"
            onConfirm={() => deleteFile(record.name)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <Row justify="space-between" align="middle">
        <Title level={3}>Weekly Files</Title>
      </Row>

      <Divider />

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Files"
              value={files.length}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>

        <Col span={6}>
          <Card>
            <Statistic title="Total Size" value={totalSizeKB} suffix="KB" />
          </Card>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={files}
        rowKey="name"
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        pagination={{ pageSize: 10 }}
        locale={{
          emptyText: <Empty description="No files found" />,
        }}
      />

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchFiles}
          style={{ marginRight: 10 }}
        >
          Refresh
        </Button>

        <Button
          style={{
            marginLeft: 10,
            background: "#722ed1",
            borderColor: "#722ed1",
          }}
          type="primary"
          onClick={() => setEmailModalOpen(true)}
        >
          Email All Weekly Files
        </Button>

        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={downloadZip}
          disabled={!selectedRowKeys.length}
          style={{ marginLeft: 10 }}
        >
          Download ZIP
        </Button>

        <Popconfirm
          title={`Delete ${selectedRowKeys.length} selected file(s)?`}
          onConfirm={deleteSelected}
          okText="Yes"
          cancelText="No"
        >
          <Button
            danger
            icon={<DeleteOutlined />}
            disabled={!selectedRowKeys.length}
            style={{ marginLeft: 10 }}
          >
            Delete Selected
          </Button>
        </Popconfirm>
      </div>

      <Modal
        open={emailModalOpen}
        onCancel={() => setEmailModalOpen(false)}
        footer={null}
        centered
        width={650}
      >
        <div style={{ padding: 10 }}>
          <Title level={4} style={{ marginBottom: 8 }}>
            Send Weekly Files by Email
          </Title>

          <Text type="secondary">
            Please confirm before sending all weekly files.
          </Text>

          <Divider />

          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card
                size="small"
                style={{
                  borderRadius: 12,
                  background: "#fafafa",
                }}
              >
                <Text strong>Recipient</Text>
                <br />
                <Text>chamikadeshan97@gmail.com</Text>
              </Card>
            </Col>

            <Col span={12}>
              <Card
                size="small"
                style={{
                  borderRadius: 12,
                  background: "#fafafa",
                }}
              >
                <Text strong>Total Files</Text>
                <br />
                <Text>{files.length} files</Text>
              </Card>
            </Col>

            <Col span={24}>
              <Card
                size="small"
                style={{
                  borderRadius: 12,
                  background: "#fafafa",
                }}
              >
                <Text strong>Total Size</Text>
                <br />
                <Text>{totalSizeKB} KB</Text>
              </Card>
            </Col>
          </Row>

          <Divider />

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            <Button onClick={() => setEmailModalOpen(false)}>Cancel</Button>

            <Button
              type="primary"
              loading={sendingEmail}
              style={{
                background: "#722ed1",
                borderColor: "#722ed1",
              }}
              onClick={emailAllWeeklyFiles}
            >
              Confirm & Send
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={previewOpen}
        footer={null}
        onCancel={() => setPreviewOpen(false)}
        centered
        width={900}
      >
        <img
          src={previewImage}
          alt="Preview"
          style={{
            width: "100%",
            borderRadius: 10,
            maxHeight: "80vh",
            objectFit: "contain",
          }}
        />
      </Modal>
    </Spin>
  );
}

export default WeeklyImagesManager;