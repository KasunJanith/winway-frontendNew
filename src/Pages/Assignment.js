
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Empty,
  InputNumber,
  message,
  Modal,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  SaveOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  getAssignments,
  saveAssignments,
  getLatestOrderDate,
} from "./api/index";

const { Title, Text } = Typography;

const LOTTERY_ORDER = [
  "ada",
  "dana",
  "govi",
  "hada",
  "maha",
  "mgap",
  "jaya",
  "suba",
];

const Assignment = () => {
  const [date, setDate] = useState("");
  const [data, setData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();

  useEffect(() => {
    loadLatestDate();
  }, []);

  const loadLatestDate = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getLatestOrderDate();
      const latestDate = response.data?.date;

      if (latestDate) {
        setDate(latestDate);
        await loadData(latestDate);
      } else {
        const today = dayjs().format("YYYY-MM-DD");

        setDate(today);
        await loadData(today);
      }
    } catch (err) {
      console.error("Failed to load latest assignment date:", err);

      const today = dayjs().format("YYYY-MM-DD");

      setDate(today);
      await loadData(today);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async (selectedDate) => {
    if (!selectedDate) return;

    setLoading(true);
    setError("");

    try {
      const response = await getAssignments(selectedDate);

      const assignmentData = Array.isArray(response.data)
        ? response.data
        : [];

      const sortedData = [...assignmentData].sort((a, b) => {
        const codeA = String(a.lottery_code || "").toLowerCase();
        const codeB = String(b.lottery_code || "").toLowerCase();

        const indexA = LOTTERY_ORDER.indexOf(codeA);
        const indexB = LOTTERY_ORDER.indexOf(codeB);

        const safeIndexA =
          indexA === -1 ? LOTTERY_ORDER.length : indexA;

        const safeIndexB =
          indexB === -1 ? LOTTERY_ORDER.length : indexB;

        return safeIndexA - safeIndexB;
      });

      const normalizedData = sortedData.map((item) => ({
        ...item,
        available_quantity: Number(item.available_quantity || 0),
        assignRemaining: Boolean(item.assignRemaining),
        agent_counts: {
          JAYAWAY: Number(item.agent_counts?.JAYAWAY || 0),
          WINWAY: Number(item.agent_counts?.WINWAY || 0),
        },
      }));

      setData(normalizedData);
    } catch (err) {
      console.error("Failed to load assignments:", err);

      setData([]);
      setError("Failed to load assignments for the selected date.");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = async (selectedDay) => {
    if (!selectedDay) return;

    const formattedDate = selectedDay.format("YYYY-MM-DD");

    setDate(formattedDate);
    await loadData(formattedDate);
  };

  const handleCountChange = (lotteryCode, agent, value) => {
    const count = Math.max(Number(value || 0), 0);

    setData((previousData) =>
      previousData.map((item) => {
        if (item.lottery_code !== lotteryCode) {
          return item;
        }

        const updatedAgentCounts = {
          ...item.agent_counts,
          [agent]: count,
        };

        if (agent === "JAYAWAY" && item.assignRemaining) {
          const availableQuantity = Number(
            item.available_quantity || 0,
          );

          const winwayRemaining = Math.max(
            availableQuantity - count,
            0,
          );

          updatedAgentCounts.WINWAY = winwayRemaining;
        }

        return {
          ...item,
          agent_counts: updatedAgentCounts,
        };
      }),
    );
  };

  const handleAssignRemainingToggle = (lotteryCode, checked) => {
    setData((previousData) =>
      previousData.map((item) => {
        if (item.lottery_code !== lotteryCode) {
          return item;
        }

        const jayaCount = Number(
          item.agent_counts?.JAYAWAY || 0,
        );

        const currentWinwayCount = Number(
          item.agent_counts?.WINWAY || 0,
        );

        const availableQuantity = Number(
          item.available_quantity || 0,
        );

        const remainingAfterJaya = Math.max(
          availableQuantity - jayaCount,
          0,
        );

        return {
          ...item,
          assignRemaining: checked,
          agent_counts: {
            ...item.agent_counts,
            WINWAY: checked
              ? remainingAfterJaya
              : currentWinwayCount,
          },
        };
      }),
    );
  };

  const totalAvailable = useMemo(() => {
    return data.reduce(
      (total, item) =>
        total + Number(item.available_quantity || 0),
      0,
    );
  }, [data]);

  const totalJayaway = useMemo(() => {
    return data.reduce(
      (total, item) =>
        total + Number(item.agent_counts?.JAYAWAY || 0),
      0,
    );
  }, [data]);

  const totalWinway = useMemo(() => {
    return data.reduce(
      (total, item) =>
        total + Number(item.agent_counts?.WINWAY || 0),
      0,
    );
  }, [data]);

  const totalAssigned = totalJayaway + totalWinway;

  const totalRemaining = totalAvailable - totalAssigned;

  const assignmentPercentage =
    totalAvailable > 0
      ? Math.min((totalAssigned / totalAvailable) * 100, 100)
      : 0;

  const invalidRows = useMemo(() => {
    return data.filter((item) => {
      const available = Number(item.available_quantity || 0);
      const jayaway = Number(item.agent_counts?.JAYAWAY || 0);
      const winway = Number(item.agent_counts?.WINWAY || 0);

      return jayaway + winway > available;
    });
  }, [data]);

  const validateAssignments = () => {
    if (!date) {
      messageApi.warning("Please select an assignment date.");
      return false;
    }

    if (!data.length) {
      messageApi.warning("There are no assignments to save.");
      return false;
    }

    const hasInvalidCount = data.some((item) => {
      const jayaway = Number(item.agent_counts?.JAYAWAY || 0);
      const winway = Number(item.agent_counts?.WINWAY || 0);

      return (
        Number.isNaN(jayaway) ||
        Number.isNaN(winway) ||
        jayaway < 0 ||
        winway < 0
      );
    });

    if (hasInvalidCount) {
      messageApi.warning(
        "Assignment quantities must be zero or greater.",
      );

      return false;
    }

    if (invalidRows.length > 0) {
      messageApi.error(
        `${invalidRows.length} lottery assignment${
          invalidRows.length === 1 ? "" : "s"
        } exceed the available quantity.`,
      );

      return false;
    }

    return true;
  };

  const saveAssignmentData = async () => {
    setSaving(true);

    const assignments = [];

    data.forEach((item) => {
      Object.entries(item.agent_counts || {}).forEach(
        ([agentName, count]) => {
          assignments.push({
            lottery_code: item.lottery_code,
            agent_name: agentName,
            count: Number(count || 0),
          });
        },
      );
    });

    const payload = {
      assignment_date: date,
      assignments,
    };

    try {
      await saveAssignments(payload);

      messageApi.success({
        content: "Assignments saved successfully.",
        icon: (
          <CheckCircleOutlined
            style={{ color: "#52c41a" }}
          />
        ),
      });

      await loadData(date);
    } catch (err) {
      console.error("Failed to save assignments:", err);

      messageApi.error(
        "Failed to save assignments. Please try again.",
      );

      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    const isValid = validateAssignments();

    if (!isValid) return;

    modalApi.confirm({
      title: "Confirm agent assignments?",
      icon: <SaveOutlined style={{ color: "#1677ff" }} />,
      centered: true,
      width: 500,
      content: (
        <div style={{ marginTop: 16 }}>
          <p style={{ marginBottom: 8 }}>
            Assignment date:{" "}
            <strong>
              {dayjs(date).format("DD MMMM YYYY")}
            </strong>
          </p>

          <p style={{ marginBottom: 8 }}>
            Available quantity:{" "}
            <strong>{totalAvailable.toLocaleString()}</strong>
          </p>

          <p style={{ marginBottom: 8 }}>
            JAYAWAY assigned:{" "}
            <strong>{totalJayaway.toLocaleString()}</strong>
          </p>

          <p style={{ marginBottom: 8 }}>
            WINWAY assigned:{" "}
            <strong>{totalWinway.toLocaleString()}</strong>
          </p>

          <p style={{ marginBottom: 0 }}>
            Remaining quantity:{" "}
            <strong
              style={{
                color:
                  totalRemaining < 0
                    ? "#ff4d4f"
                    : totalRemaining > 0
                      ? "#fa8c16"
                      : "#52c41a",
              }}
            >
              {totalRemaining.toLocaleString()}
            </strong>
          </p>
        </div>
      ),
      okText: "Confirm Assignments",
      cancelText: "Cancel",
      onOk: async () => {
        await saveAssignmentData();
      },
    });
  };

  const columns = [
    {
      title: "#",
      key: "index",
      width: 65,
      align: "center",
      render: (_, __, index) => (
        <Text type="secondary">{index + 1}</Text>
      ),
    },
    {
      title: "Ticket",
      dataIndex: "lottery_name",
      key: "lottery_name",
      width: 240,
      render: (value, record) => (
        <Space>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#e6f4ff",
              color: "#1677ff",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {String(record.lottery_code || "").slice(0, 2)}
          </div>

          <div>
            <Text strong>
              {value || record.lottery_code}
            </Text>

            <div>
              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                  textTransform: "uppercase",
                }}
              >
                {record.lottery_code}
              </Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "Draw Number",
      dataIndex: "draw_number",
      key: "draw_number",
      width: 140,
      align: "center",
      render: (value) =>
        value ? (
          <Tag color="blue">{value}</Tag>
        ) : (
          <Tag>No draw</Tag>
        ),
    },
    {
      title: "Available Qty",
      dataIndex: "available_quantity",
      key: "available_quantity",
      width: 150,
      align: "right",
      render: (value) => (
        <Text strong>
          {Number(value || 0).toLocaleString()}
        </Text>
      ),
    },
    {
      title: "JAYAWAY",
      key: "jayaway",
      width: 170,
      align: "right",
      render: (_, record) => (
        <InputNumber
          min={0}
          precision={0}
          value={Number(
            record.agent_counts?.JAYAWAY || 0,
          )}
          onChange={(value) =>
            handleCountChange(
              record.lottery_code,
              "JAYAWAY",
              value,
            )
          }
          formatter={(value) =>
            value
              ? String(value).replace(
                  /\B(?=(\d{3})+(?!\d))/g,
                  ",",
                )
              : ""
          }
          parser={(value) =>
            value ? value.replace(/,/g, "") : ""
          }
          style={{
            width: 130,
          }}
        />
      ),
    },
    {
      title: "WINWAY",
      key: "winway",
      width: 170,
      align: "right",
      render: (_, record) => (
        <InputNumber
          min={0}
          precision={0}
          value={Number(
            record.agent_counts?.WINWAY || 0,
          )}
          disabled={record.assignRemaining}
          onChange={(value) =>
            handleCountChange(
              record.lottery_code,
              "WINWAY",
              value,
            )
          }
          formatter={(value) =>
            value
              ? String(value).replace(
                  /\B(?=(\d{3})+(?!\d))/g,
                  ",",
                )
              : ""
          }
          parser={(value) =>
            value ? value.replace(/,/g, "") : ""
          }
          style={{
            width: 130,
          }}
        />
      ),
    },
    {
      title: "Remaining",
      key: "remaining",
      width: 140,
      align: "right",
      render: (_, record) => {
        const available = Number(
          record.available_quantity || 0,
        );

        const jayaway = Number(
          record.agent_counts?.JAYAWAY || 0,
        );

        const winway = Number(
          record.agent_counts?.WINWAY || 0,
        );

        const remaining =
          available - jayaway - winway;

        if (remaining < 0) {
          return (
            <Tag
              color="error"
              icon={<WarningOutlined />}
            >
              {remaining.toLocaleString()}
            </Tag>
          );
        }

        if (remaining === 0) {
          return (
            <Tag
              color="success"
              icon={<CheckCircleOutlined />}
            >
              Fully assigned
            </Tag>
          );
        }

        return (
          <Tag color="warning">
            {remaining.toLocaleString()}
          </Tag>
        );
      },
    },
    {
      title: "Assign Remaining",
      key: "assignRemaining",
      width: 160,
      align: "center",
      render: (_, record) => (
        <Checkbox
          checked={Boolean(record.assignRemaining)}
          onChange={(event) =>
            handleAssignRemainingToggle(
              record.lottery_code,
              event.target.checked,
            )
          }
        >
          Auto
        </Checkbox>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 130,
      align: "center",
      render: (_, record) => {
        const available = Number(
          record.available_quantity || 0,
        );

        const jayaway = Number(
          record.agent_counts?.JAYAWAY || 0,
        );

        const winway = Number(
          record.agent_counts?.WINWAY || 0,
        );

        const assigned = jayaway + winway;

        if (assigned > available) {
          return <Tag color="error">Exceeded</Tag>;
        }

        if (assigned === available && available > 0) {
          return <Tag color="success">Complete</Tag>;
        }

        if (assigned > 0) {
          return <Tag color="processing">Partial</Tag>;
        }

        return <Tag>Not assigned</Tag>;
      },
    },
  ];

  return (
    <>
      {messageContextHolder}
      {modalContextHolder}

      <div
       
       
      >
        <Card
          bordered={false}
          style={{
            marginBottom: 24,
            borderRadius: 16,
            boxShadow:
              "0 4px 16px rgba(0, 0, 0, 0.04)",
          }}
        >
          <Row
            gutter={[20, 20]}
            align="middle"
            justify="space-between"
          >
            <Col>
              <Title level={2} style={{ margin: 0 }}>
                Agent Assignment
              </Title>

              <Text type="secondary">
                Assign available lottery quantities to
                JAYAWAY and WINWAY agents.
              </Text>
            </Col>

            <Col>
              <Space wrap>
                <Text type="secondary">
                  Assignment date:
                </Text>

                <DatePicker
                  value={date ? dayjs(date) : null}
                  onChange={handleDateChange}
                  allowClear={false}
                  format="DD MMM YYYY"
                  suffixIcon={<CalendarOutlined />}
                  style={{ width: 185 }}
                />
              </Space>
            </Col>
          </Row>
        </Card>

        {error && (
          <Alert
            showIcon
            closable
            type="error"
            message="Unable to load assignments"
            description={error}
            style={{ marginBottom: 24 }}
          />
        )}

        {invalidRows.length > 0 && (
          <Alert
            showIcon
            type="error"
            message="Assignment quantities exceeded"
            description={`${invalidRows.length} lottery assignment${
              invalidRows.length === 1 ? "" : "s"
            } exceed the available quantity. Reduce the agent quantities before saving.`}
            style={{ marginBottom: 24 }}
          />
        )}

        <Row
          gutter={[20, 20]}
          style={{ marginBottom: 24 }}
        >
          <Col xs={24} sm={12} xl={6}>
            <Card
              bordered={false}
              style={{
                height: "100%",
                borderRadius: 16,
                boxShadow:
                  "0 4px 16px rgba(0, 0, 0, 0.04)",
              }}
            >
              <Statistic
                title="Available Quantity"
                value={totalAvailable}
                prefix={
                  <TeamOutlined
                    style={{ color: "#1677ff" }}
                  />
                }
                valueStyle={{ fontWeight: 700 }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} xl={6}>
            <Card
              bordered={false}
              style={{
                height: "100%",
                borderRadius: 16,
                boxShadow:
                  "0 4px 16px rgba(0, 0, 0, 0.04)",
              }}
            >
              <Statistic
                title="JAYAWAY Assigned"
                value={totalJayaway}
                prefix={
                  <UserOutlined
                    style={{ color: "#722ed1" }}
                  />
                }
                valueStyle={{ fontWeight: 700 }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} xl={6}>
            <Card
              bordered={false}
              style={{
                height: "100%",
                borderRadius: 16,
                boxShadow:
                  "0 4px 16px rgba(0, 0, 0, 0.04)",
              }}
            >
              <Statistic
                title="WINWAY Assigned"
                value={totalWinway}
                prefix={
                  <UserOutlined
                    style={{ color: "#13c2c2" }}
                  />
                }
                valueStyle={{ fontWeight: 700 }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} xl={6}>
            <Card
              bordered={false}
              style={{
                height: "100%",
                borderRadius: 16,
                boxShadow:
                  "0 4px 16px rgba(0, 0, 0, 0.04)",
              }}
            >
              <Statistic
                title="Remaining Quantity"
                value={totalRemaining}
                prefix={
                  totalRemaining < 0 ? (
                    <WarningOutlined
                      style={{ color: "#ff4d4f" }}
                    />
                  ) : (
                    <CheckCircleOutlined
                      style={{
                        color:
                          totalRemaining === 0
                            ? "#52c41a"
                            : "#fa8c16",
                      }}
                    />
                  )
                }
                valueStyle={{
                  fontWeight: 700,
                  color:
                    totalRemaining < 0
                      ? "#ff4d4f"
                      : totalRemaining === 0
                        ? "#52c41a"
                        : "#fa8c16",
                }}
              />
            </Card>
          </Col>
        </Row>

        <Card
          bordered={false}
          style={{
            marginBottom: 24,
            borderRadius: 16,
            boxShadow:
              "0 4px 16px rgba(0, 0, 0, 0.04)",
          }}
        >
          <Row
            gutter={[20, 20]}
            align="middle"
          >
            <Col xs={24} lg={8}>
              <Text strong>
                Overall assignment progress
              </Text>

              <div style={{ marginTop: 4 }}>
                <Text type="secondary">
                  {totalAssigned.toLocaleString()} of{" "}
                  {totalAvailable.toLocaleString()} assigned
                </Text>
              </div>
            </Col>

            <Col xs={24} lg={16}>
              <Progress
                percent={Number(
                  assignmentPercentage.toFixed(1),
                )}
                status={
                  totalRemaining < 0
                    ? "exception"
                    : totalRemaining === 0
                      ? "success"
                      : "active"
                }
              />
            </Col>
          </Row>
        </Card>

        <Card
          title={
            <Space>
              <TeamOutlined
                style={{ color: "#1677ff" }}
              />
              <span>Lottery Agent Assignments</span>
            </Space>
          }
          bordered={false}
          style={{
            borderRadius: 16,
            boxShadow:
              "0 4px 16px rgba(0, 0, 0, 0.04)",
          }}
        >
          <Table
            rowKey={(record) =>
              record.lottery_code
            }
            columns={columns}
            dataSource={data}
            loading={loading}
            pagination={false}
            scroll={{ x: 1250 }}
            locale={{
              emptyText: (
                <Empty
                  image={
                    Empty.PRESENTED_IMAGE_SIMPLE
                  }
                  description={
                    date
                      ? "No assignments found for this date"
                      : "Select an assignment date"
                  }
                />
              ),
            }}
            summary={() =>
              data.length > 0 ? (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell
                      index={0}
                    />

                    <Table.Summary.Cell
                      index={1}
                    >
                      <Text strong>Total</Text>
                    </Table.Summary.Cell>

                    <Table.Summary.Cell
                      index={2}
                    />

                    <Table.Summary.Cell
                      index={3}
                      align="right"
                    >
                      <Text strong>
                        {totalAvailable.toLocaleString()}
                      </Text>
                    </Table.Summary.Cell>

                    <Table.Summary.Cell
                      index={4}
                      align="right"
                    >
                      <Text strong>
                        {totalJayaway.toLocaleString()}
                      </Text>
                    </Table.Summary.Cell>

                    <Table.Summary.Cell
                      index={5}
                      align="right"
                    >
                      <Text strong>
                        {totalWinway.toLocaleString()}
                      </Text>
                    </Table.Summary.Cell>

                    <Table.Summary.Cell
                      index={6}
                      align="right"
                    >
                      <Text
                        strong
                        type={
                          totalRemaining < 0
                            ? "danger"
                            : undefined
                        }
                      >
                        {totalRemaining.toLocaleString()}
                      </Text>
                    </Table.Summary.Cell>

                    <Table.Summary.Cell
                      index={7}
                    />

                    <Table.Summary.Cell
                      index={8}
                    />
                  </Table.Summary.Row>
                </Table.Summary>
              ) : null
            }
          />

          {data.length > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 24,
              }}
            >
              <Button
                type="primary"
                size="large"
                icon={<SaveOutlined />}
                loading={saving}
                disabled={
                  loading ||
                  !date ||
                  invalidRows.length > 0
                }
                onClick={handleSave}
                style={{ minWidth: 210 }}
              >
                Confirm Assignments
              </Button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
};

export default Assignment;

