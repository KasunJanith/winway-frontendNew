import React, { useState, useCallback, useMemo } from "react";
import {
  Form,
  Upload,
  Button,
  Card,
  Typography,
  message,
  Spin,
  Divider,
  Progress,
  Alert,
  Row,
  Col,
  Steps,
  Statistic,
  Table,
  Input,
  Tag,
  Result,
  Modal,
} from "antd";
import {
  LoadingOutlined,
  FileZipOutlined,
  FileTextOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  GiftOutlined,
  TeamOutlined,
  CrownOutlined,
  SearchOutlined,
  TrophyOutlined,
  RiseOutlined,
  DownloadOutlined,
  SaveFilled,
} from "@ant-design/icons";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import CustomerModel from "../componets/CustomerModel";
import { ENV } from "../config/env";

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { Search } = Input;



const API_BASE = ENV.REACT_APP_API_BASE_PY;
const API_BASE_Local = ENV.API_BASE_LOCAL;

function LoyalityUpgrade() {
  // ---------------- STATE ----------------
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);

  const [summary, setSummary] = useState(null);
  const [weekRange, setWeekRange] = useState(null);
  const [files, setFiles] = useState({});
  const [searchText, setSearchText] = useState("");
  const [fileNames, setFileNames] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 5 });

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [saveSummary, setSaveSummary] = useState(null);
  const [saveModalVisible, setSaveModalVisible] = useState(false);

  function getTier(ticketCount, currentTier, map) {
    const platinum = Number(map.LOYALTY_MONTHLY_PLATINUM_TICKETS) || 1000;
    const gold = Number(map.LOYALTY_MONTHLY_GOLD_TICKETS) || 500;
    const silver = Number(map.LOYALTY_MONTHLY_SILVER_TICKETS) || 300;

    if (ticketCount >= platinum) {
      return "Platinum";
    }

    if (ticketCount >= gold) {
      return "Gold";
    }

    if (ticketCount >= silver) {
      return "Silver";
    }
    if (
      currentTier == "Gold" ||
      currentTier == "Platinum" ||
      currentTier == "Silver"
    ) {
      return "Blue";
    }

    if (currentTier == "Blue") {
      return "Warning";
    } else {
      return "Rejected";
    }
  }
  const normalizeKeys = (obj) => {
    const keyMap = {
      "Ada Sampatha": "Ada_Sampatha",
      "Dhana Nidhanaya": "Dhana_Nidhanaya",
      "Mahajana Sampatha": "Mahajana_Sampatha",
      "Mega Power": "Mega_Power",
      "Suba Dawasak": "Suba_Dawasak",
    };

    const normalized = {};
    for (const key in obj) {
      const newKey = keyMap[key] || key;
      const val = Number(obj[key]) || 0; // Convert to number, handle nulls or strings
      normalized[newKey] = val;
    }

    return normalized;
  };

  function mergeLotteryBreakdowns(obj1 = {}, obj2 = {}) {
    // Normalize both objects (handle nulls, mixed key formats, etc.)
    const normalizeKeys = (obj) => {
      const keyMap = {
        "Ada Sampatha": "Ada_Sampatha",
        "Dhana Nidhanaya": "Dhana_Nidhanaya",
        "Mahajana Sampatha": "Mahajana_Sampatha",
        "Mega Power": "Mega_Power",
        "Suba Dawasak": "Suba_Dawasak",
      };

      const normalized = {};
      for (const key in obj) {
        const newKey = keyMap[key] || key;
        const val = Number(obj[key]) || 0; // Convert to number, handle nulls or strings
        normalized[newKey] = val;
      }

      return normalized;
    };

    const lb1 = normalizeKeys(obj1);
    const lb2 = normalizeKeys(obj2);

    // Merge the two breakdowns
    const merged = {};
    const allKeys = new Set([...Object.keys(lb1), ...Object.keys(lb2)]);

    allKeys.forEach((key) => {
      // Ignore non-numeric fields like MobileNumber if accidentally present
      const v1 = Number(lb1[key]) || 0;
      const v2 = Number(lb2[key]) || 0;
      merged[key] = v1 + v2;
    });

    // ✅ Recalculate TotalTickets (sum of all other ticket types)
    return merged;
  }

  const separation = async () => {
    try {
      const res = await axios.get(
        `${API_BASE_Local}/loyalCustomer/combined`
      );

      const ll = checkFoldersSameMonth(fileNames);

      const res2 = await axios.get(`${API_BASE_Local}/api/settings`);
      const map = Object.fromEntries(
        res2.data.data.map((s) => [s.key, s.value])
      );

      if (res.data?.success) {
        const data = res.data.data || [];

        // ✅ Customers that appear in both `results` and `data`
        const inResultData = data.filter((cust) =>
          results.some((r) => r.MobileNumber === cust.MobileNumber)
        );
        const dataInResult = results.filter((r) =>
          data.some((cust) => cust.MobileNumber === r.MobileNumber)
        );

        const mergedCustomers = inResultData.map((cust) => {
          const match = dataInResult.find(
            (r) => r.MobileNumber === cust.MobileNumber
          );
          const MobileNumber = cust.MobileNumber;
          const Last_Update = ll.year + "_" + ll.monthText;
          const Month_Tier = match.Loyalty_Tier;
          const WalletBalance = cust.CustomerInfo.WalletBalance;
          const LotteryBreakdown = normalizeKeys(match.LotteryBreakdown);

          const Ada_Sampatha = LotteryBreakdown.Ada_Sampatha;
          const Dhana_Nidhanaya = LotteryBreakdown.Dhana_Nidhanaya;
          const Govisetha = LotteryBreakdown.Govisetha;
          const Handahana = LotteryBreakdown.Handahana;
          const Jaya = LotteryBreakdown.Jaya;
          const Mahajana_Sampatha = LotteryBreakdown.Mahajana_Sampatha;
          const Mega_Power = LotteryBreakdown.Mega_Power;
          const Suba_Dawasak = LotteryBreakdown.Suba_Dawasak;
          const Monthly_Ticket_Count = match.Ticket_Count;

          return {
            MobileNumber,
            Last_Update,
            Month_Tier,
            Ada_Sampatha,
            Dhana_Nidhanaya,
            Govisetha,
            Handahana,
            Jaya,
            Mahajana_Sampatha,
            Mega_Power,
            Suba_Dawasak,
            Monthly_Ticket_Count,
            WalletBalance,
          };
        });

        // ✅ Customers that are in `data` but NOT in `results`
        const notInResult = data.filter(
          (cust) => !results.some((r) => r.MobileNumber === cust.MobileNumber)
        );

        const notInResultNew = notInResult.map((notInCustomer) => {
          const currnetTier = notInCustomer.CustomerInfo.Current_Loyalty_Tier;

          const newTier = getTier(0, currnetTier, map);

          const MobileNumber = notInCustomer.MobileNumber;
          const Last_Update = ll.year + "_" + ll.monthText;
          const Month_Tier = newTier;
          const WalletBalance = notInCustomer.CustomerInfo.WalletBalance;

          const Ada_Sampatha = 0;
          const Dhana_Nidhanaya = 0;
          const Govisetha = 0;
          const Handahana = 0;
          const Jaya = 0;
          const Mahajana_Sampatha = 0;
          const Mega_Power = 0;
          const Suba_Dawasak = 0;
          const Monthly_Ticket_Count = 0;

          return {
            MobileNumber,
            Last_Update,
            Month_Tier,
            Ada_Sampatha,
            Dhana_Nidhanaya,
            Govisetha,
            Handahana,
            Jaya,
            Mahajana_Sampatha,
            Mega_Power,
            Suba_Dawasak,
            Monthly_Ticket_Count,
            WalletBalance,
          };
        });

        const finalMerged = [...notInResultNew, ...mergedCustomers];
        console.log(mergedCustomers[0]);

        console.log(notInResultNew[0]);
        try {
          setLoading(true);

          const res = await axios.post(
            `${API_BASE_Local}/api/loyalCustomer/monthly-update`,
            {
              updates: finalMerged,
            }
          );

          if (res.data.success) {
            message.success("✅ Loyalty data saved successfully!");
            setSaveSummary({
              total: results.length,
              inserted: res.data.inserted,
              message: res.data.message,
            });
            setSaveModalVisible(true);
          } else {
            message.warning(
              res.data.message || "Some entries may have been skipped."
            );
          }
        } catch (err) {
          console.error(err);
          message.error("❌ Failed to save loyalty data!");
        } finally {
          setLoading(false);
        }
        message.success("✅ Entry customers loaded successfully");
      } else {
        message.warning("No customer data found.");
      }
    } catch (error) {
      console.error("❌ Error fetching customers:", error);
      message.error("Failed to fetch entry customers.");
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (record) => {
    setSelectedCustomer(record);
    setIsModalVisible(true);
  };

  function checkFoldersSameMonth(folderNames) {
    if (!Array.isArray(folderNames) || folderNames.length === 0) {
      throw new Error(
        "❌ Invalid input: folderNames must be a non-empty array."
      );
    }

    // Parse all folder names as dates
    const parsedDates = folderNames.map((f) => new Date(f));

    // Validate date format
    if (parsedDates.some((d) => isNaN(d.getTime()))) {
      throw new Error(
        "❌ Invalid date format detected. Use YYYY-MM-DD format."
      );
    }

    // Extract year and month from first
    const firstYear = parsedDates[0].getFullYear();
    const firstMonth = parsedDates[0].getMonth();

    // Check all are same year and month
    const allSameMonth = parsedDates.every(
      (d) => d.getFullYear() === firstYear && d.getMonth() === firstMonth
    );

    if (!allSameMonth) {
      const foundMonths = [
        ...new Set(
          parsedDates.map(
            (d) =>
              `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
          )
        ),
      ];
      throw new Error(
        `❌ Folders span multiple months: ${foundMonths.join(", ")}`
      );
    }

    const monthText = parsedDates[0].toLocaleString("default", {
      month: "long",
    });
    const monthNumber = String(firstMonth + 1).padStart(2, "0");

    console.log(`✅ All folders are from ${monthText} ${firstYear}`);

    return {
      year: firstYear,
      monthText, // e.g. "October"
      monthNumber, // e.g. "10"
    };
  }

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

  const handleReset = useCallback(() => {
    setStep(1);
    setFiles({});
    setResults([]);
    setSummary(null);
    setError(null);
    message.info("Form reset successfully");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ---------------- STEP 1 → PROCESS ----------------
  const handleSubmit = async () => {
    if (!files.zip_file || !files.customers_file) {
      message.warning("⚠️ Please upload both ZIP and CSV files first!");
      return;
    }
    const formData = new FormData();

    const res = await axios.get(`${API_BASE_Local}/api/settings`);
    const map = Object.fromEntries(res.data.data.map((s) => [s.key, s.value]));
    formData.append(
      "platinum",
      parseInt(map.LOYALTY_MONTHLY_PLATINUM_TICKETS, 10)
    ); // ✅ always int
    formData.append("gold", parseInt(map.LOYALTY_MONTHLY_GOLD_TICKETS, 10)); // ✅ always int
    formData.append("silver", parseInt(map.LOYALTY_MONTHLY_SILVER_TICKETS, 10)); // ✅ always int
    formData.append("minVal", parseInt(map.LOYALTY_DOWNGRADE_THRESHOLD, 10)); // ✅ always int
    Object.entries(files).forEach(([key, file]) => formData.append(key, file));

    try {
      setLoading(true);
      setProgress(0);

      const res = await axios.post(
        `${API_BASE}/api/customer-tickets-loyal/`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            if (e.total) setProgress(Math.round((100 * e.loaded) / e.total));
          },
        }
      );

      const data = res.data;

      if (!data || !data.customers) {
        message.warning("No valid ticket data found!");
        return;
      }

      const tierCounts = data.customers.reduce((acc, curr) => {
        const tier = curr.Loyalty_Tier || "None";
        acc[tier] = (acc[tier] || 0) + 1;
        return acc;
      }, {});

      // 🧩 Add tier counts to summary

      const totalTicketsSum = data.customers.reduce(
        (acc, curr) => acc + Number(curr.Ticket_Count || 0),
        0
      );

      const updatedSummary = {
        ...data.summary,
        tiers: tierCounts,
        totalTicketsSum: totalTicketsSum,
      };

      setResults(data.customers);
      setSummary(updatedSummary);
      setWeekRange(data.week_range);
      console.log(data.zip_folders);
      checkFoldersSameMonth(data.zip_folders);
      setFileNames(data.zip_folders);
      setStep(2);
      message.success("✅ Ticket report generated successfully!");
    } catch (err) {
      console.log(err);
      setError("❌ Error processing ticket data!");
      message.error("Error generating report!");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadData = () => {
    if (!filteredResults || filteredResults.length === 0) {
      message.warning("No data available to download!");
      return;
    }

    // Convert data to worksheet
    const ws = XLSX.utils.json_to_sheet(filteredResults);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Loyalty Summary");

    // Generate Excel file buffer and save
    const excelBuffer = XLSX.write(wb, {  bookType: "csv", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const fileName = `WinWay_Loyalty_Report_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    saveAs(blob, fileName);
    message.success("✅ Loyalty report downloaded!");
  };
  const numberRender = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString() : v ?? "-";
  };
  // ---------------- FILTERS ----------------
  const filteredResults = useMemo(() => {
    if (!searchText) return results;
    const text = searchText.toLowerCase();
    return results.filter(
      (r) =>
        (r.Customer_Name && r.Customer_Name.toLowerCase().includes(text)) ||
        (r.MobileNumber && r.MobileNumber.toLowerCase().includes(text))
    );
  }, [searchText, results]);

  const ticketColumns = [
    {
      title: "Customer",
      dataIndex: "FirstName", // still needed for sorting and indexing
      sorter: (a, b) =>
        (a.FirstName + " " + a.LastName).localeCompare(
          b.FirstName + " " + b.LastName
        ),
      render: (_, record) => `${record.FirstName} ${record.LastName}`,
    },
    {
      title: "Mobile",
      dataIndex: "MobileNumber",
      sorter: (a, b) => a.MobileNumber.localeCompare(b.MobileNumber),
    },
    {
      title: "Total Tickets Last Month",
      dataIndex: "Ticket_Count",
      align: "center",
      sorter: (a, b) => Number(a.Ticket_Count) - Number(b.Ticket_Count),
      render: numberRender,
    },
    {
      title: "Tier",
      dataIndex: "Loyalty_Tier",
      align: "center",
      filters: [
        { text: "Platinum", value: "Platinum" },
        { text: "Gold", value: "Gold" },
        { text: "Silver", value: "Silver" },
        { text: "Blue", value: "Blue" },
        { text: "None", value: "None" },
      ],
      onFilter: (value, record) => record.Tier === value,
      sorter: (a, b) => a.Loyalty_Tier.localeCompare(b.Loyalty_Tier),
      render: (tier) => {
        const colorMap = {
          Platinum: "geekblue",
          Gold: "gold",
          Silver: "gray",
          Blue: "blue",
          None: "default",
        };
        return (
          <Tag color={colorMap[tier] || "default"} style={{ fontWeight: 600 }}>
            {tier || "None"}
          </Tag>
        );
      },
    },
  ];

  // ---------------- REUSABLE UPLOAD ----------------
  const renderUpload = useCallback(
    (label, name, accept, icon, successMsg) => {
      const hasFile = !!files[name];
      return (
        <Card
          size="small"
          style={{
            marginBottom: 16,
            borderRadius: 10,
            borderColor: hasFile ? "#b7eb8f" : "#d9d9d9",
            boxShadow: hasFile ? "0 0 10px rgba(82,196,26,0.2)" : "none",
          }}
          styles={{ padding: 8 }}
        >
          <Form.Item
            label={<Text strong>{label}</Text>}
            style={{ marginBottom: 8 }}
          >
            <Dragger
              beforeUpload={(file) => handleChange(file, name)}
              fileList={hasFile ? [files[name]] : []}
              onRemove={() => handleRemove(name)}
              accept={accept}
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
                {icon}
              </p>
              {hasFile ? (
                <p style={{ color: "#52c41a", fontWeight: 500 }}>
                  {successMsg}
                </p>
              ) : (
                <>
                  <p>Click or drag file to this area</p>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Accepts {accept}
                  </Text>
                </>
              )}
            </Dragger>
          </Form.Item>
        </Card>
      );
    },
    [files, handleChange, handleRemove]
  );

  // ---------------- RENDER ----------------
  return (
    <>
      {/* STEP 1 */}
      {step === 1 && (
        <div style={{ position: "relative" }}>
          <Spin
            spinning={loading}
            indicator={<LoadingOutlined spin />}
            tip="Processing..."
          >
            <Title level={3} style={{ textAlign: "left" }}>
              Upload ZIP and Customer Files
            </Title>
            <Divider />
            <Row gutter={[24, 24]} justify="center">
              <Col xs={24} lg={20}>
                <Form layout="vertical">
                  <Row gutter={[12, 12]} justify="center">
                    <Col xs={24} sm={12} md={8}>
                      {renderUpload(
                        "Tickets ZIP (.zip)",
                        "zip_file",
                        ".zip",
                        <FileZipOutlined style={{ color: "#1890ff" }} />,
                        "Tickets ZIP attached"
                      )}
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                      {renderUpload(
                        "Customers CSV (.csv)",
                        "customers_file",
                        ".csv",
                        <FileTextOutlined style={{ color: "#fa8c16" }} />,
                        "Customers file attached"
                      )}
                    </Col>
                  </Row>

                  {error && (
                    <Alert
                      type="error"
                      message={error}
                      showIcon
                      style={{ marginTop: 15 }}
                    />
                  )}

                  {progress > 0 && (
                    <Progress
                      percent={progress}
                      status={loading ? "active" : "normal"}
                      style={{ marginTop: 20 }}
                    />
                  )}

                  <div style={{ textAlign: "center", marginTop: 30 }}>
                    <Button
                      type="primary"
                      size="large"
                      icon={<ArrowRightOutlined />}
                      onClick={handleSubmit}
                      disabled={loading}
                      style={{ marginRight: 10 }}
                    >
                      {loading ? "Processing..." : "Proceed to12313212132 Process"}
                    </Button>
                    <Button
                      icon={<ReloadOutlined />}
                      danger
                      type="primary"
                      size="large"
                      onClick={handleReset}
                    >
                      Reset
                    </Button>
                  </div>
                </Form>
              </Col>
            </Row>
          </Spin>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div style={{ position: "relative" }}>
          <Spin
            spinning={loading}
            tip="Loading summary..."
            indicator={<LoadingOutlined spin />}
          >
            <Row
              justify="space-between"
              align="middle"
              style={{ marginBottom: 20 }}
            >
              {" "}
              <Title level={3} style={{ textAlign: "left" }}>
                Ticket Summary Results
              </Title>
            </Row>

            <Divider />

            <Row gutter={[16, 16]} style={{ marginBottom: 10 }}>
              <Col xs={24} sm={12} md={12}>
                <Card>
                  <Statistic
                    title="Loyal Customers"
                    value={summary.loyal_customers}
                    prefix={<TeamOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={12}>
                <Card>
                  <Statistic
                    title="Total Tickets"
                    value={summary.totalTicketsSum}
                    prefix={<CrownOutlined />}
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 25 }}>
              {/* Platinum Tier */}
              <Col xs={24} sm={12} md={8}>
                <Card>
                  <Statistic
                    title="Platinum"
                    value={summary?.tiers?.Platinum || 0}
                    valueStyle={{ color: "#7b2ff7", fontWeight: 700 }}
                    prefix={<TrophyOutlined />}
                  />
                </Card>
              </Col>

              {/* Gold Tier */}
              <Col xs={24} sm={12} md={8}>
                <Card>
                  <Statistic
                    title="Gold"
                    value={summary?.tiers?.Gold || 0}
                    valueStyle={{ color: "#facc15", fontWeight: 700 }}
                    prefix={<GiftOutlined />}
                  />
                </Card>
              </Col>

              {/* Silver Tier */}
              <Col xs={24} sm={12} md={8}>
                <Card>
                  <Statistic
                    title="Silver"
                    value={summary?.tiers?.Silver || 0}
                    valueStyle={{ color: "#a1a1aa", fontWeight: 700 }}
                    prefix={<RiseOutlined />}
                  />
                </Card>
              </Col>
            </Row>
            <Divider />
            <Row
              gutter={[16, 16]}
              style={{
                marginBottom: 20,
                display: "flex",
                justifyContent: "flex-start",
              }}
            >
              <Col xs={24} md={10}>
                <Input.Search
                  placeholder="Search by name, email, or mobile"
                  allowClear
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                  }}
                />
              </Col>
            </Row>
            <CustomerModel
              open={isModalVisible}
              onClose={() => setIsModalVisible(false)}
              customer={selectedCustomer}
            />
            <Table
              dataSource={filteredResults}
              columns={ticketColumns}
              rowKey="MobileNumber"
              bordered
              size="middle"
              scroll={{ x: true, y: 420 }}
              sticky
              onRow={(record) => ({
                onClick: () => handleRowClick(record),
              })}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                showSizeChanger: true,
                pageSizeOptions: ["5", "10", "25", "50" ,"100"],
                showTotal: (total, range) =>
                  `Showing ${range[0]}-${range[1]} of ${total} customers`,
                onChange: (page, pageSize) =>
                  setPagination({ current: page, pageSize }),
              }}
              rowClassName={(record) => {
                switch (record.Loyalty_Tier) {
                  case "Platinum":
                    return "tier-row-platinum";
                  case "Gold":
                    return "tier-row-gold";
                  case "Silver":
                    return "tier-row-silver";
                  case "Blue":
                    return "tier-row-blue";
                  default:
                    return "";
                }
              }}
              style={{ borderRadius: 8, overflow: "hidden" }}
            />

            <style>
              {`
.ant-table-tbody > tr.tier-row-platinum > td {
  background: linear-gradient(90deg, #f8f9fa, #e8f0ff) !important;
  font-weight: 400;
  font-size: 14px !important;
  border-bottom: 2px solid #c5cae9 !important; /* ✅ Added */
}

.ant-table-tbody > tr.tier-row-gold > td {
  background: linear-gradient(90deg, #fff8e1, #ffecb3) !important;
  font-weight: 400;
  font-size: 14px !important;
  border-bottom: 2px solid #ffcc80 !important; /* ✅ Added */
}

.ant-table-tbody > tr.tier-row-silver > td {
  background: linear-gradient(90deg, #f5f5f5, #e0e0e0) !important;
  font-weight: 400;
  font-size: 14px !important;
  border-bottom: 2px solid #bdbdbd !important; /* ✅ Added */
}

.ant-table-tbody > tr.tier-row-blue > td {
  background: linear-gradient(90deg, #e3f2fd, #bbdefb) !important;
  font-weight: 400;
  font-size: 14px !important;
  border-bottom: 2px solid #90caf9 !important; /* ✅ Added */
}


`}
            </style>

            <div style={{ textAlign: "center", marginTop: 25 }}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => setStep(1)}>
                Back To Uploads
              </Button>
              <Button
                icon={<SaveFilled />}
                type="primary"
                style={{ marginLeft: 10 }}
                onClick={separation}
              >
                Save Loyalty Data
              </Button>
              <Button
                icon={<DownloadOutlined />}
                type="primary"
                style={{ marginLeft: 10 }}
                onClick={handleDownloadData}
              >
                Download Data
              </Button>
            </div>
          </Spin>
        </div>
      )}

      {saveModalVisible && (
        <Modal
          open={saveModalVisible}
          centered
          footer={[
            <Button
              key="ok"
              type="primary"
              onClick={() => setSaveModalVisible(false)}
            >
              OK
            </Button>,
          ]}
          onCancel={() => setSaveModalVisible(false)}
          width={500}
        >
          <Result
            status="success"
            title="Loyalty Data Saved Successfully!"
            subTitle={`Summary for this upload:`}
            extra={[
              <div key="details" style={{ textAlign: "left", marginTop: 10 }}>
                <p>
                  <strong>Total Processed:</strong> {saveSummary?.total || 0}
                </p>
                <p>
                  <strong>Inserted:</strong> {saveSummary?.inserted || 0}
                </p>
                <p>
                  <strong>Message:</strong> {saveSummary?.message || ""}
                </p>
              </div>,
            ]}
          />
        </Modal>
      )}
    </>
  );
}

export default LoyalityUpgrade;
