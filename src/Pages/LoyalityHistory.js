import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  Input,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Spin,
  Divider,
  message,
  Button,
  Typography,
  Tooltip,
  Select,
  Space,
  Empty,
  Segmented,
} from "antd";
import {
  TeamOutlined,
  CrownOutlined,
  TrophyOutlined,
  GiftOutlined,
  RiseOutlined,
  ReloadOutlined,
  DownloadOutlined,
  DeleteFilled,
  WarningOutlined,
  DragOutlined,
  UserOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import CustomerLoyaltyModal from "../componets/CustomerLoyaltyModal";
import {
  getCombinedCustomers,
  getMonthlyUpgrades,
  getSettings,
} from "../api/endPoints";
const { Search } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

import { ENV } from "../config/env";
const API_BASE = ENV.API_BASE_LOCAL;

/** ---------- Utilities ---------- */
const tierColors = {
  Platinum: "#9B5DE5",
  Gold: "#E6B800",
  Silver: "#C0C0C0",
  Blue: "#2563EB",
  Warning: "#FFA500",
  Rejected: "#E63946",
};

const tierIcons = {
  Platinum: <TrophyOutlined />,
  Gold: <GiftOutlined />,
  Silver: <RiseOutlined />,
  Blue: <RiseOutlined />,
  Warning: <WarningOutlined />,
  Rejected: <DragOutlined />,
};

const monthStrToDate = (m) => {
  // "2025_October" -> Date(2025, 9, 1)
  if (!m) return new Date(0);
  const [y, mon] = m.split("_");
  const idx = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ].findIndex((x) => x.toLowerCase() === mon?.toLowerCase());
  return new Date(Number(y || 0), Math.max(0, idx), 1);
};

const displayMonth = (m) => {
  return m;
};

const numeric = (v) => Number(v || 0);

const LOTTERY_KEYS = [
  "Ada_Sampatha",
  "Dhana_Nidhanaya",
  "Govisetha",
  "Handahana",
  "Jaya",
  "Mahajana_Sampatha",
  "Mega_Power",
  "Suba_Dawasak",
];

/** Aggregate for population average by month -> avg tickets */
const buildPopulationAverages = (rows) => {
  const map = new Map();
  rows.forEach((r) => {
    const key = r.Last_Update;
    const prev = map.get(key) || { sum: 0, n: 0 };
    prev.sum += numeric(r.Monthly_Ticket_Count);
    prev.n += 1;
    map.set(key, prev);
  });
  // return { "2025_October": avgTickets, ... }
  const out = {};
  [...map.entries()].forEach(([k, { sum, n }]) => (out[k] = n ? sum / n : 0));
  return out;
};

function LoyaltyHistory() {
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(false);
  const [groupedHistory, setGroupedHistory] = useState([]);

  // filters
  const [searchText, setSearchText] = useState("");
  const [selectedMonths, setSelectedMonths] = useState([]); // array of Last_Update
  const [selectedCustomer, setSelectedCustomer] = useState(undefined); // MobileNumber
  const [selectedTier, setSelectedTier] = useState(null);

  // paging
  const [pagination, setPagination] = useState({ current: 1, pageSize: 5 });

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCustomer, setModalCustomer] = useState(null);
  const [modalCustomerHistory, setModalCustomerHistory] = useState([]);
  const [populationAverages, setPopulationAverages] = useState({});
  const [uniqueMonths, setUniqueMonths] = useState([]);
  // fetch
  const groupMonthlyHistoryByMobile = (rows) => {
    const grouped = {};

    rows.forEach((row) => {
      const mobile = row.MobileNumber;
      if (!mobile) return;

      if (!grouped[mobile]) {
        grouped[mobile] = {
          MobileNumber: mobile,
          History: [],
        };
      }

      grouped[mobile].History.push({
        Last_Update: row.Last_Update,
        Month_Tier: row.Month_Tier,
        Monthly_Ticket_Count: row.Monthly_Ticket_Count,
      });
    });

    return Object.values(grouped);
  };
  const flattenGroupedHistory = (groupedHistory) => {
    const rows = [];

    groupedHistory.forEach((customer) => {
      customer.History.forEach((h) => {
        rows.push({
          MobileNumber: customer.MobileNumber,
          Last_Update: h.Last_Update,
          Month_Tier: h.Month_Tier,
          Monthly_Ticket_Count: h.Monthly_Ticket_Count,
        });
      });
    });

    return rows;
  };
  const downloadMonthlyHistoryCSV = (groupedHistory) => {
    if (!groupedHistory || groupedHistory.length === 0) {
      message.warning("No data to download");
      return;
    }

    const rows = flattenGroupedHistory(groupedHistory);

    const headers = [
      "MobileNumber",
      "Last_Update",
      "Month_Tier",
      "Monthly_Ticket_Count",
    ];

    const csvContent = [
      headers.join(","), // header row
      ...rows.map((row) => headers.map((h) => `"${row[h] ?? ""}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "Monthly_Loyalty_History.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  const fetchHistory = async () => {
    setLoading(true);

    try {
      const data = await getMonthlyUpgrades();

      if (data?.success && Array.isArray(data.data)) {
        const uniqueMonthsArr = [
          ...new Set(data.data.map((r) => r.Last_Update).filter(Boolean)),
        ].sort((a, b) => monthStrToDate(a) - monthStrToDate(b));

        console.log("Unique Last_Update months:", uniqueMonthsArr);
        setUniqueMonths(uniqueMonthsArr);

        const rows = data.data.slice().sort((a, b) => {
          const d =
            monthStrToDate(a.Last_Update) - monthStrToDate(b.Last_Update);

          if (d !== 0) return d;

          return (a.MobileNumber || "").localeCompare(b.MobileNumber || "");
        });

        setRaw(rows);

        const formattedHistory = groupMonthlyHistoryByMobile(rows);
        setGroupedHistory(formattedHistory);

        message.success("Loyalty history loaded");
      } else {
        setRaw([]);
        setGroupedHistory([]);
        setUniqueMonths([]);
        message.warning("No data found");
      }
    } catch (e) {
      console.error(e);
      message.error("Failed to load loyalty history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const buildTableRows = (groupedHistory) => {
    const rows = [];

    groupedHistory.forEach((customer) => {
      customer.History.forEach((h, index) => {
        rows.push({
          key: `${customer.MobileNumber}-${index}`,
          MobileNumber: customer.MobileNumber,
          Last_Update: h.Last_Update,
          Month_Tier: h.Month_Tier,
          Monthly_Ticket_Count: h.Monthly_Ticket_Count,
          isFirstRow: index === 0,
          rowSpan: index === 0 ? customer.History.length : 0,
        });
      });
    });

    return rows;
  };
  const columns = [
    {
      title: "Mobile Number",
      dataIndex: "MobileNumber",
      key: "MobileNumber",
      render: (text, row) => ({
        children: text,
        props: {
          rowSpan: row.rowSpan,
        },
      }),
    },
    {
      title: "Period",
      dataIndex: "Last_Update",
      key: "Last_Update",
    },
    {
      title: "Tier",
      dataIndex: "Month_Tier",
      key: "Month_Tier",
      render: (tier) => (
        <Tag
          color={
            tier === "Platinum"
              ? "purple"
              : tier === "Gold"
                ? "gold"
                : tier === "Silver"
                  ? "blue"
                  : "default"
          }
        >
          {tier}
        </Tag>
      ),
    },
    {
      title: "Ticket Count",
      dataIndex: "Monthly_Ticket_Count",
      key: "Monthly_Ticket_Count",
      align: "right",
    },
  ];

  // distinct months & customers for selectors
  const monthOptions = useMemo(() => {
    const set = new Set(raw.map((r) => r.Last_Update).filter(Boolean));
    return [...set].sort((a, b) => monthStrToDate(a) - monthStrToDate(b));
  }, [raw]);

  const customerOptions = useMemo(() => {
    const set = new Set(raw.map((r) => r.MobileNumber).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [raw]);

  // compute filtered rows
  const filteredRows = useMemo(() => {
    let rows = raw;

    if (selectedMonths?.length) {
      const s = new Set(selectedMonths);
      rows = rows.filter((r) => s.has(r.Last_Update));
    }
    if (selectedCustomer) {
      rows = rows.filter((r) => r.MobileNumber === selectedCustomer);
    }
    if (selectedTier) {
      rows = rows.filter((r) => r.Month_Tier === selectedTier);
    }

    if (searchText) {
      const q = searchText.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.MobileNumber || "").toLowerCase().includes(q) ||
          (r.Month_Tier || "").toLowerCase().includes(q) ||
          (r.Last_Update || "").toLowerCase().includes(q),
      );
    }
    return rows;
  }, [raw, selectedMonths, selectedCustomer, searchText]);

  // summary (for current filter)
  const summary = useMemo(() => {
    const s = {
      totalRecords: filteredRows.length,
      totalTickets: filteredRows.reduce(
        (acc, r) => acc + numeric(r.Monthly_Ticket_Count),
        0,
      ),
      tierCounts: {},
    };
    filteredRows.forEach((r) => {
      const t = r.Month_Tier || "Unknown";
      s.tierCounts[t] = (s.tierCounts[t] || 0) + 1;
    });
    return s;
  }, [filteredRows]);

  // grouped by customer view (aggregated latest row per customer)
  const groupedByCustomer = useMemo(() => {
    // Map Mobile -> all rows (sorted by month asc)
    const m = new Map();

    filteredRows.forEach((r) => {
      const arr = m.get(r.MobileNumber) || [];
      arr.push(r);
      m.set(r.MobileNumber, arr);
    });
    const out = [];
    m.forEach((arr, mobile) => {
      arr.sort(
        (a, b) => monthStrToDate(a.Last_Update) - monthStrToDate(b.Last_Update),
      );
      const latest = arr[arr.length - 1];
      const sumTickets = arr.reduce(
        (acc, r) => acc + numeric(r.Monthly_Ticket_Count),
        0,
      );
      out.push({
        MobileNumber: mobile,
        Latest_Month: latest?.Last_Update,
        Latest_Tier: latest?.Month_Tier,
        Latest_Monthly_Ticket_Count: numeric(latest?.Monthly_Ticket_Count),
        Total_Tickets_All_Months: sumTickets,
        Months: arr.length,
      });
    });
    // sort by latest month desc by default
    out.sort(
      (a, b) => monthStrToDate(b.Latest_Month) - monthStrToDate(a.Latest_Month),
    );
    return out;
  }, [filteredRows]);

  // export current filtered rows
  const handleDownloadData = () => {
    if (!filteredRows.length) return message.warning("No data to export.");
    const ws = XLSX.utils.json_to_sheet(filteredRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Loyalty History (Filtered)");
    const buff = XLSX.write(wb, { bookType: "csv", type: "array" });
    saveAs(new Blob([buff]), "LoyaltyHistory_Filtered.csv");
  };

  const deleteAll = async () => {
    const ok = window.confirm(
      "Delete all monthly-upgrade rows? This cannot be undone.",
    );
    if (!ok) return;
    try {
      setLoading(true);
      await axios.delete(
        `${API_BASE}/api/monthly-upgrade/delete-all?confirm=true`,
      );
      setRaw([]);
      message.success("All records deleted");
    } catch (e) {
      message.error("Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  // open modal with this customer's full history
  const openCustomerModal = (mobile) => {
    const history = raw
      .filter((r) => r.MobileNumber === mobile)
      .sort(
        (a, b) => monthStrToDate(a.Last_Update) - monthStrToDate(b.Last_Update),
      );
    if (!history.length) {
      message.warning("No history for this customer.");
      return;
    }
    setModalCustomer(mobile);
    setModalCustomerHistory(history);
    setModalOpen(true);
  };

  /** ----------- Columns for table views ----------- */

  const groupedColumns = [
    {
      title: "Mobile Number",
      dataIndex: "MobileNumber",
      key: "MobileNumber",
      fixed: "left",
      width: 180,
      sorter: (a, b) =>
        (a.MobileNumber || "").localeCompare(b.MobileNumber || ""),
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: "Latest Month",
      dataIndex: "Latest_Month",
      key: "Latest_Month",
      align: "center",
      width: 150,
      sorter: (a, b) =>
        monthStrToDate(a.Latest_Month) - monthStrToDate(b.Latest_Month),
      render: (v) => displayMonth(v),
    },
    {
      title: "Latest Tier",
      dataIndex: "Latest_Tier",
      key: "Latest_Tier",
      align: "center",
      width: 140,
      sorter: (a, b) =>
        (a.Latest_Tier || "").localeCompare(b.Latest_Tier || ""),
      render: (tier) => (
        <Tag color={tierColors[tier] || "default"} style={{ fontWeight: 500 }}>
          {tier || "-"}
        </Tag>
      ),
    },
    {
      title: "Latest Month Tickets",
      dataIndex: "Latest_Monthly_Ticket_Count",
      key: "Latest_Monthly_Ticket_Count",
      align: "center",
      width: 170,
      sorter: (a, b) =>
        numeric(a.Latest_Monthly_Ticket_Count) -
        numeric(b.Latest_Monthly_Ticket_Count),
      render: (v) => numeric(v).toLocaleString(),
    },
    {
      title: "Total Tickets (All Months)",
      dataIndex: "Total_Tickets_All_Months",
      key: "Total_Tickets_All_Months",
      align: "center",
      width: 210,
      sorter: (a, b) =>
        numeric(a.Total_Tickets_All_Months) -
        numeric(b.Total_Tickets_All_Months),
      render: (v) => <strong>{numeric(v).toLocaleString()}</strong>,
    },
    {
      title: "Months",
      dataIndex: "Months",
      key: "Months",
      align: "center",
      width: 100,
      sorter: (a, b) => numeric(a.Months) - numeric(b.Months),
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 110,
      align: "center",
      render: (_, row) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            openCustomerModal(row.MobileNumber);
          }}
        >
          View
        </Button>
      ),
    },
  ];

  const activeColumns = groupedColumns;
  const tableData = groupedByCustomer;

  return (
    <>
      <Spin spinning={loading} tip="Loading loyalty history...">
        <Row
          justify="space-between"
          align="middle"
          style={{ marginBottom: 16 }}
        >
          <Title level={3} style={{ margin: 0 }}>
            Loyalty History
          </Title>
        </Row>

        <Divider style={{ margin: "12px 0 18px" }} />

        {/* Summary Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 8 }}>
          {/* Loyalty Customers */}
          <Col xs={24} sm={12} md={4}>
            <Card>
              <Statistic
                title="Loyalty Customers"
                value={groupedByCustomer.length || 0}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>

          {/* Evaluation Flow */}
          <Col xs={24} sm={12} md={18}>
            <Card>
              {uniqueMonths && uniqueMonths.length ? (
                <Space wrap size="small">
                  {uniqueMonths.map((month, index) => (
                    <React.Fragment key={month}>
                      <Tag
                        color={
                          index === uniqueMonths.length - 1 ? "green" : "blue"
                        }
                        style={{ fontSize: 13, padding: "4px 10px" }}
                      >
                        {month}
                      </Tag>

                      {/* Arrow between tags */}
                      {index < uniqueMonths.length - 1 && (
                        <span style={{ color: "#999", fontWeight: "bold" }}>
                          →
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </Space>
              ) : (
                <Text type="secondary">No evaluation history</Text>
              )}
            </Card>
          </Col>
        </Row>

        {/* Tier Summary */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {["Platinum", "Gold", "Silver", "Blue", "Warning", "Rejected"].map(
            (tier) => {
              const count = summary?.tierCounts?.[tier] || 0;
              const isSelected = selectedTier === tier;

              return (
                <Col xs={24} sm={12} md={4} key={tier}>
                  <Tooltip title={`${tier}: ${count}`} placement="top">
                    <Card
                      hoverable
                      onClick={
                        () => setSelectedTier(isSelected ? null : tier) // toggle off if clicked again
                      }
                      style={{
                        borderRadius: 12,
                        textAlign: "center",
                        cursor: "pointer",
                        border: isSelected
                          ? `2px solid ${tierColors[tier]}`
                          : "1px solid #f0f0f0",
                        boxShadow: isSelected
                          ? `0 0 12px ${tierColors[tier]}40`
                          : "0 2px 8px rgba(0,0,0,0.05)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <Statistic
                        title={tier}
                        value={count}
                        prefix={tierIcons[tier] || <UserOutlined />}
                        valueStyle={{
                          color: tierColors[tier] || "#595959",
                          fontWeight: 600,
                        }}
                      />
                    </Card>
                  </Tooltip>
                </Col>
              );
            },
          )}
        </Row>

        {/* Controls */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={[12, 12]} align="middle">
            <Col xs={24} md={6}>
              <Search
                placeholder="Search by mobile, month, or tier"
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </Col>
            <Col xs={24} md={8}>
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                <Select
                  mode="multiple"
                  allowClear
                  value={selectedMonths}
                  onChange={setSelectedMonths}
                  style={{ width: "100%" }}
                  placeholder="Select month(s)"
                  maxTagCount="responsive"
                >
                  {monthOptions.map((m) => (
                    <Option key={m} value={m}>
                      {displayMonth(m)}
                    </Option>
                  ))}
                </Select>
              </Space>
            </Col>
            <Col xs={24} md={6}>
              <Space direction="vertical" size={4} style={{ width: "100%" }}>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  value={selectedCustomer}
                  onChange={setSelectedCustomer}
                  style={{ width: "100%" }}
                  placeholder="Pick a customer"
                >
                  {customerOptions.map((m) => (
                    <Option key={m} value={m}>
                      {m}
                    </Option>
                  ))}
                </Select>
              </Space>
            </Col>

            {tableData.length ? (
              <Table
                columns={activeColumns}
                dataSource={tableData}
                rowKey={(r) => r.MobileNumber}
                bordered
                size="middle"
                scroll={{ x: true, y: 480 }}
                pagination={{
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  showSizeChanger: true,
                  pageSizeOptions: ["5", "10", "25", "50", "100"],
                  showTotal: (total, range) =>
                    `Showing ${range[0]}-${
                      range[1]
                    } of ${total} ${"customers"}`,
                  onChange: (page, pageSize) =>
                    setPagination({ current: page, pageSize }),
                }}
                onRow={(record) => ({
                  onClick: () => {
                    const mobile = record.MobileNumber;

                    openCustomerModal(mobile);
                  },
                })}
              />
            ) : (
              <Empty
                style={{ marginTop: 40 }}
                description="No data for current filters"
              />
            )}
            <Table
              columns={columns}
              dataSource={buildTableRows(groupedHistory)}
              pagination={{ pageSize: 10 }}
              bordered
            />
          </Row>
        </Card>
        <Button
          type="primary"
          onClick={() => downloadMonthlyHistoryCSV(groupedHistory)}
        >
          Download CSV
        </Button>

        <div style={{ textAlign: "center", marginTop: 25 }}>
          <Button icon={<ReloadOutlined />} onClick={fetchHistory}>
            Refresh
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

      {/* Modal */}
      <CustomerLoyaltyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mobileNumber={modalCustomer}
        history={modalCustomerHistory}
        populationAverages={populationAverages}
        tierColors={tierColors}
        lotteryKeys={LOTTERY_KEYS}
      />
    </>
  );
}

export default LoyaltyHistory;
