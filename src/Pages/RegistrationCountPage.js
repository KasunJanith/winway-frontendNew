
import React, { useMemo, useRef, useState } from "react";
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
  Tag,
  Statistic,
  Space,
  Tabs,
  DatePicker,
} from "antd";
import {
  FileTextOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
  LoadingOutlined,
  CheckCircleTwoTone,
  DownloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  countRegistrations,
  getMonthlyActivations,
  getCustomersByDateRange,
} from "../api/endPointsPhyton";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import html2canvas from "html2canvas";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

function RegistrationCountView() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState("bar");
  const [reportType, setReportType] = useState("daily");

  const summaryRef = useRef(null);

  const [customerData, setCustomerData] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);

  /* ================= HELPERS ================= */

  const unwrapResponse = (res) => {
    return res?.data !== undefined ? res.data : res;
  };

  const extractCustomerRows = (res) => {
    const payload = unwrapResponse(res);

    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.customers)) return payload.customers;
    if (Array.isArray(payload?.customers_by_date)) {
      return payload.customers_by_date;
    }

    return [];
  };

  const csvValue = (value) => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };

  const downloadCSV = (filename, headers, rows) => {
    const csvContent = [
      headers.map(csvValue).join(","),
      ...rows.map((row) => row.map(csvValue).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    window.URL.revokeObjectURL(url);
  };

  const getRecordDate = (record = {}) => {
    return (
      record.date ||
      record.RegisteredDate ||
      record.registered_date ||
      record.REGISTEREDDATE ||
      ""
    );
  };

  const getRecordTotalCustomers = (record = {}) => {
    return (
      record.total_customers ||
      record.totalCustomers ||
      record.customer_count ||
      record.count ||
      0
    );
  };

  const getRecordCustomers = (record = {}) => {
    if (Array.isArray(record.customers)) return record.customers;
    if (Array.isArray(record.customer_details)) return record.customer_details;
    if (Array.isArray(record.data)) return record.data;
    return [];
  };

  const getCustomerName = (customer = {}) => {
    return (
      customer.name ||
      customer.FIRSTNAME ||
      customer.FirstName ||
      customer.first_name ||
      customer.NAME ||
      ""
    );
  };

  const getCustomerMobile = (customer = {}) => {
    return (
      customer.mobile_number ||
      customer.MobileNumber ||
      customer.MOBILENUMBER ||
      customer.mobile ||
      customer.phone ||
      ""
    );
  };

  const getCustomerGender = (customer = {}) => {
    return (
      customer.gender ||
      customer.GENDER ||
      customer.Gender ||
      ""
    );
  };

  /* ================= QUICK DATE BUTTONS ================= */

  const setLast7Days = () => {
    setDateRange([dayjs().subtract(7, "day"), dayjs().subtract(1, "day")]);
  };

  const setLast30Days = () => {
    setDateRange([dayjs().subtract(30, "day"), dayjs().subtract(1, "day")]);
  };

  /* ================= UPLOAD CARD ================= */

  const renderUpload = () => {
    const hasFile = !!file;

    return (
      <Card
        size="small"
        style={{
          marginBottom: 16,
          borderRadius: 10,
          borderColor: hasFile ? "#b7eb8f" : "#d9d9d9",
          boxShadow: hasFile ? "0 0 10px rgba(82,196,26,0.2)" : "none",
        }}
      >
        <Form.Item
          label={<Text strong>Customers (.csv)</Text>}
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
              beforeUpload={(selectedFile) => {
                setFile(selectedFile);
                message.success("CSV file selected");
                return false;
              }}
              fileList={
                hasFile
                  ? [
                      {
                        uid: file.uid || "-1",
                        name: file.name,
                        status: "done",
                        originFileObj: file,
                      },
                    ]
                  : []
              }
              onRemove={() => {
                setFile(null);
                return true;
              }}
              accept=".csv"
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
                <FileTextOutlined style={{ color: "#fa8c16" }} />
              </p>

              {hasFile ? (
                <p style={{ color: "#52c41a", fontWeight: 500 }}>
                  Customer list attached
                </p>
              ) : (
                <>
                  <p>Click or drag file to this area</p>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Accepts .csv
                  </Text>
                </>
              )}
            </Upload.Dragger>
          </div>
        </Form.Item>
      </Card>
    );
  };

  /* ================= DOWNLOAD FUNCTIONS ================= */

  const downloadCustomerSummaryCSV = () => {
    try {
      if (!customerData || customerData.length === 0) {
        message.warning("No customer breakdown data available");
        return;
      }

      const rows = customerData.map((item) => [
        getRecordDate(item),
        getRecordTotalCustomers(item),
      ]);

      downloadCSV(
        `customer_breakdown_by_date_${dayjs().format("YYYY-MM-DD")}.csv`,
        ["DATE", "TOTAL_CUSTOMERS"],
        rows,
      );

      message.success("Customer breakdown CSV downloaded successfully");
    } catch (err) {
      console.error(err);
      message.error("CSV download failed");
    }
  };

  const downloadCSVFromCustomers = (customers = [], date) => {
    try {
      if (!customers.length) {
        message.warning("No customer data available for this date");
        return;
      }

      const rows = customers.map((customer) => [
        getCustomerName(customer),
        getCustomerMobile(customer),
        getCustomerGender(customer),
      ]);

      downloadCSV(
        `customers_${date || dayjs().format("YYYY-MM-DD")}.csv`,
        ["FIRSTNAME", "MOBILENUMBER", "GENDER"],
        rows,
      );

      message.success("Customer CSV downloaded");
    } catch (err) {
      console.error(err);
      message.error("CSV download failed");
    }
  };

  const downloadImage = async () => {
    try {
      if (!summaryRef.current) {
        message.warning("No chart available to download");
        return;
      }

      const canvas = await html2canvas(summaryRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const link = document.createElement("a");
      link.download = `${reportType}-registration-summary-${dayjs().format(
        "YYYY-MM-DD",
      )}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error(err);
      message.error("Image download failed");
    }
  };

  /* ================= GENERATE ================= */

  const handleGenerate = async () => {
    if (!file || !dateRange || dateRange.length !== 2) {
      message.error("Upload file and select date range.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);
      setCustomerData([]);

      let start;
      let end;

      if (reportType === "daily") {
        start = dayjs(dateRange[0]).format("YYYY-MM-DD");
        end = dayjs(dateRange[1]).format("YYYY-MM-DD");

        try {
          setCustomerLoading(true);
          const customerRes = await getCustomersByDateRange(file, start, end);
          setCustomerData(extractCustomerRows(customerRes));
        } catch (customerErr) {
          console.error(customerErr);
          setCustomerData([]);
          message.warning("Customer breakdown failed, but report will continue");
        } finally {
          setCustomerLoading(false);
        }
      } else {
        start = dayjs(dateRange[0]).startOf("month").format("YYYY-MM-DD");
        end = dayjs(dateRange[1]).endOf("month").format("YYYY-MM-DD");
      }

      const apiRes =
        reportType === "daily"
          ? await countRegistrations(file, start, end)
          : await getMonthlyActivations(file, start, end);

      setResult(unwrapResponse(apiRes));
      setStep(2);

      message.success("Report generated successfully");
    } catch (err) {
      console.error(err);

      const apiError =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        "Processing failed.";

      setError(Array.isArray(apiError) ? "Processing failed." : apiError);
      message.error("Report generation failed");
    } finally {
      setLoading(false);
      setCustomerLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setDateRange(null);
    setResult(null);
    setError(null);
    setChartType("line");
    setReportType("daily");
    setCustomerData([]);
  };

  /* ================= SAFE DATA ================= */

  const dailyData = useMemo(() => {
    if (reportType !== "daily") return [];

    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.daily_breakdown)) return result.daily_breakdown;
    if (Array.isArray(result?.data?.daily_breakdown)) {
      return result.data.daily_breakdown;
    }

    return [];
  }, [result, reportType]);

  const monthlyData = useMemo(() => {
    if (reportType !== "monthly") return [];

    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.monthly_breakdown)) {
      return result.monthly_breakdown;
    }
    if (Array.isArray(result?.data?.monthly_breakdown)) {
      return result.data.monthly_breakdown;
    }

    return [];
  }, [result, reportType]);

  const chartData = useMemo(() => {
    if (reportType === "daily") {
      return dailyData.map((item) => ({
        label:
          item.RegisteredDate ||
          item.date ||
          item.registered_date ||
          "",
        value: Number(
          item.registration_count ??
            item.count ??
            item.activation_count ??
            0,
        ),
      }));
    }

    return monthlyData.map((item) => ({
      label:
        item.month_name ||
        item.month ||
        item.Month ||
        "",
      value: Number(
        item.activation_count ??
          item.registration_count ??
          item.count ??
          0,
      ),
    }));
  }, [dailyData, monthlyData, reportType]);

  const totalRegistrations = useMemo(() => {
    return chartData.reduce((sum, item) => sum + (item.value || 0), 0);
  }, [chartData]);

  const averagePerDay =
    reportType === "daily" && chartData.length > 0
      ? (totalRegistrations / chartData.length).toFixed(1)
      : 0;

  /* ================= CHART TOOLTIP ================= */

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div
        style={{
          background: "#ffffff",
          padding: "12px 16px",
          borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          border: "1px solid #f0f0f0",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>

        <div style={{ color: "#1890ff", fontWeight: 500 }}>
          {reportType === "daily"
            ? `Registrations: ${payload[0].value}`
            : `Activations: ${payload[0].value}`}
        </div>
      </div>
    );
  };

  /* ================= TABLE COLUMNS ================= */

  const resultColumns =
    reportType === "daily"
      ? [
          {
            title: "Date",
            key: "date",
            render: (_, record) => (
              <Tag color="purple">
                {record.RegisteredDate || record.date || "-"}
              </Tag>
            ),
          },
          {
            title: "Registrations",
            key: "registrations",
            render: (_, record) => (
              <Tag color="green">
                {record.registration_count ?? record.count ?? 0}
              </Tag>
            ),
          },
        ]
      : [
          {
            title: "Month",
            key: "month",
            render: (_, record) => (
              <Tag color="blue">
                {record.month_name || record.month || "-"}
              </Tag>
            ),
          },
          {
            title: "Activations",
            key: "activations",
            render: (_, record) => (
              <Tag color="green">
                {record.activation_count ?? record.count ?? 0}
              </Tag>
            ),
          },
        ];

  const customerInnerColumns = [
    {
      title: "Mobile",
      key: "mobile_number",
      render: (_, record) => (
        <Tag color="blue">{getCustomerMobile(record) || "N/A"}</Tag>
      ),
    },
    {
      title: "Name",
      key: "name",
      render: (_, record) => getCustomerName(record) || "N/A",
    },
    {
      title: "Gender",
      key: "gender",
      render: (_, record) => {
        const gender = getCustomerGender(record);

        return (
          <Tag color={gender === "Male" ? "green" : "magenta"}>
            {gender || "N/A"}
          </Tag>
        );
      },
    },
  ];

  const customerSummaryColumns = [
    {
      title: "Date",
      key: "date",
      render: (_, record) => (
        <Tag color="purple">{getRecordDate(record) || "N/A"}</Tag>
      ),
    },
    {
      title: "Total Customers",
      key: "total_customers",
      render: (_, record) => (
        <Tag color="green" style={{ fontWeight: 600 }}>
          {getRecordTotalCustomers(record)}
        </Tag>
      ),
    },
    {
      title: "Download",
      key: "download",
      render: (_, record) => (
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          size="small"
          onClick={() =>
            downloadCSVFromCustomers(
              getRecordCustomers(record),
              getRecordDate(record),
            )
          }
        >
          CSV
        </Button>
      ),
    },
  ];

  /* ================= RENDER ================= */

  return (
    <Spin spinning={loading} indicator={<LoadingOutlined spin />}>
      {/* ================= STEP 1 ================= */}
      {step === 1 && (
        <>
          <Title level={3}>Registration Analytics</Title>

          <Divider />

          <Row gutter={[24, 24]} justify="center">
            <Col xs={24} lg={20}>
              <Form layout="vertical">
                <Row justify="center">
                  <Col xs={24} md={12}>
                    {renderUpload()}
                  </Col>
                </Row>

                <Row justify="center" style={{ marginBottom: 20 }}>
                  <Space>
                    <Button
                      type={reportType === "daily" ? "primary" : "default"}
                      onClick={() => {
                        setReportType("daily");
                        setDateRange(null);
                      }}
                    >
                      Daily
                    </Button>

                    <Button
                      type={reportType === "monthly" ? "primary" : "default"}
                      onClick={() => {
                        setReportType("monthly");
                        setDateRange(null);
                      }}
                    >
                      Monthly
                    </Button>
                  </Space>
                </Row>

                {reportType === "daily" && (
                  <Row justify="center" style={{ marginBottom: 20 }}>
                    <Space>
                      <Button onClick={setLast7Days}>Last 7 Days</Button>
                      <Button onClick={setLast30Days}>Last 30 Days</Button>
                    </Space>
                  </Row>
                )}

                {reportType === "daily" && (
                  <Row justify="center" style={{ marginTop: 20 }}>
                    <Col xs={24} md={12}>
                      <Form.Item label={<Text strong>Select Date Range</Text>}>
                        <RangePicker
                          style={{ width: "100%" }}
                          value={dateRange}
                          format="YYYY-MM-DD"
                          onChange={(values) => setDateRange(values)}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                )}

                {reportType === "monthly" && (
                  <Row justify="center" style={{ marginTop: 20 }}>
                    <Col xs={24} md={12}>
                      <Form.Item label={<Text strong>Select Month Range</Text>}>
                        <RangePicker
                          picker="month"
                          style={{ width: "100%" }}
                          value={dateRange}
                          format="YYYY-MM"
                          onChange={(values) => setDateRange(values)}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                )}

                {error && (
                  <Alert
                    type="error"
                    message={error}
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                )}

                <div style={{ textAlign: "center" }}>
                  <Button
                    type="primary"
                    icon={<ArrowRightOutlined />}
                    onClick={handleGenerate}
                    disabled={!file || !dateRange}
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

      {/* ================= STEP 2 ================= */}
      {step === 2 && (
        <>
          <Title level={3}>
            {reportType === "daily"
              ? "Daily Registration Results"
              : "Monthly Activation Results"}
          </Title>

          <Tabs defaultActiveKey="overview">
            <Tabs.TabPane tab="Overview" key="overview">
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Card>
                    <Statistic
                      title={
                        reportType === "daily"
                          ? "Total Registrations"
                          : "Total Activations"
                      }
                      value={totalRegistrations}
                      valueStyle={{ color: "#52c41a" }}
                    />
                  </Card>
                </Col>

                {reportType === "daily" && (
                  <Col xs={24} md={8}>
                    <Card>
                      <Statistic
                        title="Average per Day"
                        value={averagePerDay}
                      />
                    </Card>
                  </Col>
                )}
              </Row>
            </Tabs.TabPane>

            <Tabs.TabPane tab="Charts" key="charts">
              <Space style={{ marginBottom: 20 }}>
                 <Button
                  type={chartType === "bar" ? "primary" : "default"}
                  onClick={() => setChartType("bar")}
                >
                  Bar
                </Button>
                <Button
                  type={chartType === "line" ? "primary" : "default"}
                  onClick={() => setChartType("line")}
                >
                  Line
                </Button>

               
              </Space>

              <div ref={summaryRef}>
                <Title
                  level={4}
                  style={{ textAlign: "center", paddingTop: 10 }}
                >
                  {reportType === "daily"
                    ? "Daily Registrations"
                    : "Monthly Activations"}
                </Title>

                <Card>
                  <div style={{ width: "100%", height: 500 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === "line" ? (
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />

                          <XAxis
                            dataKey="label"
                            tickFormatter={(value) =>
                              reportType === "daily"
                                ? dayjs(value).format("MM-DD")
                                : value
                            }
                            tick={{ fontSize: 12 }}
                            interval="preserveStartEnd"
                            minTickGap={25}
                          />

                          <YAxis />

                          <Tooltip content={<CustomTooltip />} />

                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#7b2ff7"
                            strokeWidth={3}
                          />
                        </LineChart>
                      ) : (
                        <BarChart
                          data={chartData}
                          margin={{ top: 30, right: 20, left: 10, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />

                          <XAxis
                            dataKey="label"
                            tickFormatter={(value) =>
                              reportType === "daily"
                                ? dayjs(value).format("D-MMM")
                                : value
                            }
                            angle={-40}
                            textAnchor="end"
                            height={70}
                            tick={{
                              fontSize: 14,
                              fill: "#000000",
                            }}
                            label={{
                              value: reportType === "daily" ? "Date" : "Month",
                              position: "insideBottom",
                              offset: -5,
                              style: {
                                fontSize: 16,
                                fontWeight: 600,
                                fill: "#262626",
                              },
                            }}
                          />

                          <YAxis
                            tick={{ fontSize: 14, fill: "#000000" }}
                            domain={[0, "dataMax + 10"]}
                            label={{
                              value:
                                reportType === "daily"
                                  ? "Registrations"
                                  : "Activations",
                              angle: -90,
                              position: "insideLeft",
                              style: {
                                fontSize: 16,
                                fontWeight: 600,
                                fill: "#262626",
                              },
                            }}
                          />

                          <Tooltip content={<CustomTooltip />} />

                          <Bar
                            dataKey="value"
                            fill="#ad852f"
                            radius={[10, 10, 0, 0]}
                          >
                            <LabelList
                              formatter={(value) =>
                                Number(value || 0).toLocaleString()
                              }
                              dataKey="value"
                              position="top"
                              style={{
                                fontSize: 16,
                                fontWeight: 700,
                                fill: "#262626",
                              }}
                            />
                          </Bar>
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </Tabs.TabPane>

            <Tabs.TabPane tab="Table" key="table">
              <Table
                columns={resultColumns}
                dataSource={reportType === "daily" ? dailyData : monthlyData}
                rowKey={(record, index) =>
                  reportType === "daily"
                    ? `${record.RegisteredDate || record.date || index}`
                    : `${record.month_name || record.month || index}`
                }
                bordered
              />
            </Tabs.TabPane>

            {reportType === "daily" && (
              <Tabs.TabPane tab="Day-wise Customers" key="customers">
                <Spin spinning={customerLoading}>
                  <Card>
                    <Title level={4}>Customer Breakdown by Date</Title>

                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={downloadCustomerSummaryCSV}
                      style={{ marginBottom: 16 }}
                    >
                      Download Summary CSV
                    </Button>

                    <Table
                      dataSource={customerData}
                      rowKey={(record, index) =>
                        `${getRecordDate(record) || "date"}-${index}`
                      }
                      expandable={{
                        expandedRowRender: (record) => (
                          <Table
                            columns={customerInnerColumns}
                            dataSource={getRecordCustomers(record)}
                            pagination={false}
                            rowKey={(customer, index) =>
                              `${getCustomerMobile(customer) || "mobile"}-${index}`
                            }
                            size="small"
                          />
                        ),
                      }}
                      columns={customerSummaryColumns}
                      bordered
                    />
                  </Card>
                </Spin>
              </Tabs.TabPane>
            )}
          </Tabs>

          <div style={{ textAlign: "center", marginTop: 20 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => setStep(1)}
              style={{ marginRight: 10 }}
            >
              Back
            </Button>

            <Button
              type="primary"
              onClick={handleReset}
              style={{ marginRight: 10 }}
            >
              Start Over
            </Button>

            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={downloadImage}
            >
              Download Image
            </Button>
          </div>
        </>
      )}
    </Spin>
  );
}

export default RegistrationCountView;
