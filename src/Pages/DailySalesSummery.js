import React, { useMemo, useState } from "react";
import {
  Form,
  Upload,
  Button,
  Card,
  Typography,
  message,
  Spin,
  Divider,
  Alert,
  Row,
  Col,
  Table,
} from "antd";
import {
  FileZipOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
  LoadingOutlined,
  CheckCircleTwoTone,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { DatePicker } from "antd";
import { getSummery } from "../api/endPointsPhyton";

const { Title, Text } = Typography;

function DailySalesSummery() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  /* ================= UPLOAD ================= */

  const renderUpload = () => {
    const hasFile = !!file;

    return (
      <Card
        size="small"
        style={{
          marginBottom: 16,
          borderRadius: 10,
          borderColor: hasFile ? "#b7eb8f" : "#d9d9d9",
          boxShadow: hasFile ? "0 0 10px rgba(82, 196, 26, 0.18)" : "none",
        }}
      >
        <Form.Item
          label={<Text strong>Reconciliation ZIP (.zip)</Text>}
          style={{ marginBottom: 8 }}
        >
          <div style={{ position: "relative" }}>
            {hasFile && (
              <CheckCircleTwoTone
                twoToneColor="#52c41a"
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  fontSize: 20,
                  zIndex: 10,
                }}
              />
            )}

            <Upload.Dragger
              beforeUpload={(f) => {
                setFile(f);
                message.success("ZIP file selected");
                return false;
              }}
              fileList={hasFile ? [file] : []}
              onRemove={() => setFile(null)}
              accept=".zip"
              maxCount={1}
              style={{
                background: hasFile ? "#f6ffed" : "#fafafa",
                borderColor: hasFile ? "#b7eb8f" : "#d9d9d9",
                borderRadius: 10,
                padding: "12px",
                minHeight: "110px",
              }}
            >
              <p className="ant-upload-drag-icon" style={{ fontSize: 28 }}>
                <FileZipOutlined style={{ color: "#722ed1" }} />
              </p>

              {hasFile ? (
                <p style={{ color: "#52c41a", fontWeight: 600 }}>
                  ZIP file attached
                </p>
              ) : (
                <>
                  <p style={{ marginBottom: 0 }}>Click or drag ZIP file here</p>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Accepts .zip
                  </Text>
                </>
              )}
            </Upload.Dragger>
          </div>
        </Form.Item>
      </Card>
    );
  };

  /* ================= GENERATE ================= */

  const handleGenerate = async () => {
    if (!file) {
      message.error("Upload ZIP file.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // ✅ NEW endpoint expects only zip_file (no date required)
      const data = await getSummery(file);

      setResult(data);
      setStep(2);
      message.success("Reconciliation report generated");
    } catch (err) {
      setError("Processing failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setSelectedDate(null);
    setResult(null);
    setError(null);
  };

  /* ================= DATA (NEW SHAPE) ================= */

  const rawRows = result?.summary || [];

  const tableData = useMemo(() => {
    const rows = (rawRows || []).map((r) => {
      const soldQty = Number(r.sold_qty || 0);
      const unsoldQty = Number(r.unsold_qty || 0);
      const totalQty = soldQty + unsoldQty;

      return {
        key: r.lottery_name,
        isTotal: false,

        lottery_name: r.lottery_name,
        draw_no: r.draw_no ?? "N/A",
        draw_date:6,

        sold_qty: soldQty,
        unsold_qty: unsoldQty,
        total_qty: totalQty,

        sold_total: Number(r.sold_total || 0),
        unsold_total: Number(r.unsold_total || 0),

        row_count: Number(r.row_count || 0),
        customer_id_count: Number(r.customer_id_count || 0),
      };
    });

    // ✅ Sort A → Z
    rows.sort((a, b) => a.lottery_name.localeCompare(b.lottery_name));

    // ✅ TOTAL row
    const totals = rows.reduce(
      (acc, x) => {
        acc.sold_qty += x.sold_qty;
        acc.unsold_qty += x.unsold_qty;
        acc.total_qty += x.total_qty;
        acc.sold_total += x.sold_total;
        acc.unsold_total += x.unsold_total;
        acc.row_count += x.row_count;
        acc.customer_id_count += x.customer_id_count;
        return acc;
      },
      {
        sold_qty: 0,
        unsold_qty: 0,
        total_qty: 0,
        sold_total: 0,
        unsold_total: 0,
        row_count: 0,
        customer_id_count: 0,
      },
    );

    rows.push({
      key: "__TOTAL__",
      isTotal: true,
      lottery_name: "TOTAL",
      draw_no: "",
      draw_date: "",
      sold_qty: totals.sold_qty,
      unsold_qty: totals.unsold_qty,
      total_qty: totals.total_qty,
      sold_total: totals.sold_total,
      unsold_total: totals.unsold_total,
      row_count: totals.row_count,
      customer_id_count: totals.customer_id_count,
    });

    return rows;
  }, [rawRows, selectedDate]);

  const formatNum = (n) => Number(n || 0).toLocaleString();
  const formatRs = (n) => `Rs. ${Number(n || 0).toLocaleString()}`;

  /* ================= TABLE (EXCEL ORDER) ================= */

  const columns = [
    {
      title: "",
      align: "center",
      width: 60,
      render: (_, r, index) => (r.isTotal ? "" : index + 1),
    },
    {
      title: "Lottery Name",
      dataIndex: "lottery_name",
      align: "left",
      render: (v, r) => (
        <span style={{ fontWeight: r.isTotal ? 700 : 500 }}>{v}</span>
      ),
    },
    {
      title: "Draw No",
      dataIndex: "draw_no",
      align: "center",
      render: (v, r) => (r.isTotal ? "" : v),
    },
    {
      title: "Purchased Quantity",
      dataIndex: "total_qty",
      align: "right",
      render: (v, r) => (
        <span style={{ fontWeight: r.isTotal ? 700 : 400 }}>
          {formatNum(v)}
        </span>
      ),
    },
    {
      title: "Sold",
      dataIndex: "sold_qty",
      align: "right",
      render: (v, r) => (
        <span style={{ fontWeight: r.isTotal ? 700 : 400 }}>
          {formatNum(v)}
        </span>
      ),
    },
    {
      title: "Uusold",
      dataIndex: "unsold_qty",
      align: "right",
      render: (v, r) => (
        <span style={{ fontWeight: r.isTotal ? 700 : 400 }}>
          {formatNum(v)}
        </span>
      ),
    },
    {
      title: "Prizes for sold tickets (Rs)",
      dataIndex: "sold_total",
      align: "right",
      render: (v, r) => (
        <span style={{ fontWeight: r.isTotal ? 700 : 400 }}>{formatRs(v)}</span>
      ),
    },
    {
      title: "Prizes for unsold tickets (Rs)",
      dataIndex: "unsold_total",
      align: "right",
      render: (v, r) => (
        <span style={{ fontWeight: r.isTotal ? 700 : 400 }}>{formatRs(v)}</span>
      ),
    },
    {
      title: "Last Purchased Time",
      dataIndex: "last_purchased_time",
      align: "center",
      render: (v, r) => (
        <span style={{ fontWeight: r.isTotal ? 700 : 400 }}>{v || "-"}</span>
      ),
    },
  ];

  return (
    <>
      {/* Step 1 */}
      {step === 1 && (
        <>
          <Spin spinning={loading} indicator={<LoadingOutlined spin />} />
          <Title level={3}>Daily Sales Summery</Title>
          <Divider />

          <Row gutter={[24, 24]} justify="center">
            <Col xs={24} lg={20}>
              <Form layout="vertical">
                <Row justify="center">
                  <Col xs={24} md={14}>
                    {renderUpload()}
                  </Col>
                </Row>

                <Row justify="center" style={{ marginTop: 10 }}>
                  <Col xs={24} md={14}>
                    <Form.Item
                      label={
                        <Text strong>Draw Date (optional, for display)</Text>
                      }
                    >
                      <DatePicker
                        style={{ width: "100%" }}
                        value={selectedDate}
                        format="YYYY-MM-DD"
                        onChange={(value) => setSelectedDate(value)}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {error && <Alert type="error" message={error} showIcon />}

                <div style={{ textAlign: "center" }}>
                  <Button
                    type="primary"
                    icon={<ArrowRightOutlined />}
                    onClick={handleGenerate}
                    disabled={!file}
                    style={{ marginRight: 10 }}
                  >
                    Generate Report
                  </Button>

                  <Button
                    danger
                    icon={<ReloadOutlined />}
                    onClick={handleReset}
                  >
                    Reset
                  </Button>
                </div>
              </Form>
            </Col>
          </Row>
        </>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <>
          <Title level={3}>Daily Sales Summery</Title>

          <Divider orientation="left"></Divider>

          <Card style={{ borderRadius: 12 }}>
            <Table
              columns={columns}
              dataSource={tableData}
              rowKey="key"
              bordered
              pagination={false}
              size="middle"
              rowClassName={(record) => (record.isTotal ? "total-row" : "")}
            />
          </Card>

          <style>{`
            .total-row td {
              font-weight: 700 !important;
              background: #fafafa !important;
              border-top: 2px solid #d9d9d9 !important;
            }
          `}</style>

          <div style={{ textAlign: "center", marginTop: 30 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => setStep(1)}
              style={{ marginRight: 10 }}
            >
              Back
            </Button>

            <Button type="primary" onClick={handleReset}>
              Start Over
            </Button>
          </div>
        </>
      )}
    </>
  );
}

export default DailySalesSummery;
