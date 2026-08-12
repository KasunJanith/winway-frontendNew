import React, { useState, useMemo } from "react";
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
  ReloadOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { getLastPurchaseTime } from "../api/endPointsPhyton";

const { Title, Text } = Typography;

function DailyLastSoldTime() {
  const [salesZip, setSalesZip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  /* ================= GENERATE ================= */

  const handleGenerate = async () => {
    if (!salesZip) {
      message.error("Upload Daily Sales ZIP.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await getLastPurchaseTime(salesZip);

      setResult(res);
      message.success("Last sold time generated successfully");
    } catch (err) {
      setError("Processing failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSalesZip(null);
    setResult(null);
    setError(null);
  };

  /* ================= DATA ================= */

  const lotteries = result?.results || [];

  const tableData = lotteries.map((l) => ({
    key: l.lottery_name,
    lottery_name: l.lottery_name,
    draw_no: l.draw_no || "N/A",
    last_purchase_time: l.last_purchase_time || "No Sales",
  }));

  // 🔥 Get FINAL latest sold time
  const finalLastTime = useMemo(() => {
    const validTimes = lotteries
      .filter((l) => l.last_purchase_time)
      .map((l) =>
        dayjs(l.last_purchase_time, "DD/MM/YYYY HH:mm")
      );

    if (!validTimes.length) return null;

    return validTimes.reduce((a, b) =>
      a.isAfter(b) ? a : b
    );
  }, [lotteries]);

  const columns = [
    {
      title: "Lottery Name",
      dataIndex: "lottery_name",
    },
    {
      title: "Draw No",
      dataIndex: "draw_no",
      align: "center",
    },
    {
      title: "Last Ticket Sold Time",
      dataIndex: "last_purchase_time",
      align: "center",
      render: (v) => (
        <span style={{ color: v === "No Sales" ? "#cf1322" : "#1d39c4" }}>
          {v}
        </span>
      ),
    },
  ];

  return (
    <>
      <Spin spinning={loading} indicator={<LoadingOutlined spin />} />
      <Title level={3}>Daily Last Sold Time</Title>
      <Divider />

      <Row justify="center">
        <Col xs={24} lg={20}>
          <Form layout="vertical">
            <Card style={{ borderRadius: 10, marginBottom: 16 }}>
              <Form.Item label={<Text strong>Daily Sales ZIP (.zip)</Text>}>
                <Upload.Dragger
                  beforeUpload={(f) => {
                    setSalesZip(f);
                    message.success("ZIP selected");
                    return false;
                  }}
                  fileList={salesZip ? [salesZip] : []}
                  onRemove={() => setSalesZip(null)}
                  accept=".zip"
                  maxCount={1}
                >
                  <p className="ant-upload-drag-icon">
                    <FileZipOutlined
                      style={{ fontSize: 28, color: "#722ed1" }}
                    />
                  </p>
                  <p>
                    {salesZip
                      ? "ZIP attached"
                      : "Click or drag Daily Sales ZIP here"}
                  </p>
                </Upload.Dragger>
              </Form.Item>
            </Card>

            {error && <Alert type="error" message={error} showIcon />}

            <div style={{ textAlign: "center" }}>
              <Button
                type="primary"
                icon={<ArrowRightOutlined />}
                onClick={handleGenerate}
              >
                Generate
              </Button>

              <Button
                danger
                icon={<ReloadOutlined />}
                onClick={handleReset}
                style={{ marginLeft: 10 }}
              >
                Reset
              </Button>
            </div>
          </Form>
        </Col>
      </Row>

      {result && (
        <>
          {finalLastTime && (
            <Card
              style={{
                marginTop: 24,
                marginBottom: 16,
                borderRadius: 12,
                background: "#f0f5ff",
                border: "1px solid #adc6ff",
              }}
            >
              <Text strong style={{ fontSize: 16 }}>
                Final Latest Sold Time:
              </Text>

              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#1d39c4",
                }}
              >
                {finalLastTime.format("DD/MM/YYYY HH:mm")}
              </div>
            </Card>
          )}

          <Card style={{ borderRadius: 12 }}>
            <Table
              columns={columns}
              dataSource={tableData}
              rowKey="key"
              bordered
              pagination={false}
            />
          </Card>
        </>
      )}
    </>
  );
}

export default DailyLastSoldTime;