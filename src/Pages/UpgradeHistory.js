import React, { useEffect, useState, useMemo } from "react";
import {
  Table,
  Card,
  Row,
  Col,
  Typography,
  Input,
  Spin,
  Statistic,
  Tag,
  Divider,
  Select,
  DatePicker,
  Modal,
} from "antd";
import {
  TrophyOutlined,
  GiftOutlined,
  RiseOutlined,
  TeamOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { Pie, Column } from "@ant-design/plots";

import { ENV } from "../config/env";
const API_BASE = ENV.API_BASE_LOCAL;

const { Title, Text } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;


function UpgradeHistory() {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchText, setSearchText] = useState("");

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Filters
  const [tierFilter, setTierFilter] = useState("");
  const [dateRange, setDateRange] = useState([]);
  const [ticketMin, setTicketMin] = useState(null);
  const [ticketMax, setTicketMax] = useState(null);

  const tierColors = {
    Platinum: "#9B5DE5",
    Gold: "#E6B800",
    Silver: "#C0C0C0",
    Blue: "#2563EB",
  };

  const tierIcons = {
    Platinum: <TrophyOutlined />,
    Gold: <GiftOutlined />,
    Silver: <RiseOutlined />,
    Blue: <RiseOutlined />,
  };

  // Fetch combined upgrade history
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/all-customers`);
      setRecords(res.data.data || []);
      setFiltered(res.data.data || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // Apply Filters
  useEffect(() => {
    let data = [...records];

    if (searchText) {
      const lower = searchText.toLowerCase();
      data = data.filter(
        (r) =>
          r.MobileNumber.toLowerCase().includes(lower) ||
          (r.Summary?.totalTickets + "").includes(lower)
      );
    }

    if (tierFilter)
      data = data.filter((r) => {
        const lastTier =
          r.Daily[r.Daily.length - 1]?.Month_Tier ||
          r.Monthly[r.Monthly.length - 1]?.Month_Tier;
        return lastTier === tierFilter;
      });

    if (dateRange.length === 2) {
      const [start, end] = dateRange;
      data = data.filter((r) => {
        const d = new Date(r.Summary?.lastDate);
        return d >= start.$d && d <= end.$d;
      });
    }

    if (ticketMin !== null)
      data = data.filter((r) => r.Summary.totalTickets >= ticketMin);

    if (ticketMax !== null)
      data = data.filter((r) => r.Summary.totalTickets <= ticketMax);

    setFiltered(data);
  }, [searchText, tierFilter, ticketMin, ticketMax, dateRange, records]);

  // Table Columns
  const columns = [
    {
      title: "Mobile Number",
      dataIndex: "MobileNumber",
      width: 140,
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: "First Date",
      dataIndex: ["Summary", "firstDate"],
      width: 120,
    },
    {
      title: "Last Date",
      dataIndex: ["Summary", "lastDate"],
      width: 120,
    },
    {
      title: "Total Tickets",
      align: "center",
      width: 140,
      render: (row) => row.Summary?.totalTickets?.toLocaleString(),
      sorter: (a, b) =>
        a.Summary.totalTickets - b.Summary.totalTickets,
    },
    {
      title: "Daily Ranges",
      align: "center",
      width: 120,
      render: (row) => row.Summary?.totalDailyDays || 0,
    },
    {
      title: "Monthly Summaries",
      align: "center",
      width: 140,
      render: (row) => row.Summary?.totalMonthlySummaries || 0,
    },
    {
      title: "Tier (Latest)",
      width: 140,
      align: "center",
      render: (row) => {
        const lastDaily = row.Daily[row.Daily.length - 1];
        const lastMonthly = row.Monthly[row.Monthly.length - 1];
        const tier = lastDaily?.Month_Tier || lastMonthly?.Month_Tier || "-";
        return (
          <Tag
            color={tierColors[tier] || "default"}
            icon={tierIcons[tier]}
            style={{ fontWeight: 600 }}
          >
            {tier}
          </Tag>
        );
      },
    },
  ];

  // Modal Content
  const renderModalContent = () => {
    if (!selectedCustomer) return null;

    const d = selectedCustomer.Daily;
    const m = selectedCustomer.Monthly;

    return (
      <div>
        <Title level={4}>Upgrade Summary</Title>

        <p>
          <b>Mobile:</b> {selectedCustomer.MobileNumber}
        </p>

        <p>
          <b>Latest Tier:</b>{" "}
          {selectedCustomer.Summary?.lastTier || "-"}
        </p>

        <Divider />

        <Title level={5}>Daily Breakdown</Title>
        <Table
          size="small"
          bordered
          pagination={false}
          dataSource={d}
          rowKey={(r) => r.From_Date + r.To_Date}
          columns={[
            { title: "From", dataIndex: "From_Date" },
            { title: "To", dataIndex: "To_Date" },
            { title: "Tickets", dataIndex: "Ticket_Count" },
            { title: "Tier", dataIndex: "Month_Tier" },
          ]}
        />

        <Divider />

        <Title level={5}>Monthly Summary</Title>
        <Table
          size="small"
          bordered
          pagination={false}
          dataSource={m}
          rowKey={(r) => r.Last_Update}
          columns={[
            { title: "Month", dataIndex: "Last_Update" },
            { title: "Tickets", dataIndex: "Monthly_Ticket_Count" },
            { title: "Tier", dataIndex: "Month_Tier" },
          ]}
        />
      </div>
    );
  };

  // Charts
  const tierData = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      const lastDaily = r.Daily[r.Daily.length - 1];
      const lastMonthly = r.Monthly[r.Monthly.length - 1];
      const tier =
        lastDaily?.Month_Tier || lastMonthly?.Month_Tier || "Unknown";
      map[tier] = (map[tier] || 0) + 1;
    });

    return Object.entries(map).map(([tier, count]) => ({
      type: tier,
      value: count,
    }));
  }, [records]);

  const ticketData = filtered.map((r) => ({
    name: r.MobileNumber,
    tickets: r.Summary.totalTickets,
  }));

  useEffect(() => {
    loadData();
  }, []);

  return (
    <>
      <Spin spinning={loading} tip="Loading upgrade history...">
        <Title level={3}>Customer Upgrade History</Title>
        <Divider />

        {/* SUMMARY CARDS */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Customers"
                value={records.length}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Tickets"
                value={records.reduce((a, c) => a + c.Summary.totalTickets, 0)}
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Daily Entries"
                value={records.reduce((a, c) => a + c.Daily.length, 0)}
                prefix={<RiseOutlined />}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Monthly Summaries"
                value={records.reduce((a, c) => a + c.Monthly.length, 0)}
                prefix={<RiseOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* FILTER BAR */}
        <Row gutter={[16, 16]} style={{ marginBottom: 25 }}>
          <Col xs={24} md={6}>
            <Search
              placeholder="Search mobile or ticket count"
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>

          <Col xs={24} md={4}>
            <Select
              placeholder="Filter by Tier"
              allowClear
              style={{ width: "100%" }}
              value={tierFilter}
              onChange={setTierFilter}
            >
              <Option value="Platinum">Platinum</Option>
              <Option value="Gold">Gold</Option>
              <Option value="Silver">Silver</Option>
              <Option value="Blue">Blue</Option>
            </Select>
          </Col>

          <Col xs={24} md={8}>
            <RangePicker onChange={setDateRange} style={{ width: "100%" }} />
          </Col>

          <Col xs={12} md={3}>
            <Input
              type="number"
              placeholder="Min Tickets"
              onChange={(e) => setTicketMin(Number(e.target.value))}
            />
          </Col>

          <Col xs={12} md={3}>
            <Input
              type="number"
              placeholder="Max Tickets"
              onChange={(e) => setTicketMax(Number(e.target.value))}
            />
          </Col>
        </Row>

        {/* CHARTS SECTION
        <Divider orientation="left">Tier Distribution</Divider>
        <Row>
          <Col span={12}>
            <Pie
              data={tierData}
              angleField="value"
              colorField="type"
              radius={0.8}
              label={{
                offset: "-30%",
                style: {
                  fontSize: 12,
                  textAlign: "center",
                },
              }}
              interactions={[{ type: "element-active" }]}
            />
          </Col>

          <Col span={12}>
            <Column
              data={ticketData}
              xField="name"
              yField="tickets"
              label={{
                position: "top",
                style: {
                  fill: "#000",
                  opacity: 0.8,
                },
              }}
              xAxis={{
                label: {
                  autoHide: true,
                  autoRotate: true,
                },
              }}
              color="#3366ff"
            />
          </Col>
        </Row> */}

        <Divider orientation="left">Customer Upgrade Table</Divider>

        {/* TABLE WITH CLICK → MODAL */}
        <Table
          columns={columns}
          dataSource={filtered}
          bordered
          rowKey={(r) => r.MobileNumber}
          pagination={{ pageSize: 20 }}
          onRow={(record) => ({
            onClick: () => {
              setSelectedCustomer(record);
              setModalVisible(true);
            },
          })}
          style={{ cursor: "pointer" }}
        />

        {/* MODAL WITH FULL DETAILS */}
        <Modal
          open={modalVisible}
          footer={null}
          centered
          width={900}
          onCancel={() => setModalVisible(false)}
          title={`Customer Details — ${selectedCustomer?.MobileNumber || ""}`}
        >
          {renderModalContent()}
        </Modal>
      </Spin>
    </>
  );
}

export default UpgradeHistory;
