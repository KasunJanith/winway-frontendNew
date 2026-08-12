import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Input,
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
  Upload,
  Popconfirm,
  Modal,
  Drawer,
  Tag,
  Badge,
  Select,
  Progress,
} from "antd";
import {
  FileTextOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileZipOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  UploadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  HistoryOutlined,
  SearchOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloudDownloadOutlined,
  TeamOutlined,
  RiseOutlined,
  WarningOutlined,
  DragOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { saveAs } from "file-saver";
import { ENV } from "../config/env";
const { Search } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

const API_BASE = ENV.API_BASE_LOCAL;

function FileManager() {
  const [files, setFiles] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [fileType, setFileType] = useState("all");

  /* bulk select */
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  /* preview modal */
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState({
    columns: [],
    rows: [],
    filename: "",
  });

  /* history drawer */
  const [historyOpen, setHistoryOpen] = useState(false);

  /* stats modal */
  const [statsOpen, setStatsOpen] = useState(false);

  // ---------------- STYLING CONSTANTS (Matching LoyaltyCustomers) ----------------
  const tierColors = {
    Platinum: "#9B5DE5",
    Gold: "#E6B800",
    Silver: "#C0C0C0",
    Blue: "#2563EB",
    Warning: "#FFA500",
    Rejected: "#E63946",
    Default: "#1976d2",
    Success: "#52c41a",
    Rejected: "#ff4d4f",
  };

  const tierColorsFade = {
    Platinum: "rgba(155, 93, 229, 0.2)",
    Gold: "rgba(230, 184, 0, 0.2)",
    Silver: "rgba(192, 192, 192, 0.2)",
    Blue: "rgba(37, 99, 235, 0.2)",
    Warning: "rgba(255, 165, 0, 0.2)",
    Rejected: "rgba(230, 57, 70, 0.2)",
    Default: "rgba(25, 118, 210, 0.2)",
  };

  const cardGradients = {
    primary: "linear-gradient(145deg, #e3f2fd, #ffffff)",
    success: "linear-gradient(145deg, #e8f5e9, #ffffff)",
    warning: "linear-gradient(145deg, #fff3e0, #ffffff)",
    danger: "linear-gradient(145deg, #ffebee, #ffffff)",
    neutral: "linear-gradient(145deg, #f5f5f5, #ffffff)",
  };

  const fileTypeColors = {
    csv: "#52c41a",
    excel: "#1890ff",
    pdf: "#f5222d",
    image: "#faad14",
    zip: "#722ed1",
    default: "#8c8c8c",
  };

  // ---------------- FETCH ----------------
  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/files`);
      setFiles(res.data?.files || []);
      setFiltered(res.data?.files || []);
    } catch {
      message.error("Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // ---------------- SEARCH & FILTER ----------------
  useEffect(() => {
    let result = [...files];

    // Apply search filter
    if (searchText) {
      const lower = searchText.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(lower));
    }

    // Apply file type filter
    if (fileType !== "all") {
      result = result.filter((f) => {
        const ext = f.name.split(".").pop().toLowerCase();
        switch (fileType) {
          case "csv":
            return ext === "csv";
          case "excel":
            return ["xlsx", "xls"].includes(ext);
          case "pdf":
            return ext === "pdf";
          case "image":
            return ["jpg", "jpeg", "png", "gif", "svg"].includes(ext);
          case "zip":
            return ["zip", "rar", "7z"].includes(ext);
          default:
            return true;
        }
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case "size":
          aVal = a.size_bytes;
          bVal = b.size_bytes;
          break;
        case "modified":
          aVal = new Date(a.modified || 0);
          bVal = new Date(b.modified || 0);
          break;
        case "type":
          aVal = a.name.split(".").pop().toLowerCase();
          bVal = b.name.split(".").pop().toLowerCase();
          break;
        default:
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFiltered(result);
  }, [searchText, files, sortBy, sortOrder, fileType]);

  // ---------------- METRICS ----------------
  const totalSizeKB = useMemo(
    () =>
      (filtered.reduce((sum, f) => sum + f.size_bytes, 0) / 1024).toFixed(2),
    [filtered],
  );

  const fileStats = useMemo(() => {
    const stats = {
      csv: 0,
      excel: 0,
      pdf: 0,
      image: 0,
      zip: 0,
      other: 0,
    };

    filtered.forEach((f) => {
      const ext = f.name.split(".").pop().toLowerCase();
      if (ext === "csv") stats.csv++;
      else if (["xlsx", "xls"].includes(ext)) stats.excel++;
      else if (ext === "pdf") stats.pdf++;
      else if (["jpg", "jpeg", "png", "gif", "svg"].includes(ext))
        stats.image++;
      else if (["zip", "rar", "7z"].includes(ext)) stats.zip++;
      else stats.other++;
    });

    return stats;
  }, [filtered]);

  const getFileIcon = (filename) => {
    const ext = filename.split(".").pop().toLowerCase();
    switch (ext) {
      case "csv":
      case "xlsx":
      case "xls":
        return <FileExcelOutlined style={{ color: fileTypeColors.excel }} />;
      case "pdf":
        return <FilePdfOutlined style={{ color: fileTypeColors.pdf }} />;
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <FileImageOutlined style={{ color: fileTypeColors.image }} />;
      case "zip":
      case "rar":
      case "7z":
        return <FileZipOutlined style={{ color: fileTypeColors.zip }} />;
      default:
        return <FileTextOutlined style={{ color: fileTypeColors.default }} />;
    }
  };

  // ---------------- DELETE ----------------
  const deleteFile = async (filename) => {
    try {
      await axios.delete(
        `${API_BASE}/delete-file/${encodeURIComponent(filename)}`,
      );
      message.success("File deleted successfully");
      fetchFiles();
    } catch {
      message.error("Delete failed");
    }
  };

  const deleteSelected = async () => {
    if (!selectedRowKeys.length) return;

    Modal.confirm({
      title: `Delete ${selectedRowKeys.length} files?`,
      content:
        "This action cannot be undone. All selected files will be permanently deleted.",
      okText: "Delete",
      okType: "danger",
      icon: <DeleteOutlined />,
      onOk: async () => {
        try {
          await Promise.all(
            selectedRowKeys.map((filename) =>
              axios.delete(
                `${API_BASE}/delete-file/${encodeURIComponent(filename)}`,
              ),
            ),
          );
          message.success(`Deleted ${selectedRowKeys.length} files`);
          setSelectedRowKeys([]);
          fetchFiles();
        } catch {
          message.error("Failed to delete some files");
        }
      },
    });
  };

  // ---------------- UPLOAD ----------------
  const uploadProps = {
    accept: ".csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.zip,.rar",
    showUploadList: false,
    multiple: true,
    customRequest: async ({ file, onSuccess, onError }) => {
      const form = new FormData();
      form.append("file", file);

      try {
        await axios.post(`${API_BASE}/upload`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        message.success(`${file.name} uploaded successfully`);
        fetchFiles();
        onSuccess();
      } catch {
        message.error(`Failed to upload ${file.name}`);
        onError();
      }
    },
  };

  // ---------------- CSV PREVIEW ----------------
  const openPreview = async (filename) => {
    try {
      const res = await axios.get(
        `${API_BASE}/files/preview/${encodeURIComponent(filename)}`,
      );
      setPreviewData({ ...res.data, filename });
      setPreviewOpen(true);
    } catch {
      message.error("Failed to preview file");
    }
  };

  // ---------------- DOWNLOAD ZIP ----------------
  const downloadZip = async () => {
    if (!selectedRowKeys.length) {
      message.warning("No files selected");
      return;
    }

    try {
      const res = await axios.post(
        `${API_BASE}/files/download-zip`,
        { files: selectedRowKeys },
        { responseType: "blob" },
      );
      saveAs(res.data, `wallet_files_${new Date().getTime()}.zip`);
      message.success("ZIP file downloaded successfully");
    } catch {
      message.error("ZIP download failed");
    }
  };

  // ---------------- TABLE COLUMNS ----------------
  const columns = [
    {
      title: "File Name",
      dataIndex: "name",
      render: (name, record) => (
        <Space>
          {getFileIcon(name)}
          <div>
            <Text strong style={{ fontSize: "14px" }}>
              {name}
            </Text>
            <div style={{ fontSize: "12px", color: "#999" }}>
              {record.modified
                ? `Modified: ${new Date(record.modified).toLocaleDateString()}`
                : ""}
            </div>
          </div>
        </Space>
      ),
      sorter: true,
      fixed: "left",
      width: 300,
    },

    {
      title: "Size",
      align: "center",
      width: 120,
      render: (record) => {
        const sizeKB = (record.size_bytes / 1024).toFixed(2);
        const sizeMB = (record.size_bytes / (1024 * 1024)).toFixed(2);
        const color =
          record.size_bytes > 10 * 1024 * 1024
            ? tierColors.Warning
            : record.size_bytes > 1 * 1024 * 1024
              ? tierColors.Gold
              : tierColors.Success;

        return (
          <Tooltip title={`${sizeMB} MB`}>
            <div
              style={{
                padding: "4px 12px",
                borderRadius: "12px",
                fontWeight: 600,
                fontSize: "13px",
              }}
            >
              {sizeKB} KB
            </div>
          </Tooltip>
        );
      },
      sorter: true,
    },

    {
      title: "Actions",
      align: "center",
      width: 180,
      fixed: "right",
      render: (record) => (
        <Space>
          <Tooltip title="Preview">
            <Button
              type="text"
              icon={<EyeOutlined style={{ color: tierColors.Blue }} />}
              onClick={() => openPreview(record.name)}
              style={{ borderRadius: "50%" }}
            />
          </Tooltip>
          <Tooltip title="Download">
            <Button
              type="text"
              icon={<DownloadOutlined style={{ color: tierColors.Success }} />}
              href={`${API_BASE}/files/download/${encodeURIComponent(record.name)}`}
              style={{ borderRadius: "50%" }}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Delete this file?"
              description="Are you sure you want to delete this file?"
              onConfirm={() => deleteFile(record.name)}
              okText="Yes"
              cancelText="No"
              placement="left"
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                style={{ borderRadius: "50%" }}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ---------------- RENDER EMPTY STATE ----------------
  const renderEmptyState = () => (
    <div
      style={{
        textAlign: "center",
        padding: "60px 20px",
        background: tierColorsFade.Default,
        borderRadius: "12px",
        marginTop: "20px",
        border: `1px dashed ${tierColors.Default}`,
      }}
    >
      <FileTextOutlined
        style={{
          fontSize: "48px",
          color: tierColors.Default,
          marginBottom: "16px",
        }}
      />
      <Title level={4} style={{ color: "#595959" }}>
        {searchText ? "No matching files found" : "No files uploaded yet"}
      </Title>
      <Text type="secondary" style={{ marginBottom: "24px", display: "block" }}>
        {searchText
          ? "Try a different search term"
          : "Upload your first file to get started"}
      </Text>
      <Upload {...uploadProps}>
        <Button
          type="primary"
          size="large"
          icon={<UploadOutlined />}
          style={{
            background: tierColors.Default,
            borderColor: tierColors.Default,
            borderRadius: "8px",
            padding: "0 32px",
            height: "40px",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          Upload First File
        </Button>
      </Upload>
    </div>
  );

  return (
    <>
      <Spin spinning={loading} tip="Loading files...">
        {/* HEADER */}
        <Row
          justify="space-between"
          align="middle"
          style={{ marginBottom: 20 }}
        >
          <Title level={3}>Customer Wallet Files</Title>
        </Row>

        <Divider />

        {/* METRIC CARDS */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} md={6}>
            <Card
              hoverable
              style={{
                borderRadius: 14,
                cursor: "pointer",
                background: cardGradients.primary,
                border: !fileType
                  ? `2px solid ${tierColors.Default}`
                  : "1px solid #e0e0e0",
                boxShadow: !fileType
                  ? `0 6px 18px ${tierColors.Default}25`
                  : "0 2px 8px rgba(0,0,0,0.05)",
                transition: "all 0.25s ease",
              }}
              onClick={() => {
                setFileType("all");
              }}
            >
              <Statistic
                title={
                  <Text
                    style={{
                      fontSize: 14,
                      color: tierColors.Default,
                      fontWeight: 600,
                    }}
                  >
                    Total Files
                  </Text>
                }
                value={filtered.length}
                valueStyle={{ fontWeight: 700, color: "#0d47a1" }}
                prefix={
                  <DatabaseOutlined style={{ color: tierColors.Default }} />
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card
              hoverable
              style={{
                borderRadius: 14,
                background: cardGradients.success,
                border: "1px solid #c8e6c9",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}
            >
              <Statistic
                title={
                  <Text style={{ color: "#2e7d32", fontWeight: 600 }}>
                    Total Size
                  </Text>
                }
                value={totalSizeKB}
                suffix="KB"
                valueStyle={{ color: "#1b5e20", fontWeight: 700 }}
                prefix={<FileTextOutlined style={{ color: "#2e7d32" }} />}
              />
            </Card>
          </Col>
        </Row>

        <Divider />

        {/* FILTERS & ACTIONS */}
        <Row
          justify="space-between"
          align="middle"
          style={{ marginBottom: 20 }}
        >
          <Col xs={24} sm={12} md={16}>
            <Space wrap>
              <Search
                placeholder="Search files by name..."
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                prefix={<SearchOutlined />}
                style={{ width: 300 }}
                size="middle"
              />

              <Select
                value={sortBy}
                onChange={setSortBy}
                style={{ width: 140 }}
                suffixIcon={<SortAscendingOutlined />}
                size="middle"
              >
                <Option value="name">Sort by Name</Option>
                <Option value="size">Sort by Size</Option>
                <Option value="modified">Sort by Date</Option>
                <Option value="type">Sort by Type</Option>
              </Select>

              <Button
                icon={
                  sortOrder === "asc" ? (
                    <SortAscendingOutlined />
                  ) : (
                    <SortAscendingOutlined rotate={180} />
                  )
                }
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                size="middle"
              >
                {sortOrder === "asc" ? "Asc" : "Desc"}
              </Button>
            </Space>
          </Col>
        </Row>

        {/* FILE TABLE */}
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="name"
          bordered
          size="middle"
          scroll={{ x: true, y: 420 }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            selections: [
              Table.SELECTION_ALL,
              Table.SELECTION_INVERT,
              Table.SELECTION_NONE,
            ],
          }}
          pagination={{
            pageSize: 10,
            showTotal: (total, range) =>
              `Showing ${range[0]}-${range[1]} of ${total} files`,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50", "100"],
          }}
          locale={{
            emptyText: renderEmptyState(),
          }}
          onRow={(record) => ({
            onClick: () => {
              // Handle row click if needed
            },
            onDoubleClick: () => openPreview(record.name),
          })}
        />

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchFiles}
            style={{ marginRight: 8 }}
          >
            Refresh
          </Button>
          <Button
            icon={<DeleteOutlined />}
            danger
            style={{ marginRight: 8 }}
            onClick={deleteSelected}
          >
            Delete Selected
          </Button>
          <Button
            icon={<DeleteOutlined />}
            style={{
              background: tierColors.Warning,
              borderColor: tierColors.Warning,
              color: "white",
              borderRadius: "8px",
              fontWeight: 500,
              marginRight: 8,
            }}
            onClick={() => setHistoryOpen(true)}
          >
            History
          </Button>

          <Button
            icon={<DownloadOutlined />}
            type="primary"
            onClick={downloadZip}
            disabled={!selectedRowKeys.length}
          >
            Download ZIP
          </Button>
        </div>

        {/* CSV PREVIEW MODAL */}
        <Modal
          open={previewOpen}
          onCancel={() => setPreviewOpen(false)}
          width={1000}
          centered
          footer={null}
          styles={{
            body: { padding: 0 },
            header: { padding: 0 },
          }}
          title={
            <div
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                padding: "20px",
                margin: 0,
                color: "white",
                fontWeight: 700,
                fontSize: "18px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <EyeOutlined />
              File Preview - {previewData.filename || "File"}
            </div>
          }
        >
          <div style={{ padding: "20px" }}>
            <Table
              size="small"
              bordered
              rowKey={(_, i) => i}
              scroll={{ x: "max-content", y: 500 }}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
              }}
              columns={previewData.columns?.map((c) => ({
                title: (
                  <div
                    style={{
                      fontWeight: 600,
                      color: tierColors.Blue,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c}
                  </div>
                ),
                dataIndex: c,
                key: c,
                ellipsis: true,
                width: 150,
              }))}
              dataSource={previewData.rows || []}
              style={{
                borderRadius: "8px",
                overflow: "hidden",
                border: "1px solid #f0f0f0",
              }}
            />
          </div>
        </Modal>

        {/* HISTORY DRAWER */}
        <Drawer
          title={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: tierColors.Blue,
              }}
            >
              <HistoryOutlined />
              File Upload History
            </div>
          }
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          width={520}
          styles={{
            header: {
              background: "#fafafa",
              borderBottom: "1px solid #f0f0f0",
            },
          }}
          extra={
            <Button icon={<ReloadOutlined />} onClick={fetchFiles} size="small">
              Refresh
            </Button>
          }
        >
          <Table
            size="small"
            rowKey="name"
            columns={[
              {
                title: "File Name",
                dataIndex: "name",
                render: (text, record) => (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {getFileIcon(text)}
                    <span style={{ fontWeight: 500 }}>{text}</span>
                  </div>
                ),
              },
              {
                title: "Size",
                render: (r) => (
                  <Tag color="blue">{(r.size_bytes / 1024).toFixed(2)} KB</Tag>
                ),
                align: "center",
              },
              {
                title: "Uploaded",
                render: (r) => (
                  <div>
                    <div style={{ fontWeight: 500 }}>
                      {r.modified
                        ? new Date(r.modified).toLocaleDateString()
                        : "-"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#999" }}>
                      {r.modified
                        ? new Date(r.modified).toLocaleTimeString()
                        : ""}
                    </div>
                  </div>
                ),
                align: "center",
              },
            ]}
            dataSource={files.slice(0, 20)}
            pagination={{ pageSize: 10 }}
          />
        </Drawer>

        {/* STATS MODAL */}
        <Modal
          title={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontSize: "18px",
                fontWeight: 600,
                color: tierColors.Platinum,
              }}
            >
              <DatabaseOutlined />
              <span>File Statistics</span>
            </div>
          }
          open={statsOpen}
          onCancel={() => setStatsOpen(false)}
          footer={null}
          width={600}
        >
          <div style={{ padding: "20px 0" }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card className="stat-card">
                  <Statistic
                    title="Total Files"
                    value={filtered.length}
                    prefix={<DatabaseOutlined />}
                    valueStyle={{ color: tierColors.Default }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card className="stat-card">
                  <Statistic
                    title="Total Size"
                    value={totalSizeKB}
                    suffix="KB"
                    prefix={<FileTextOutlined />}
                    valueStyle={{ color: tierColors.Success }}
                  />
                </Card>
              </Col>
            </Row>

            <Divider>File Type Distribution</Divider>

            <div style={{ marginTop: "20px" }}>
              {Object.entries(fileStats).map(([type, count]) => {
                if (count === 0) return null;
                const percent = ((count / filtered.length) * 100).toFixed(1);
                const color = fileTypeColors[type] || tierColors.Default;

                return (
                  <div key={type} style={{ marginBottom: "20px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                      }}
                    >
                      <Text
                        strong
                        style={{ color: color, textTransform: "uppercase" }}
                      >
                        {type} Files
                      </Text>
                      <Text strong>
                        {count} ({percent}%)
                      </Text>
                    </div>
                    <Progress
                      percent={percent}
                      strokeColor={color}
                      trailColor={`${color}20`}
                      size="small"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      </Spin>
    </>
  );
}

export default FileManager;
