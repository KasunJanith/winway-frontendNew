import React, { useEffect, useState } from "react";
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
  Button,
  Typography,
} from "antd";
import {
  TeamOutlined,
  TrophyOutlined,
  GiftOutlined,
  RiseOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

const { Search } = Input;
const { Title } = Typography;

function LoyalityCustomersSMS({
  customers,
  loading,
  summary,
  onRefresh,
}) {
  const [filtered, setFiltered] = useState([]);
  const [searchText, setSearchText] = useState("");

  // 🔄 Filter logic updated for nested structure
  useEffect(() => {
    if (!searchText) {
      setFiltered(customers);
    } else {
      const text = searchText.toLowerCase();
      setFiltered(
        customers.filter(
          (c) =>
            c.CustomerInfo?.FirstName?.toLowerCase().includes(text) ||
            c.CustomerInfo?.LastName?.toLowerCase().includes(text) ||
            c.MobileNumber?.includes(text)
        )
      );
    }
  }, [searchText, customers]);

  const columns = [
    {
      title: "Customer",
      render: (_, r) =>
        `${r.CustomerInfo?.FirstName || ""} ${r.CustomerInfo?.LastName || ""}`,
      sorter: (a, b) =>
        `${a.CustomerInfo?.FirstName || ""} ${a.CustomerInfo?.LastName || ""}`
          .localeCompare(
            `${b.CustomerInfo?.FirstName || ""} ${b.CustomerInfo?.LastName || ""}`
          ),
    },
    {
      title: "Mobile",
      dataIndex: "MobileNumber",
    },
    {
      title: "Total Tickets",
      align: "center",
      render: (_, r) =>
        r.CustomerInfo?.Current_Ticket_Count?.toLocaleString() || 0,
      sorter: (a, b) =>
        (a.CustomerInfo?.Current_Ticket_Count || 0) -
        (b.CustomerInfo?.Current_Ticket_Count || 0),
    },
    {
      title: "Tier",
      align: "center",
      render: (_, r) => {
        const tier = r.CustomerInfo?.Current_Loyalty_Tier || "None";
        const colorMap = {
          Platinum: "geekblue",
          Gold: "gold",
          Silver: "gray",
          Blue: "blue",
        };
        return (
          <Tag color={colorMap[tier] || "default"}>{tier}</Tag>
        );
      },
    },
  ];

  return (
    <Spin spinning={loading}>
      <Title level={3}>Loyalty Customers</Title>

      <Divider />

      {/* 🔢 Summary */}
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Platinum"
              value={summary.Platinum}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Gold"
              value={summary.Gold}
              prefix={<GiftOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Silver"
              value={summary.Silver}
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Blue"
              value={summary.Blue}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      <Search
        placeholder="Search by name or mobile"
        allowClear
        onChange={(e) => setSearchText(e.target.value)}
        style={{ width: 300, marginBottom: 16 }}
      />

      <Table
        columns={columns}
        dataSource={filtered}
        rowKey="MobileNumber"
        pagination={{ pageSize: 10 }}
        bordered
      />

      <Divider />

      <Button icon={<ReloadOutlined />} onClick={onRefresh}>
        Refresh
      </Button>
    </Spin>
  );
}

export default LoyalityCustomersSMS;
