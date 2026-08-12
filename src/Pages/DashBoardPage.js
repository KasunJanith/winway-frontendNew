import React, { useEffect, useMemo, useState } from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Spin,
  Typography,
  Progress,
  Table,
  Tag,
  Divider,
  Button,
  message,
} from "antd";
import {
  TeamOutlined,
  UserAddOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  WarningOutlined,
  TrophyOutlined,
  ReloadOutlined,
  StopOutlined,
  CrownOutlined,
  GiftOutlined,
} from "@ant-design/icons";

import { getCombinedCustomers, getMonthlyUpgrades } from "../api/endPoints";

const { Title, Text } = Typography;

const tierColors = {
  Platinum: "#722ed1",
  Gold: "#d4b106",
  Silver: "#8c8c8c",
  Blue: "#1677ff",
  Warning: "#fa8c16",
  Removed: "#cf1322",
  "Removed Done": "#8f0000",
};

function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [monthlyHistory, setMonthlyHistory] = useState([]);

  const [stats, setStats] = useState({
    totalCustomers: 0,
    newCustomers: 0,
    upgrades: 0,
    same: 0,
    downgrades: 0,
    removed: 0,
    blue: 0,
    silver: 0,
    gold: 0,
    platinum: 0,
    warning: 0,
    totalTickets: 0,
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const [customerRes, monthlyRes] = await Promise.all([
        getCombinedCustomers(),
        getMonthlyUpgrades(),
      ]);

      const data = customerRes?.data?.data || [];
      const history = monthlyRes?.data?.data || [];

      setCustomers(data);
      setMonthlyHistory(history);

      const summary = {
        totalCustomers: data.length,
        newCustomers: 0,
        upgrades: 0,
        same: 0,
        downgrades: 0,
        removed: 0,
        blue: 0,
        silver: 0,
        gold: 0,
        platinum: 0,
        warning: 0,
        totalTickets: 0,
      };

      data.forEach((c) => {
        const tier = c.CustomerInfo?.Current_Loyalty_Tier;
        const status = c.CustomerInfo?.Evaluation_Status;
        const tickets = Number(c.CustomerInfo?.Current_Ticket_Count || 0);

        summary.totalTickets += tickets;

        if (status === "Initial Load") summary.newCustomers++;
        if (status === "Upgraded") summary.upgrades++;
        if (status === "Same") summary.same++;
        if (status === "Down") summary.downgrades++;

        if (tier === "Removed" || tier === "Removed Done") summary.removed++;
        if (tier === "Blue") summary.blue++;
        if (tier === "Silver") summary.silver++;
        if (tier === "Gold") summary.gold++;
        if (tier === "Platinum") summary.platinum++;
        if (tier === "Warning") summary.warning++;
      });

      setStats(summary);
    } catch (err) {
     message.error("Failed to load loyalty dashboard");
      
    } finally {
      setLoading(false);
    }
  };

  const retentionRate =
    stats.totalCustomers > 0
      ? Number(
          (
            ((stats.totalCustomers - stats.removed) / stats.totalCustomers) *
            100
          ).toFixed(1),
        )
      : 0;

  const healthScore =
    stats.totalCustomers > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Number(
              (
                ((stats.upgrades * 2 +
                  stats.same +
                  stats.newCustomers -
                  stats.downgrades -
                  stats.removed) /
                  stats.totalCustomers) *
                100
              ).toFixed(0),
            ),
          ),
        )
      : 0;

  const tierTicketContribution = useMemo(() => {
    const result = {
      Blue: 0,
      Silver: 0,
      Gold: 0,
      Platinum: 0,
      Warning: 0,
      Removed: 0,
      "Removed Done": 0,
    };

    customers.forEach((c) => {
      const tier = c.CustomerInfo?.Current_Loyalty_Tier;
      const tickets = Number(c.CustomerInfo?.Current_Ticket_Count || 0);

      if (result[tier] !== undefined) {
        result[tier] += tickets;
      }
    });

    return result;
  }, [customers]);

  const topCustomers = useMemo(() => {
    return [...customers]
      .sort(
        (a, b) =>
          Number(b.CustomerInfo?.Current_Ticket_Count || 0) -
          Number(a.CustomerInfo?.Current_Ticket_Count || 0),
      )
      .slice(0, 10);
  }, [customers]);

  const atRiskCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.CustomerInfo?.Current_Loyalty_Tier === "Warning" ||
        c.CustomerInfo?.Evaluation_Status === "Down",
    );
  }, [customers]);

  const monthlySummary = useMemo(() => {
    const grouped = {};

    monthlyHistory.forEach((item) => {
      const month = item.Last_Update || "Unknown";
      const tier = item.Month_Tier || "-";

      if (!grouped[month]) {
        grouped[month] = {
          month,
          Blue: 0,
          Silver: 0,
          Gold: 0,
          Platinum: 0,
          Warning: 0,
          Removed: 0,
        };
      }

      if (grouped[month][tier] !== undefined) {
        grouped[month][tier]++;
      }
    });

    return Object.values(grouped);
  }, [monthlyHistory]);

  const vipColumns = [
    {
      title: "#",
      width: 50,
      render: (_, __, index) => index + 1,
    },
    {
      title: "Customer",
      render: (_, record) =>
        `${record.CustomerInfo?.FirstName || ""} ${record.CustomerInfo?.LastName || ""}`,
    },
    {
      title: "Mobile",
      dataIndex: "MobileNumber",
      render: (value) => (value?.startsWith("+") ? value.substring(1) : value),
    },
    {
      title: "Tier",
      render: (_, record) => {
        const tier = record.CustomerInfo?.Current_Loyalty_Tier || "-";

        return <Tag color={tierColors[tier] || "default"}>{tier}</Tag>;
      },
    },
    {
      title: "Tickets",
      align: "right",
      render: (_, record) =>
        Number(record.CustomerInfo?.Current_Ticket_Count || 0).toLocaleString(),
    },
  ];

  const monthlyColumns = [
    {
      title: "Month",
      dataIndex: "month",
      fixed: "left",
    },
    {
      title: "Platinum",
      dataIndex: "Platinum",
      align: "center",
    },
    {
      title: "Gold",
      dataIndex: "Gold",
      align: "center",
    },
    {
      title: "Silver",
      dataIndex: "Silver",
      align: "center",
    },

    {
      title: "Blue",
      dataIndex: "Blue",
      align: "center",
    },
    {
      title: "Warning",
      dataIndex: "Warning",
      align: "center",
    },
    {
      title: "Removed",
      dataIndex: "Removed",
      align: "center",
    },
  ];

  const KpiCard = ({ title, value, icon, color, suffix }) => (
    <Card
      hoverable
      style={{
        borderRadius: 16,
        boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
        border: "1px solid #f0f0f0",
      }}
    >
      <Statistic
        title={<Text strong>{title}</Text>}
        value={value}
        suffix={suffix}
        prefix={icon}
        valueStyle={{
          color,
          fontWeight: 800,
        }}
      />
    </Card>
  );

  return (
    <Spin spinning={loading} tip="Loading loyalty dashboard...">
      <div style={{ paddingBottom: 30 }}>
        <Row
          justify="space-between"
          align="middle"
          style={{ marginBottom: 20 }}
        >
          <Col>
            <Title level={2} style={{ marginBottom: 0 }}>
              Loyalty Dashboard
            </Title>
            <Text type="secondary">
              Overview of loyalty members, tier movement, retention, and ticket
              contribution.
            </Text>
          </Col>

          <Col>
            <Button icon={<ReloadOutlined />} onClick={loadDashboard}>
              Refresh
            </Button>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8} lg={4}>
            <KpiCard
              title="Total Members"
              value={stats.totalCustomers}
              icon={<TeamOutlined />}
              color="#1677ff"
            />
          </Col>

          <Col xs={24} sm={12} md={8} lg={4}>
            <KpiCard
              title="New Members"
              value={stats.newCustomers}
              icon={<UserAddOutlined />}
              color="#16a34a"
            />
          </Col>
          {localStorage.getItem("tempToken")}
          <Col xs={24} sm={12} md={8} lg={4}>
            <KpiCard
              title="Upgrades"
              value={stats.upgrades}
              icon={<ArrowUpOutlined />}
              color="#1677ff"
            />
          </Col>

          <Col xs={24} sm={12} md={8} lg={4}>
            <KpiCard
              title="Downgrades"
              value={stats.downgrades}
              icon={<ArrowDownOutlined />}
              color="#d4380d"
            />
          </Col>

          <Col xs={24} sm={12} md={8} lg={4}>
            <KpiCard
              title="Removed"
              value={stats.removed}
              icon={<StopOutlined />}
              color="#cf1322"
            />
          </Col>

          <Col xs={24} sm={12} md={8} lg={4}>
            <KpiCard
              title="Retention"
              value={retentionRate}
              suffix="%"
              icon={<TrophyOutlined />}
              color="#52c41a"
            />
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
          <Col xs={24} lg={12}>
            <Card
              title="Tier Distribution"
              style={{ borderRadius: 16, height: "100%" }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={12}>
                  <Statistic
                    title="Blue"
                    value={stats.blue}
                    valueStyle={{ color: "#1677ff" }}
                  />
                </Col>
                <Col xs={12}>
                  <Statistic
                    title="Silver"
                    value={stats.silver}
                    valueStyle={{ color: "#8c8c8c" }}
                  />
                </Col>
                <Col xs={12}>
                  <Statistic
                    title="Gold"
                    value={stats.gold}
                    valueStyle={{ color: "#d4b106" }}
                  />
                </Col>
                <Col xs={12}>
                  <Statistic
                    title="Platinum"
                    value={stats.platinum}
                    valueStyle={{ color: "#722ed1" }}
                  />
                </Col>
              </Row>

              <Divider />

              <Text strong>Visual Tier Share</Text>

              <div style={{ marginTop: 16 }}>
                <Progress
                  percent={
                    stats.totalCustomers
                      ? Math.round((stats.blue / stats.totalCustomers) * 100)
                      : 0
                  }
                  strokeColor="#1677ff"
                  format={() => `Blue ${stats.blue}`}
                />
                <Progress
                  percent={
                    stats.totalCustomers
                      ? Math.round((stats.silver / stats.totalCustomers) * 100)
                      : 0
                  }
                  strokeColor="#8c8c8c"
                  format={() => `Silver ${stats.silver}`}
                />
                <Progress
                  percent={
                    stats.totalCustomers
                      ? Math.round((stats.gold / stats.totalCustomers) * 100)
                      : 0
                  }
                  strokeColor="#d4b106"
                  format={() => `Gold ${stats.gold}`}
                />
                <Progress
                  percent={
                    stats.totalCustomers
                      ? Math.round(
                          (stats.platinum / stats.totalCustomers) * 100,
                        )
                      : 0
                  }
                  strokeColor="#722ed1"
                  format={() => `Platinum ${stats.platinum}`}
                />
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title="Program Health"
              style={{ borderRadius: 16, height: "100%" }}
            >
              <Text strong>Loyalty Health Score</Text>
              <Progress
                percent={healthScore}
                status={
                  healthScore >= 80
                    ? "success"
                    : healthScore >= 60
                      ? "active"
                      : "exception"
                }
                strokeWidth={12}
              />

              <Divider />

              <Text strong>Retention Rate</Text>
              <Progress
                percent={retentionRate}
                strokeColor="#52c41a"
                strokeWidth={12}
              />

              <Divider />

              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="At Risk Customers"
                    value={atRiskCustomers.length}
                    prefix={<WarningOutlined />}
                    valueStyle={{ color: "#fa8c16", fontWeight: 700 }}
                  />
                </Col>

                <Col span={12}>
                  <Statistic
                    title="Total Tickets"
                    value={stats.totalTickets}
                    prefix={<GiftOutlined />}
                    valueStyle={{ color: "#722ed1", fontWeight: 700 }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
          <Col xs={24}>
            <Card title="Loyalty Funnel" style={{ borderRadius: 16 }}>
              <div style={{ maxWidth: 760, margin: "auto" }}>
                <Progress
                  percent={100}
                  strokeColor="#1677ff"
                  format={() => `Blue Members (${stats.blue})`}
                />

                <Progress
                  percent={
                    stats.blue
                      ? Math.round((stats.silver / stats.blue) * 100)
                      : 0
                  }
                  strokeColor="#8c8c8c"
                  format={() => `Silver Members (${stats.silver})`}
                />

                <Progress
                  percent={
                    stats.silver
                      ? Math.round((stats.gold / stats.silver) * 100)
                      : 0
                  }
                  strokeColor="#d4b106"
                  format={() => `Gold Members (${stats.gold})`}
                />

                <Progress
                  percent={
                    stats.gold
                      ? Math.round((stats.platinum / stats.gold) * 100)
                      : 0
                  }
                  strokeColor="#722ed1"
                  format={() => `Platinum Members (${stats.platinum})`}
                />
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
          <Col xs={24} lg={12}>
            <Card title="Top 10 VIP Customers" style={{ borderRadius: 16 }}>
              <Table
                rowKey="MobileNumber"
                columns={vipColumns}
                dataSource={topCustomers}
                pagination={false}
                size="small"
              />
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title="Ticket Contribution by Tier"
              style={{ borderRadius: 16 }}
            >
              {Object.entries(tierTicketContribution).map(([tier, value]) => (
                <div key={tier} style={{ marginBottom: 14 }}>
                  <Row justify="space-between">
                    <Col>
                      <Text strong>
                        <CrownOutlined style={{ color: tierColors[tier] }} />{" "}
                        {tier}
                      </Text>
                    </Col>
                    <Col>
                      <Text strong>
                        {Number(value).toLocaleString()} tickets
                      </Text>
                    </Col>
                  </Row>

                  <Progress
                    percent={
                      stats.totalTickets
                        ? Math.round((value / stats.totalTickets) * 100)
                        : 0
                    }
                    strokeColor={tierColors[tier] || "#1677ff"}
                  />
                </div>
              ))}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
          <Col xs={24}>
            <Card title="Monthly Tier History" style={{ borderRadius: 16 }}>
              <Table
                rowKey="month"
                columns={monthlyColumns}
                dataSource={monthlySummary}
                size="small"
                pagination={{ pageSize: 6 }}
                scroll={{ x: true }}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </Spin>
  );
}

export default DashboardPage;
