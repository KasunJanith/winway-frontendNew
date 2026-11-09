import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
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
  const [fetchLastQuantitiesChecked, setFetchLastQuantitiesChecked] = useState(false);
  const [fetchingLastQuantities, setFetchingLastQuantities] = useState(false);

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

      const sortedOrders = [...orderData].sort((a, b) =>
        String(a.lottery_name || a.lottery_code || "")
          .localeCompare(String(b.lottery_name || b.lottery_code || ""), undefined, {
            sensitivity: "base",
          })
      );

      const normalizedOrders = sortedOrders.map((order) => {
        const bulks = Array.isArray(order.bulks) && order.bulks.length
          ? order.bulks.map((b) => ({
              bulk_number: b.bulk_number || 1,
              quantity: Number(b.quantity || 0),
              label: b.label || (b.bulk_number === 1 ? "Initial" : `Bulk ${b.bulk_number}`),
            }))
          : [{ bulk_number: 1, quantity: Number(order.quantity || 0), label: "Initial" }];
        // ensure initial exists
        if (!bulks.some((b) => b.bulk_number === 1)) {
          bulks.unshift({ bulk_number: 1, quantity: 0, label: "Initial" });
        }
        bulks.sort((a, b) => a.bulk_number - b.bulk_number);
        const total = bulks.reduce((s, b) => s + Number(b.quantity || 0), 0);
        return {
          ...order,
          draw_number: order.draw_number || "",
          quantity: total,
          bulks,
        };
      });

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
    // Always refresh draw numbers for the newly selected date (including new lotteries)
    try {
      const response = await getDrawNumbers(formattedDate);
      const drawNumbers = Array.isArray(response.data) ? response.data : [];
      setOrders((previousOrders) =>
        previousOrders.map((order) => {
          const currentCode = String(order.lottery_code || "").toLowerCase();
          const match = drawNumbers.find((draw) => {
            const drawCode = String(draw.lottery_code || "").toLowerCase();
            return drawCode === currentCode;
          });
          // Overwrite with date-correct draw number when available
          if (match && match.draw_number) {
            return { ...order, draw_number: match.draw_number };
          }
          return order;
        })
      );
    } catch (err) {
      console.error("Auto draw fill on date change failed:", err);
    }
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

  const handleFetchLastQuantities = async (checked) => {
    setFetchLastQuantitiesChecked(checked);

    if (!checked) return;

    if (!selectedDate) {
      messageApi.warning("Please select a date first.");
      return;
    }

    setFetchingLastQuantities(true);

    try {
      const latestResponse = await getLatestOrderDate();
      const latestDate = latestResponse.data?.date;

      if (!latestDate || latestDate === selectedDate) {
        messageApi.warning("No previous order available.");
        return;
      }

      const previousOrdersResponse = await getOrders(latestDate);
      const previousOrders = Array.isArray(previousOrdersResponse.data)
        ? previousOrdersResponse.data
        : [];

      if (!previousOrders.length) {
        messageApi.warning("No previous orders found.");
        return;
      }

      const quantityMap = {};
      previousOrders.forEach((prevOrder) => {
        const code = String(prevOrder.lottery_code || "").toLowerCase();
        // Prefer full bulks array from API
        if (Array.isArray(prevOrder.bulks) && prevOrder.bulks.length) {
          quantityMap[code] = prevOrder.bulks.map((b) => ({
            bulk_number: b.bulk_number || 1,
            quantity: Number(b.quantity || 0),
            label: b.label || (b.bulk_number === 1 ? "Initial" : `Bulk ${b.bulk_number}`),
          }));
        } else {
          quantityMap[code] = [
            {
              bulk_number: 1,
              quantity: Number(prevOrder.quantity || 0),
              label: "Initial",
            },
          ];
        }
      });

      setOrders((currentOrders) =>
        currentOrders.map((order) => {
          const code = String(order.lottery_code || "").toLowerCase();
          const prevBulks = quantityMap[code];
          if (!prevBulks) return order;
          const total = prevBulks.reduce((s, b) => s + Number(b.quantity || 0), 0);
          return {
            ...order,
            bulks: prevBulks.map((b) => ({ ...b })),
            quantity: total,
          };
        }),
      );

      messageApi.success("Last order quantities fetched successfully.");
    } catch (error) {
      console.error("Failed to fetch last order quantities:", error);
      messageApi.error("Failed to fetch last order quantities.");
    } finally {
      setFetchingLastQuantities(false);
      setFetchLastQuantitiesChecked(false);
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

  const handleQuantityChange = (lotteryCode, value, bulkNumber = 1) => {
    const quantity = Math.max(Number(value || 0), 0);
    setOrders((previousOrders) =>
      previousOrders.map((order) => {
        if (order.lottery_code !== lotteryCode) return order;
        let bulks = Array.isArray(order.bulks) ? [...order.bulks] : [];
        if (!bulks.some((b) => b.bulk_number === 1)) {
          bulks.unshift({ bulk_number: 1, quantity: 0, label: "Initial" });
        }
        const idx = bulks.findIndex((b) => b.bulk_number === bulkNumber);
        if (idx >= 0) {
          bulks[idx] = { ...bulks[idx], quantity };
        } else {
          bulks.push({
            bulk_number: bulkNumber,
            quantity,
            label: bulkNumber === 1 ? "Initial" : `Bulk ${bulkNumber}`,
          });
        }
        bulks.sort((a, b) => a.bulk_number - b.bulk_number);
        const total = bulks.reduce((s, b) => s + Number(b.quantity || 0), 0);
        return { ...order, bulks, quantity: total };
      }),
    );
  };

  const handleAddBulk = (lotteryCode) => {
    setOrders((previousOrders) =>
      previousOrders.map((order) => {
        if (order.lottery_code !== lotteryCode) return order;
        let bulks = Array.isArray(order.bulks) ? [...order.bulks] : [
          { bulk_number: 1, quantity: Number(order.quantity || 0), label: "Initial" },
        ];
        const maxBn = bulks.reduce((m, b) => Math.max(m, b.bulk_number || 1), 1);
        const next = maxBn + 1;
        bulks.push({ bulk_number: next, quantity: 0, label: `Bulk ${next}` });
        return { ...order, bulks };
      }),
    );
  };

  const handleRemoveBulk = (lotteryCode, bulkNumber) => {
    if (bulkNumber <= 1) return;
    setOrders((previousOrders) =>
      previousOrders.map((order) => {
        if (order.lottery_code !== lotteryCode) return order;
        const bulks = (order.bulks || []).filter((b) => b.bulk_number !== bulkNumber);
        const total = bulks.reduce((s, b) => s + Number(b.quantity || 0), 0);
        return { ...order, bulks, quantity: total };
      }),
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
      orders: orders.flatMap((order) => {
        const bulks = Array.isArray(order.bulks) && order.bulks.length
          ? order.bulks
          : [{ bulk_number: 1, quantity: Number(order.quantity || 0) }];
        return bulks
          .filter((b) => Number(b.quantity || 0) > 0)
          .map((b) => ({
            lottery_code: order.lottery_code,
            draw_number: String(order.draw_number || "").trim(),
            quantity: Number(b.quantity || 0),
            bulk_number: b.bulk_number || 1,
          }));
      }),
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
      title: "Quantities (Initial + Bulks)",
      key: "quantities",
      width: 420,
      render: (_, record) => {
        const bulks = Array.isArray(record.bulks) && record.bulks.length
          ? record.bulks
          : [{ bulk_number: 1, quantity: Number(record.quantity || 0), label: "Initial" }];
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {bulks.map((b) => (
              <Space key={b.bulk_number} size={6} wrap>
                <Tag color={b.bulk_number === 1 ? "blue" : "purple"} style={{ minWidth: 64, textAlign: "center" }}>
                  {b.bulk_number === 1 ? "Initial" : `Bulk ${b.bulk_number}`}
                </Tag>
                <InputNumber
                  min={0}
                  precision={0}
                  value={b.quantity}
                  placeholder="0"
                  controls
                  formatter={(v) => (v ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "")}
                  parser={(v) => (v ? v.replace(/,/g, "") : "")}
                  onChange={(val) =>
                    handleQuantityChange(record.lottery_code, val, b.bulk_number)
                  }
                  style={{ width: 120 }}
                />
                {b.bulk_number > 1 && (
                  <Button
                    size="small"
                    type="text"
                    danger
                    onClick={() => handleRemoveBulk(record.lottery_code, b.bulk_number)}
                  >
                    Remove
                  </Button>
                )}
              </Space>
            ))}
            <Space size={8}>
              <Button size="small" type="dashed" onClick={() => handleAddBulk(record.lottery_code)}>
                + Add bulk
              </Button>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Total: <Text strong>{Number(record.quantity || 0).toLocaleString()}</Text>
              </Text>
            </Space>
          </div>
        );
      },
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
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
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
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
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
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
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
            <>
              <Checkbox
                checked={fetchLastQuantitiesChecked}
                onChange={(e) => handleFetchLastQuantities(e.target.checked)}
                disabled={loading || !selectedDate || fetchingLastQuantities}
                style={{ marginRight: 8 }}
              >
                Fetch last order quantities
              </Checkbox>

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
            </>
          }
          bordered={false}
          style={{
            borderRadius: 16,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
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