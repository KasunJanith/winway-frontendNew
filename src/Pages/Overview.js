import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Card,
  Col,
  DatePicker,
  Empty,
  Progress,
  Row,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloudUploadOutlined,
  ExclamationCircleOutlined,
  ScissorOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import { getDashboardStats } from "./api/index";

const { Title, Text } = Typography;

const Overview = () => {
  const today = dayjs();

  const [selectedDate, setSelectedDate] = useState(today.format("YYYY-MM-DD"));
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedDate) return;

    loadStats(selectedDate);
  }, [selectedDate]);

  const loadStats = async (date) => {
    setLoading(true);
    setError("");

    try {
      const response = await getDashboardStats(date);
      setStats(response.data);
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date) => {
    if (!date) return;

    setSelectedDate(date.format("YYYY-MM-DD"));
  };

  const formatNumber = (value) => {
    return Number(value || 0).toLocaleString();
  };

  const agentAssignmentData = useMemo(() => {
    if (!stats?.agent_assignments) return [];

    return Object.entries(stats.agent_assignments).map(
      ([agent, count], index) => {
        const totalOrdered = Number(stats.total_tickets_ordered || 0);
        const numericCount = Number(count || 0);

        const percentage =
          totalOrdered > 0
            ? Math.min((numericCount / totalOrdered) * 100, 100)
            : 0;

        return {
          key: `${agent}-${index}`,
          agent,
          count: numericCount,
          percentage,
        };
      },
    );
  }, [stats]);

  const splitData = useMemo(() => {
    if (!stats?.splits_per_agent) return [];

    return Object.entries(stats.splits_per_agent).map(
      ([agent, data], index) => ({
        key: `${agent}-${index}`,
        agent,
        files: Number(data?.count || 0),
        records: Number(data?.total_records || 0),
      }),
    );
  }, [stats]);

  const recentActivityColumns = [
    {
      title: "Agent",
      dataIndex: "agent",
      key: "agent",
      render: (value) => (
        <Space>
          <Avatar
            size="small"
            icon={<UserOutlined />}
            style={{ backgroundColor: "#1677ff" }}
          />

          <Text strong>{value || "Unknown"}</Text>
        </Space>
      ),
    },
    {
      title: "Lottery",
      dataIndex: "lottery",
      key: "lottery",
      render: (value) => <Tag color="blue">{value || "-"}</Tag>,
    },
    {
      title: "Draw Number",
      dataIndex: "draw",
      key: "draw",
      align: "center",
      render: (value) => value || "-",
    },
    {
      title: "Records",
      dataIndex: "records",
      key: "records",
      align: "right",
      render: (value) => <Text strong>{formatNumber(value)}</Text>,
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (value) => (
        <Space size={5}>
          <ClockCircleOutlined style={{ color: "#8c8c8c" }} />
          <Text type="secondary">{value || "-"}</Text>
        </Space>
      ),
    },
  ];

  const mismatchColumns = [
    {
      title: "Lottery",
      dataIndex: "lottery",
      key: "lottery",
      render: (value) => <Text strong>{value}</Text>,
    },
    {
      title: "Ordered",
      dataIndex: "ordered",
      key: "ordered",
      align: "right",
      render: (value) => formatNumber(value),
    },
    {
      title: "Uploaded",
      dataIndex: "uploaded",
      key: "uploaded",
      align: "right",
      render: (value) => formatNumber(value),
    },
    {
      title: "Difference",
      key: "difference",
      align: "right",
      render: (_, record) => {
        const difference =
          Number(record.uploaded || 0) - Number(record.ordered || 0);

        return (
          <Tag color={difference === 0 ? "success" : "error"}>
            {difference > 0 ? `+${difference}` : difference}
          </Tag>
        );
      },
    },
  ];

  if (loading && !stats) {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          type="error"
          showIcon
          message="Dashboard Error"
          description={error}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
    <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              Overview Dashboard
            </Title>

            <Text type="secondary">
              Monitor orders, assignments, uploads and split activity.
            </Text>
          </Col>

          <Col>
            <Space wrap>
              <Text type="secondary">Viewing date:</Text>

              <DatePicker
                value={selectedDate ? dayjs(selectedDate) : null}
                onChange={handleDateChange}
                allowClear={false}
                format="DD MMM YYYY"
                style={{ width: 170 }}
              />
            </Space>
          </Col>
        </Row>

      {error && (
        <Alert
          type="warning"
          showIcon
          closable
          message={error}
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Summary cards */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} xl={6}>
          <DashboardStatisticCard
            title="Total Agents"
            value={stats?.total_agents}
            icon={<TeamOutlined />}
            iconBackground="#e6f4ff"
            iconColor="#1677ff"
            suffix="Agents"
            loading={loading}
          />
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <DashboardStatisticCard
            title="Tickets Ordered"
            value={stats?.total_tickets_ordered}
            icon={<UnorderedListOutlined />}
            iconBackground="#f6ffed"
            iconColor="#52c41a"
            loading={loading}
            footer={
              <Text type="secondary" style={{ fontSize: 12 }}>
                {stats?.total_lotteries_with_orders || 0} of 8 lotteries
              </Text>
            }
          />
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <DashboardStatisticCard
            title="Assigned to Agents"
            value={stats?.total_assigned}
            icon={<CheckCircleOutlined />}
            iconBackground={
              stats?.remaining_to_assign > 0 ? "#fff7e6" : "#f6ffed"
            }
            iconColor={stats?.remaining_to_assign > 0 ? "#fa8c16" : "#52c41a"}
            loading={loading}
            footer={
              stats?.remaining_to_assign > 0 ? (
                <Tag color="warning">
                  {formatNumber(stats.remaining_to_assign)} remaining
                </Tag>
              ) : (
                <Tag color="success">Fully assigned</Tag>
              )
            }
          />
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <DashboardStatisticCard
            title="Archive Upload"
            value={stats?.upload_exists ? "Completed" : "Pending"}
            icon={<CloudUploadOutlined />}
            iconBackground={stats?.upload_exists ? "#e6fffb" : "#f5f5f5"}
            iconColor={stats?.upload_exists ? "#13c2c2" : "#8c8c8c"}
            loading={loading}
            valueStyle={{
              color: stats?.upload_exists ? "#389e0d" : "#8c8c8c",
              fontSize: 24,
            }}
            footer={
              stats?.upload_exists ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {formatNumber(stats.total_uploaded_records)} uploaded records
                </Text>
              ) : (
                <Tag color="default">Waiting for upload</Tag>
              )
            }
          />
        </Col>
      </Row>

      {/* Split status and assignments */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} xl={12}>
          <Card
            title={
              <Space>
                <ScissorOutlined style={{ color: "#722ed1" }} />
                <span>Split Status</span>
              </Space>
            }
            extra={<Tag color="purple">{stats?.total_splits || 0} splits</Tag>}
            bordered={false}
            loading={loading}
            style={{
              height: "100%",
              borderRadius: 16,
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
            }}
          >
            {splitData.length > 0 ? (
              <div style={{ display: "grid", gap: 12 }}>
                {splitData.map((item) => (
                  <div
                    key={item.key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 16,
                      padding: "14px 16px",
                      background: "#fafafa",
                      border: "1px solid #f0f0f0",
                      borderRadius: 10,
                    }}
                  >
                    <Space>
                      <Avatar
                        icon={<UserOutlined />}
                        style={{ backgroundColor: "#722ed1" }}
                      />

                      <div>
                        <Text strong>{item.agent}</Text>

                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {formatNumber(item.records)} records
                          </Text>
                        </div>
                      </div>
                    </Space>

                    <Tag color="purple">{formatNumber(item.files)} files</Tag>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No splits available for this date"
              />
            )}
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={
              <Space>
                <TeamOutlined style={{ color: "#1677ff" }} />
                <span>Agent Assignments</span>
              </Space>
            }
            bordered={false}
            loading={loading}
            style={{
              height: "100%",
              borderRadius: 16,
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
            }}
          >
            {agentAssignmentData.length > 0 ? (
              <div style={{ display: "grid", gap: 20 }}>
                {agentAssignmentData.map((item) => (
                  <div key={item.key}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 7,
                      }}
                    >
                      <Space>
                        <Avatar
                          size="small"
                          icon={<UserOutlined />}
                          style={{ backgroundColor: "#1677ff" }}
                        />

                        <Text strong>{item.agent}</Text>
                      </Space>

                      <Text strong>{formatNumber(item.count)}</Text>
                    </div>

                    <Progress
                      percent={Number(item.percentage.toFixed(1))}
                      strokeColor="#1677ff"
                      trailColor="#e6f4ff"
                      showInfo
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No assignments available for this date"
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Mismatch warning */}
      {stats?.has_mismatches && stats?.mismatches?.length > 0 && (
        <Card
          bordered={false}
          style={{
            marginBottom: 24,
            borderRadius: 16,
            border: "1px solid #ffccc7",
            background: "#fff2f0",
          }}
        >
          <Alert
            type="error"
            showIcon
            icon={<ExclamationCircleOutlined />}
            message="Record Count Mismatches Found"
            description="Some uploaded record counts do not match the ordered ticket quantities. Please verify the order entry and upload the correct archive."
            style={{
              marginBottom: 16,
              background: "transparent",
              border: "none",
              padding: 0,
            }}
          />

          <Table
            rowKey={(record, index) =>
              `${record.lottery || "lottery"}-${index}`
            }
            columns={mismatchColumns}
            dataSource={stats.mismatches}
            pagination={false}
            size="middle"
            scroll={{ x: 600 }}
          />
        </Card>
      )}

      {/* Recent activity */}
      <Card
        title="Recent Split Activity"
        extra={<Tag color="blue">All dates</Tag>}
        bordered={false}
        loading={loading}
        style={{
          borderRadius: 16,
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
        }}
      >
        <Table
          rowKey={(record, index) =>
            `${record.agent || "agent"}-${record.draw || "draw"}-${index}`
          }
          columns={recentActivityColumns}
          dataSource={stats?.recent_activity || []}
          pagination={{
            pageSize: 8,
            hideOnSinglePage: true,
            showSizeChanger: false,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No split activity available"
              />
            ),
          }}
          scroll={{ x: 750 }}
        />
      </Card>
    </div>
  );
};

const DashboardStatisticCard = ({
  title,
  value,
  icon,
  iconBackground,
  iconColor,
  suffix,
  footer,
  loading,
  valueStyle,
}) => {
  return (
    <Card
      bordered={false}
      loading={loading}
      style={{
        height: "100%",
        borderRadius: 16,
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
      }}
      styles={{
        body: {
          padding: 20,
        },
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 15,
        }}
      >
        <Avatar
          size={52}
          icon={icon}
          style={{
            flexShrink: 0,
            background: iconBackground,
            color: iconColor,
            fontSize: 24,
          }}
        />

        <div style={{ minWidth: 0, flex: 1 }}>
          <Statistic
            title={title}
            value={value ?? 0}
            suffix={suffix}
            valueStyle={{
              fontSize: 27,
              fontWeight: 700,
              color: "#1f1f1f",
              ...valueStyle,
            }}
            formatter={(currentValue) => {
              if (typeof currentValue === "number") {
                return currentValue.toLocaleString();
              }

              return currentValue;
            }}
          />

          {footer && <div style={{ marginTop: 8 }}>{footer}</div>}
        </div>
      </div>
    </Card>
  );
};

export default Overview;
