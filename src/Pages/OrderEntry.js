import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Input,
  InputNumber,
  message,
  Modal,
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
  CloudSyncOutlined,
  NumberOutlined,
  SaveOutlined,
  ShoppingCartOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import {
  getOrders,
  saveOrders,
  getLatestOrderDate,
  getDrawNumbers,
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

const OrderEntry = () => {
  const [selectedDate, setSelectedDate] = useState("");
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [error, setError] = useState("");

  const [messageApi, messageContextHolder] = message.useMessage();
  const [modalApi, modalContextHolder] = Modal.useModal();

  useEffect(() => {
    loadLatestOrderDate();
  }, []);

  const loadLatestOrderDate = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getLatestOrderDate();
      const latestDate = response.data?.date;

      if (latestDate) {
        setSelectedDate(latestDate);
        await loadOrders(latestDate);
      } else {
        const today = dayjs().format("YYYY-MM-DD");

        setSelectedDate(today);
        await loadOrders(today);
      }
    } catch (err) {
      console.error("Failed to load latest order date:", err);

      const today = dayjs().format("YYYY-MM-DD");

      setSelectedDate(today);
      await loadOrders(today);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async (date) => {
    if (!date) return;

    setLoading(true);
    setError("");

    try {
      const response = await getOrders(date);
      const orderData = Array.isArray(response.data) ? response.data : [];

      const sortedOrders = [...orderData].sort((a, b) => {
        const codeA = String(a.lottery_code || "").toLowerCase();
        const codeB = String(b.lottery_code || "").toLowerCase();

        const indexA = LOTTERY_ORDER.indexOf(codeA);
        const indexB = LOTTERY_ORDER.indexOf(codeB);

        const safeIndexA = indexA === -1 ? LOTTERY_ORDER.length : indexA;

        const safeIndexB = indexB === -1 ? LOTTERY_ORDER.length : indexB;

        return safeIndexA - safeIndexB;
      });

      const normalizedOrders = sortedOrders.map((order) => ({
        ...order,
        draw_number: order.draw_number || "",
        quantity: Number(order.quantity || 0),
      }));

      setOrders(normalizedOrders);
    } catch (err) {
      console.error("Failed to load orders:", err);

      setOrders([]);
      setError("Failed to load orders for the selected date.");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = async (date) => {
    if (!date) return;

    const formattedDate = date.format("YYYY-MM-DD");

    setSelectedDate(formattedDate);
    await loadOrders(formattedDate);
  };

  const handleAutoFillDrawNumbers = async () => {
    if (!selectedDate) {
      messageApi.warning("Please select a draw date first.");
      return;
    }

    setAutoFilling(true);

    try {
      const response = await getDrawNumbers(selectedDate);

      const drawNumbers = Array.isArray(response.data) ? response.data : [];

      setOrders((previousOrders) =>
        previousOrders.map((order) => {
          const currentCode = String(order.lottery_code || "").toLowerCase();

          const match = drawNumbers.find((draw) => {
            const drawCode = String(draw.lottery_code || "").toLowerCase();

            return drawCode === currentCode;
          });

          return match
            ? {
                ...order,
                draw_number: match.draw_number || "",
              }
            : order;
        }),
      );

      messageApi.success("Draw numbers filled successfully.");
    } catch (err) {
      console.error("Failed to auto-fill draw numbers:", err);

      messageApi.error("Failed to auto-fill draw numbers.");
    } finally {
      setAutoFilling(false);
    }
  };

  const handleDrawChange = (lotteryCode, value) => {
    setOrders((previousOrders) =>
      previousOrders.map((order) =>
        order.lottery_code === lotteryCode
          ? {
              ...order,
              draw_number: value,
            }
          : order,
      ),
    );
  };

  const handleQuantityChange = (lotteryCode, value) => {
    const quantity = Number(value || 0);

    setOrders((previousOrders) =>
      previousOrders.map((order) =>
        order.lottery_code === lotteryCode
          ? {
              ...order,
              quantity: Math.max(quantity, 0),
            }
          : order,
      ),
    );
  };

  const totalQuantity = useMemo(() => {
    return orders.reduce(
      (total, order) => total + Number(order.quantity || 0),
      0,
    );
  }, [orders]);

  const completedDrawNumbers = useMemo(() => {
    return orders.filter((order) => String(order.draw_number || "").trim())
      .length;
  }, [orders]);

  const activeLotteries = useMemo(() => {
    return orders.filter((order) => Number(order.quantity || 0) > 0).length;
  }, [orders]);

  const validateOrders = () => {
    if (!selectedDate) {
      messageApi.warning("Please select an order date.");
      return false;
    }

    if (!orders.length) {
      messageApi.warning("There are no orders to save.");
      return false;
    }

    const activeOrders = orders.filter(
      (order) => Number(order.quantity || 0) > 0,
    );

    if (activeOrders.length === 0) {
      messageApi.warning("Please enter a quantity for at least one lottery.");

      return false;
    }

    const missingDrawNumbers = activeOrders.filter(
      (order) => !String(order.draw_number || "").trim(),
    );

    if (missingDrawNumbers.length > 0) {
      messageApi.warning(
        `Enter draw numbers for active lotteries. ${missingDrawNumbers.length} remaining.`,
      );

      return false;
    }

    const invalidQuantity = orders.find(
      (order) =>
        Number.isNaN(Number(order.quantity)) || Number(order.quantity) < 0,
    );

    if (invalidQuantity) {
      messageApi.warning("All quantities must be zero or greater.");

      return false;
    }

    return true;
  };

  const saveOrderData = async () => {
    setSaving(true);

    const payload = {
      order_date: selectedDate,
      orders: orders.map((order) => ({
        lottery_code: order.lottery_code,
        draw_number: String(order.draw_number || "").trim(),
        quantity: Number(order.quantity || 0),
      })),
    };

    try {
      await saveOrders(payload);

      messageApi.success({
        content: "Orders saved successfully.",
        icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
      });

      await loadOrders(selectedDate);
    } catch (err) {
      console.error("Failed to save orders:", err);

      messageApi.error("Failed to save orders. Please try again.");

      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    const isValid = validateOrders();

    if (!isValid) return;

    modalApi.confirm({
      title: "Save lottery orders?",
      icon: <SaveOutlined style={{ color: "#1677ff" }} />,
      centered: true,
      width: 480,
      content: (
        <div style={{ marginTop: 16 }}>
          <p style={{ marginBottom: 8 }}>
            Date: <strong>{dayjs(selectedDate).format("DD MMMM YYYY")}</strong>
          </p>

          <p style={{ marginBottom: 8 }}>
            Active lotteries: <strong>{activeLotteries}</strong>
          </p>

          <p style={{ marginBottom: 0 }}>
            Total quantity: <strong>{totalQuantity.toLocaleString()}</strong>
          </p>
        </div>
      ),
      okText: "Save Orders",
      cancelText: "Cancel",
      okButtonProps: {
        loading: saving,
      },
      onOk: async () => {
        await saveOrderData();
      },
    });
  };

  const columns = [
    {
      title: "#",
      key: "index",
      width: 70,
      align: "center",
      render: (_, __, index) => <Text type="secondary">{index + 1}</Text>,
    },
    {
      title: "Ticket Name",
      dataIndex: "lottery_name",
      key: "lottery_name",
      width: 260,
      render: (value, record) => (
        <Space>
          <div
            style={{
              width: 38,
              height: 38,
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
            <Text strong>{value || record.lottery_code}</Text>

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
      width: 230,
      render: (value, record) => {
        const isActive = Number(record.quantity || 0) > 0;

        const isMissing = isActive && !String(value || "").trim();

        return (
          <Input
            value={value}
            placeholder="Enter draw number"
            prefix={<NumberOutlined style={{ color: "#8c8c8c" }} />}
            onChange={(event) =>
              handleDrawChange(record.lottery_code, event.target.value)
            }
            status={isMissing ? "warning" : ""}
            style={{
              maxWidth: 190,
            }}
          />
        );
      },
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      width: 220,
      align: "right",
      render: (value, record) => (
        <InputNumber
          min={0}
          precision={0}
          value={value}
          placeholder="0"
          controls
          formatter={(currentValue) =>
            currentValue
              ? String(currentValue).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
              : ""
          }
          parser={(currentValue) =>
            currentValue ? currentValue.replace(/,/g, "") : ""
          }
          onChange={(newValue) =>
            handleQuantityChange(record.lottery_code, newValue)
          }
          style={{
            width: 150,
          }}
        />
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 130,
      align: "center",
      render: (_, record) => {
        const hasDrawNumber = Boolean(String(record.draw_number || "").trim());

        const hasQuantity = Number(record.quantity || 0) > 0;

        if (hasDrawNumber && hasQuantity) {
          return <Tag color="success">Ready</Tag>;
        }

        if (hasDrawNumber && !hasQuantity) {
          return <Tag color="default">No quantity</Tag>;
        }

        if (!hasDrawNumber && hasQuantity) {
          return <Tag color="warning">Incomplete</Tag>;
        }

        return <Tag>Not active</Tag>;
      },
    },
  ];

  return (
    <>
      {messageContextHolder}
      {modalContextHolder}

      <div>
        <Row gutter={[20, 20]} align="middle" justify="space-between">
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              Order Entry
            </Title>

            <Text type="secondary">
              Enter ticket quantities and draw numbers for each lottery.
            </Text>
          </Col>

          <Col>
            <Space wrap>
              <Text type="secondary">Order date:</Text>

              <DatePicker
                value={selectedDate ? dayjs(selectedDate) : null}
                onChange={handleDateChange}
                allowClear={false}
                format="DD MMM YYYY"
                suffixIcon={<CalendarOutlined />}
                style={{ width: 180 }}
              />
            </Space>
          </Col>
        </Row>

        {error && (
          <Alert
            showIcon
            closable
            type="error"
            message="Unable to load orders"
            description={error}
            style={{ marginBottom: 24 }}
          />
        )}

        <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} xl={8}>
            <Card
              bordered={false}
              style={{
                height: "100%",
                borderRadius: 16,
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
              }}
            >
              <Statistic
                title="Total Ticket Quantity"
                value={totalQuantity}
                prefix={<ShoppingCartOutlined style={{ color: "#1677ff" }} />}
                valueStyle={{
                  fontWeight: 700,
                }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} xl={8}>
            <Card
              bordered={false}
              style={{
                height: "100%",
                borderRadius: 16,
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
              }}
            >
              <Statistic
                title="Active Lotteries"
                value={activeLotteries}
                suffix={`/ ${orders.length || 8}`}
                prefix={<CloudSyncOutlined style={{ color: "#52c41a" }} />}
                valueStyle={{
                  fontWeight: 700,
                }}
              />
            </Card>
          </Col>

          <Col xs={24} sm={12} xl={8}>
            <Card
              bordered={false}
              style={{
                height: "100%",
                borderRadius: 16,
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
              }}
            >
              <Statistic
                title="Draw Numbers Completed"
                value={completedDrawNumbers}
                suffix={`/ ${orders.length || 8}`}
                prefix={<CheckCircleOutlined style={{ color: "#722ed1" }} />}
                valueStyle={{
                  fontWeight: 700,
                }}
              />
            </Card>
          </Col>
        </Row>

        <Card
          title={
            <Space>
              <ShoppingCartOutlined style={{ color: "#1677ff" }} />
              <span>Lottery Orders</span>
            </Space>
          }
          extra={
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <Button
                icon={<SyncOutlined spin={autoFilling} />}
                loading={autoFilling}
                disabled={!selectedDate || loading}
                onClick={handleAutoFillDrawNumbers}
              >
                Auto-fill Draw Numbers
              </Button>
              {orders.length > 0 && (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={saving}
                  disabled={loading || !selectedDate}
                  onClick={handleSave}
                  style={{
                    marginLeft: 8,
                  }}
                >
                  Save Orders
                </Button>
              )}
            </div>
          }
          bordered={false}
          style={{
            borderRadius: 16,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
          }}
        >
          <Table
            rowKey={(record) => record.lottery_code}
            columns={columns}
            dataSource={orders}
            loading={loading}
            pagination={false}
            scroll={{ x: 900 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    selectedDate
                      ? "No lottery orders found for this date"
                      : "Select an order date"
                  }
                />
              ),
            }}
            summary={() =>
              orders.length > 0 ? (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} />

                    <Table.Summary.Cell index={1}>
                      <Text strong>Total</Text>
                    </Table.Summary.Cell>

                    <Table.Summary.Cell index={2}>
                      <Text type="secondary">
                        {completedDrawNumbers} draw numbers
                      </Text>
                    </Table.Summary.Cell>

                    <Table.Summary.Cell index={3} align="right">
                      <Text strong style={{ fontSize: 16 }}>
                        {totalQuantity.toLocaleString()}
                      </Text>
                    </Table.Summary.Cell>

                    <Table.Summary.Cell index={4} />
                  </Table.Summary.Row>
                </Table.Summary>
              ) : null
            }
          />
        </Card>
      </div>
    </>
  );
};

export default OrderEntry;
