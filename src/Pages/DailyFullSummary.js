import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  Form,
  Upload,
  Button,
  Card,
  Typography,
  message,
  Spin,
  Divider,
  Row,
  Col,
  Table,
  Alert,
  InputNumber,
} from "antd";
import jsPDF from "jspdf";
import "jspdf-autotable";
import html2canvas from "html2canvas";
import { DownloadOutlined } from "@ant-design/icons";
import {
  FileZipOutlined,
  ReloadOutlined,
  LoadingOutlined,
  CheckCircleTwoTone,
  ArrowLeftOutlined,
  CalendarOutlined,
  ProfileOutlined,
  GifOutlined,
  GiftOutlined,
  PercentageOutlined,
  CheckCircleOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { getSummery, getLastPurchaseTime } from "../api/endPointsPhyton";
import Dragger from "antd/es/upload/Dragger";
import { setSelectionRange } from "@testing-library/user-event/dist/utils";

const { Title, Text } = Typography;

function DailyFullSummary() {
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [drawDate, setDrawDate] = useState();
  const formatNum = (n) => Number(n || 0).toLocaleString();
  const formatRs = (n) => ` ${Number(n || 0).toLocaleString()}`;

  /* ================= FILE HANDLING ================= */

  const handleChange = useCallback((file, name) => {
    setFiles((prev) => ({ ...prev, [name]: file }));
    return false;
  }, []);

  const handleRemove = useCallback((name) => {
    setFiles((prev) => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });
  }, []);

  /* ================= GENERATE ================= */

  const handleGenerate = async () => {
    if (!files.ticket_sales || !files.prizes) {
      message.error("Please upload both ZIP files.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [summaryRes, lastTimeRes] = await Promise.all([
        getSummery(files.ticket_sales),
        getLastPurchaseTime(files.prizes),
      ]);

      setResult({
        summary: summaryRes?.summary || [],
        lastTimes: lastTimeRes?.results || [],
      });

      setStep(1);
      message.success("Full summary generated successfully");
    } catch (err) {
      setError("Processing failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(0);
    setFiles({});
    setResult(null);
    setError(null);
  };

  /* ================= MERGE ================= */
  const [manualReturns, setManualReturns] = useState({});

  const tableData = useMemo(() => {
    if (!result) return [];

    const summaryRows = result.summary || [];
    const lastTimes = result.lastTimes || [];

    const lastTimeMap = {};
    lastTimes.forEach((l) => {
      lastTimeMap[l.lottery_name] = l.last_purchase_time || "No Sales";
    });

    const rows = summaryRows.map((r) => {
      const soldQty = Number(r.sold_qty || 0);
      const unsoldQty = Number(r.unsold_qty || 0);
      const purchasedQty = soldQty + unsoldQty;

      const returnedQty = manualReturns[r.lottery_name] || 0;
      const orderQty = purchasedQty + returnedQty;
      setDrawDate(r.draw_date);

      return {
        key: r.lottery_name,
        isTotal: false,
        lottery_name: r.lottery_name === "Jaya" ? "NLB Jaya" : r.lottery_name,
        draw_no: r.draw_no ?? "N/A",
        draw_date: r.draw_date ?? "N/A",
        purchased_qty: purchasedQty,
        returned_qty: returnedQty,
        total_qty: orderQty,

        sold_qty: soldQty,
        unsold_qty: unsoldQty,
        sold_total: Number(r.sold_total || 0),
        unsold_total: Number(r.unsold_total || 0),

        last_purchase_time: lastTimeMap[r.lottery_name] || "No Sales",
      };
    });

    rows.sort((a, b) => a.lottery_name.localeCompare(b.lottery_name));

    const totals = rows.reduce(
      (acc, x) => {
        acc.purchased_qty += x.purchased_qty;
        acc.returned_qty += x.returned_qty;
        acc.total_qty += x.total_qty;
        acc.sold_qty += x.sold_qty;
        acc.unsold_qty += x.unsold_qty;
        acc.sold_total += x.sold_total;
        acc.unsold_total += x.unsold_total;
        return acc;
      },
      {
        purchased_qty: 0,
        returned_qty: 0,
        total_qty: 0,
        sold_qty: 0,
        unsold_qty: 0,
        sold_total: 0,
        unsold_total: 0,
      },
    );

    rows.push({
      key: "__TOTAL__",
      isTotal: true,
      lottery_name: "TOTAL",
      draw_no: "",
      ...totals,
      last_purchase_time: "",
    });

    return rows;
  }, [result, manualReturns]);

  const summaryRef = useRef(null);
  const finalLastTime = useMemo(() => {
    if (!result?.lastTimes) return null;

    const valid = result.lastTimes
      .filter((l) => l.last_purchase_time)
      .map((l) => dayjs(l.last_purchase_time, "DD/MM/YYYY HH:mm"));

    if (!valid.length) return null;

    return valid.reduce((a, b) => (a.isAfter(b) ? a : b));
  }, [result]);
  const summaryInfo = useMemo(() => {
    if (!tableData.length) return null;

    const totalRow = tableData.find((r) => r.isTotal);
    const firstRow = tableData.find((r) => !r.isTotal);

    if (!totalRow) return null;

    return {
      drawDate: firstRow?.draw_date || "N/A",

      totalPurchasedQty: totalRow.total_qty || 0,
      totalSoldQty: totalRow.sold_qty || 0,
      totalUnsoldQty: totalRow.unsold_qty || 0,

      totalSoldAmount: totalRow.sold_total || 0,
      totalUnsoldAmount: totalRow.unsold_total || 0,
    };
  }, [tableData]);
  const handleReturnChange = (value, key) => {
    setManualReturns((prev) => ({
      ...prev,
      [key]: value || 0,
    }));
  };
  const columns = [
    {
      title: "",
      width: 60,
      align: "center",
      render: (_, r, index) => (r.isTotal ? "" : index + 1),
    },
    {
      title: "Lottery Name",
      dataIndex: "lottery_name",
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
      title: "Draw Date",
      dataIndex: "draw_date",
      align: "center",
      render: (v, r) => (r.isTotal ? "" : v),
    },
   
    {
      title: "Sold",
      dataIndex: "sold_qty",
      align: "right",
      render: (v) => formatNum(v),
    },
    {
      title: "Unsold",
      dataIndex: "unsold_qty",
      align: "right",
      render: (v) => formatNum(v),
    }, {
      title: "Total Qty",
      dataIndex: "total_qty",
      align: "right",
      render: (v) => formatNum(v),
    },
    {
      title: "Prize Sold (Rs)",
      dataIndex: "sold_total",
      align: "right",
      render: (v) => formatRs(v),
    },
    {
      title: "Prize Unsold (Rs)",
      dataIndex: "unsold_total",
      align: "right",
      render: (v) => formatRs(v),
    },
    {
      title: "Last Sold Time",
      dataIndex: "last_purchase_time",
      align: "center",
    },
  ];
  /* ================= UI ================= */

  const renderUpload = (label, name, accept, icon, successMsg) => {
    const hasFile = !!files[name];

    return (
      <Card size="small" style={{ marginBottom: 16 }}>
        <Form.Item label={<Text strong>{label}</Text>}>
          <Dragger
            beforeUpload={(file) => handleChange(file, name)}
            fileList={hasFile ? [files[name]] : []}
            onRemove={() => handleRemove(name)}
            accept={accept}
            maxCount={1}
          >
            <p className="ant-upload-drag-icon">{icon}</p>
            {hasFile ? (
              <p style={{ color: "#52c41a" }}>{successMsg}</p>
            ) : (
              <>
                <p>Click or drag file to this area</p>
                <Text type="secondary">Accepts {accept}</Text>
              </>
            )}
          </Dragger>
        </Form.Item>
      </Card>
    );
  };
  const percentage =
    summaryInfo?.totalPurchasedQty > 0
      ? (
          (summaryInfo.totalSoldQty / summaryInfo.totalPurchasedQty) *
          100
        ).toFixed(2)
      : "0.00";

  const percentageColor =
    percentage >= 80
      ? "#389e0d" // green
      : percentage >= 50
        ? "#fa8c16" // orange
        : "#cf1322"; // red

  const downloadImage = async () => {
    try {
      if (!summaryRef.current) return;

      const canvas = await html2canvas(summaryRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const link = document.createElement("a");
      link.download = `daily-sales-summary-${drawDate}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      message.error("Image download failed");
    }
  };

  const downloadPDF = () => {
    try {
      const doc = new jsPDF("p", "pt", "a4");

      doc.setFontSize(16);
      doc.text("Daily Sales Summary", 40, 40);

      // Prepare table rows for PDF
      const pdfRows = tableData.map((r, idx) => [
        r.isTotal ? "" : idx + 1,
        r.lottery_name,
        r.draw_no || "",
        formatNum(r.total_qty),
        formatNum(r.sold_qty),
        formatNum(r.unsold_qty),
        formatRs(r.sold_total),
        formatRs(r.unsold_total),
        r.last_purchase_time || "",
      ]);

      doc.autoTable({
        startY: 60,
        head: [
          [
            "#",
            "Lottery Name",
            "Draw No",
            "Purchased",
            "Sold",
            "Unsold",
            "Prize Sold (Rs)",
            "Prize Unsold (Rs)",
            "Last Sold Time",
          ],
        ],
        body: pdfRows,
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [22, 119, 255] },
        didParseCell: (data) => {
          // Highlight TOTAL row in PDF
          const row = tableData[data.row.index];
          if (row?.isTotal) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [245, 245, 245];
          }
        },
      });

      doc.save(`daily-sales-summary-${dayjs().format("YYYY-MM-DD")}.pdf`);
    } catch (e) {
      message.error("PDF download failed");
    }
  };
  const downloadCSV = () => {
    try {
      if (!tableData.length) {
        message.error("No data available to download");
        return;
      }

      const headers = [
        "#",
        "Lottery Name",
        "Draw No",
        "Order Qty",
        "Sold Qty",
        "Unsold Qty",
        "Prize Sold (Rs)",
        "Prize Unsold (Rs)",
        "Last Sold Time",
      ];

      const rows = tableData.map((r, index) => [
        r.isTotal ? "" : index + 1,
        r.lottery_name || "",
        r.draw_no || "",
        r.total_qty || 0,
        r.sold_qty || 0,
        r.unsold_qty || 0,
        r.sold_total || 0,
        r.unsold_total || 0,
        r.last_purchase_time || "",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

      const blob = new Blob([csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `daily-sales-summary-${dayjs().format("YYYY-MM-DD")}.csv`,
      );

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success("CSV downloaded successfully");
    } catch (error) {
      message.error("CSV download failed");
    }
  };
  return (
    <>
      {step === 0 && (
        <>
          <div style={{ position: "relative" }}>
            <Spin
              spinning={loading}
              indicator={<LoadingOutlined spin />}
              tip="Processing..."
            >
              <Title level={3}>Upload Files</Title>
              <Divider />
              <Row gutter={[24, 24]} justify="center">
                <Col xs={24} lg={20}>
                  <Form layout="vertical">
                    <Row gutter={[24, 24]} justify="center">
                      <Col xs={24} sm={10}>
                        {renderUpload(
                          "Daily Transactions (.zip)",
                          "ticket_sales",
                          ".zip",
                          <FileZipOutlined style={{ color: "#2bb800" }} />,
                          "Transactions attached",
                        )}
                      </Col>
                      <Col xs={24} sm={10}>
                        {renderUpload(
                          "Daily Sales (.zip)",
                          "prizes",
                          ".zip",
                          <FileZipOutlined style={{ color: "#d12e2e" }} />,
                          "Daily Sales attached",
                        )}
                      </Col>
                    </Row>
                  </Form>
                </Col>
              </Row>

              <div style={{ textAlign: "center", marginTop: 30 }}>
                <Button
                  type="primary"
                  onClick={handleGenerate}
                  disabled={loading}
                  style={{ marginRight: 10 }}
                >
                  {loading ? <LoadingOutlined /> : "Generate Full Summary"}
                </Button>
                <Button type="primary" danger onClick={handleReset}>
                  Reset
                </Button>
              </div>
            </Spin>
          </div>
        </>
      )}

      {step === 1 && result && (
        <div>
          <Title level={3}>Daily Sales Summary</Title>
          <Divider />
          <div style={{ padding: 20 }} ref={summaryRef}>
            {summaryInfo && (
              <Row gutter={[16, 16]} style={{ marginBottom: 2 }}>
                {/* DRAW DATE */}
                <Col xs={24} sm={12} md={6}>
                  <Card
                    bordered={false}
                    style={{
                      borderRadius: 16,
                      background: "#722ed1",
                      border: "2px solid #722ed1",
                      boxShadow: "0 6px 14px rgba(0,0,0,0.05)",
                    }}
                  >
                    <Text style={{ color: "#eeeeee", fontWeight: 600 }}>
                      Draw Date
                    </Text>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginTop: 5,
                        gap: 10,
                      }}
                    >
                      <CalendarOutlined
                        style={{ fontSize: 18, color: "#ffffff" }}
                      />
                      <span
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                          color: "#ffffff",
                        }}
                      >
                        {drawDate}
                      </span>
                    </div>
                  </Card>
                </Col>

                {/* TOTAL SOLD */}
                <Col xs={24} sm={12} md={6}>
                  <Card
                    bordered={false}
                    style={{
                      borderRadius: 16,
                      background: "#c41a1a",
                      border: "2px solid #c41a1a",
                      boxShadow: "0 6px 14px rgba(0,0,0,0.05)",
                    }}
                  >
                    <Text style={{ color: "#ffeded", fontWeight: 600 }}>
                      Total Sold Quantity
                    </Text>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginTop: 5,
                        gap: 10,
                      }}
                    >
                      <CheckCircleOutlined
                        style={{ fontSize: 22, color: "#ffeded" }}
                      />
                      <span
                        style={{
                          fontSize: 24,
                          fontWeight: 700,
                          color: "#ffeded",
                        }}
                      >
                        {formatNum(summaryInfo.totalSoldQty)}
                      </span>
                    </div>
                  </Card>
                </Col>

                {/* TOTAL PURCHASED */}
                <Col xs={24} sm={12} md={6}>
                  <Card
                    bordered={false}
                    style={{
                      borderRadius: 16,
                      background: "#e6f7ff",
                      border: "2px solid #1677ff",
                      boxShadow: "0 6px 14px rgba(0,0,0,0.05)",
                    }}
                  >
                    <Text style={{ color: "#1677ff", fontWeight: 600 }}>
                      Total Purchased Quantity
                    </Text>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginTop: 5,
                        gap: 10,
                      }}
                    >
                      <ShoppingCartOutlined
                        style={{ fontSize: 18, color: "#1677ff" }}
                      />
                      <span
                        style={{
                          fontSize: 24,
                          fontWeight: 700,
                          color: "#0958d9",
                        }}
                      >
                        {formatNum(summaryInfo.totalPurchasedQty)}
                      </span>
                    </div>
                  </Card>
                </Col>

                {/* SOLD PERCENTAGE */}
                <Col xs={24} sm={12} md={6}>
                  <Card
                    bordered={false}
                    style={{
                      borderRadius: 16,
                      background: "#f0ffe6",
                      border: `2px solid ${percentageColor}`,
                      boxShadow: "0 6px 14px rgba(0,0,0,0.05)",
                    }}
                  >
                    <Text style={{ color: percentageColor, fontWeight: 600 }}>
                      Sold Percentage
                    </Text>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginTop: 5,
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 24,
                          fontWeight: 700,
                          color: percentageColor,
                        }}
                      >
                        {percentage}%
                      </span>
                    </div>
                  </Card>
                </Col>
              </Row>
            )}

            <Card
              bordered={false}
              style={{
                borderRadius: 18,
                boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
                overflow: "hidden",
              }}
              bodyStyle={{ padding: 0 }}
            >
              <Table
                columns={columns}
                dataSource={tableData}
                bordered
                pagination={false}
                className="winway-table"
                rowClassName={(record) =>
                  record.isTotal ? "total-row-professional" : ""
                }
              />
            </Card>
          </div>

          <div style={{ textAlign: "center", marginTop: 20 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => setStep(0)}
              style={{ marginRight: 10 }}
            >
              Back
            </Button>

            <Button onClick={handleReset} style={{ marginRight: 10 }}>
              Start Over
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={downloadPDF}
              style={{ marginRight: 10 }}
            >
              Download PDF
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={downloadCSV}
              style={{ marginRight: 10 }}
            >
              Download CSV
            </Button>

            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={downloadImage}
            >
              Download Image
            </Button>
          </div>
        </div>
      )}
      <style>
        {`
    /* TOTAL ROW */
    .total-row-professional {
      background: linear-gradient(90deg, #f5f5f5, #fafafa) !important;
      font-weight: 700;
      font-size: 16px;
    }

    /* Remove hover effect for total row */
    .ant-table-tbody > tr.total-row-professional:hover > td {
      background: linear-gradient(90deg, #f5f5f5, #fafafa) !important;
    }

    /* Strong top divider */
    .total-row-professional td {
      border-top: 3px solid #000 !important;
      border-bottom: 3px solid #000 !important;
    }

    /* Make numbers slightly darker */
    .total-row-professional td {
      color: #111 !important;
    }
  `}
      </style>
    </>
  );
}

export default DailyFullSummary;
