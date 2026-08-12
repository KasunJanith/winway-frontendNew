import React, { useMemo, useState } from "react";
import {
  Modal,
  Card,
  Row,
  Col,
  Tag,
  Statistic,
  Space,
  Segmented,
  Progress,
  Table,
  Divider,
  Typography,
} from "antd";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const { Text } = Typography;

const PIE_COLORS = [
  "#1677ff",
  "#52c41a",
  "#faad14",
  "#722ed1",
  "#eb2f96",
  "#13c2c2",
  "#fa541c",
  "#2f54eb",
];

function CustomerLoyaltyModal({
  open,
  onClose,
  mobileNumber,
  history = [],
  populationAverages = {},
  tierColors = {},
  lotteryKeys = [],
}) {
  const [compareAvg, setCompareAvg] = useState("Hide avg");

  /* =========================================================
     Helpers
  ========================================================= */

  const displayMonth = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  const latest = history[history.length - 1];

  const previous =
    history.length > 1 ? history[history.length - 2] : null;

  /* =========================================================
     Line chart data
  ========================================================= */

  const lineData = useMemo(() => {
    return history.map((record) => ({
      date: displayMonth(record.Last_Update),
      rawMonth: record.Last_Update,

      tickets: Number(record.Monthly_Ticket_Count || 0),

      tier:
        record.Month_Tier ||
        record.Current_Loyalty_Tier ||
        "N/A",

      avg: Number(
        populationAverages[record.Last_Update] || 0,
      ),
    }));
  }, [history, populationAverages]);

  /* =========================================================
     Latest month lottery distribution
  ========================================================= */

  const pieData = useMemo(() => {
    if (!latest) return [];

    return lotteryKeys
      .map((key) => ({
        key,
        name: key.replace(/_/g, " "),
        value: Number(latest[key] || 0),
      }))
      .filter((item) => item.value > 0);
  }, [latest, lotteryKeys]);

  /* =========================================================
     Overall lottery totals
  ========================================================= */

  const overallLotteryData = useMemo(() => {
    return lotteryKeys
      .map((key) => {
        const total = history.reduce(
          (sum, row) => sum + Number(row[key] || 0),
          0,
        );

        return {
          key,
          name: key.replace(/_/g, " "),
          value: total,
        };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [history, lotteryKeys]);

  /* =========================================================
     Summary calculations
  ========================================================= */

  const statistics = useMemo(() => {
    if (!history.length) {
      return {
        totalTickets: 0,
        averageTickets: 0,
        highestTickets: 0,
        lowestTickets: 0,
        bestMonth: null,
        favoriteLottery: null,
      };
    }

    const ticketValues = history.map((record) =>
      Number(record.Monthly_Ticket_Count || 0),
    );

    const totalTickets = ticketValues.reduce(
      (sum, value) => sum + value,
      0,
    );

    const averageTickets =
      totalTickets / history.length;

    const highestTickets = Math.max(...ticketValues);
    const lowestTickets = Math.min(...ticketValues);

    const bestMonth = history.reduce(
      (best, current) => {
        if (!best) return current;

        return Number(
          current.Monthly_Ticket_Count || 0,
        ) >
          Number(best.Monthly_Ticket_Count || 0)
          ? current
          : best;
      },
      null,
    );

    const favoriteLottery =
      overallLotteryData.length > 0
        ? overallLotteryData[0]
        : null;

    return {
      totalTickets,
      averageTickets,
      highestTickets,
      lowestTickets,
      bestMonth,
      favoriteLottery,
    };
  }, [history, overallLotteryData]);

  /* =========================================================
     Latest month comparison
  ========================================================= */

  const latestTickets = Number(
    latest?.Monthly_Ticket_Count || 0,
  );

  const previousTickets = Number(
    previous?.Monthly_Ticket_Count || 0,
  );

  const monthlyDifference =
    latestTickets - previousTickets;

  const monthlyPercentage =
    previousTickets > 0
      ? (monthlyDifference / previousTickets) * 100
      : null;

  const latestPopulationAverage = Number(
    latest
      ? populationAverages[latest.Last_Update] || 0
      : 0,
  );

  const populationDifference =
    latestTickets - latestPopulationAverage;

  const populationPercentage =
    latestPopulationAverage > 0
      ? (populationDifference /
          latestPopulationAverage) *
        100
      : null;

  /* =========================================================
     Current tier
  ========================================================= */

  const currentTier =
    latest?.Month_Tier ||
    latest?.Current_Loyalty_Tier ||
    "N/A";

  /* =========================================================
     Custom colored dot
  ========================================================= */

  const TierDot = ({ cx, cy, payload }) => {
    if (cx === undefined || cy === undefined) {
      return null;
    }

    const color =
      tierColors[payload?.tier] || "#7b2ff7";

    return (
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill={color}
        stroke="#ffffff"
        strokeWidth={2}
      />
    );
  };

  /* =========================================================
     Monthly history table
  ========================================================= */

  const historyColumns = [
    {
      title: "Month",
      dataIndex: "Last_Update",
      key: "month",
      render: (value) => displayMonth(value),
    },
    {
      title: "Tier",
      key: "tier",
      render: (_, record) => {
        const tier =
          record.Month_Tier ||
          record.Current_Loyalty_Tier ||
          "N/A";

        return (
          <Tag
            color={tierColors[tier] || "default"}
            style={{
              fontWeight: 600,
            }}
          >
            {tier}
          </Tag>
        );
      },
    },
    {
      title: "Monthly Tickets",
      dataIndex: "Monthly_Ticket_Count",
      key: "tickets",
      align: "right",
      render: (value) =>
        Number(value || 0).toLocaleString(),
    },
    {
      title: "Population Avg",
      key: "populationAverage",
      align: "right",
      render: (_, record) =>
        Number(
          populationAverages[record.Last_Update] || 0,
        ).toLocaleString(),
    },
    {
      title: "Vs Average",
      key: "vsAverage",
      align: "right",
      render: (_, record) => {
        const tickets = Number(
          record.Monthly_Ticket_Count || 0,
        );

        const avg = Number(
          populationAverages[record.Last_Update] || 0,
        );

        const difference = tickets - avg;

        if (!avg) {
          return "-";
        }

        return (
          <Text
            type={
              difference >= 0 ? "success" : "danger"
            }
            strong
          >
            {difference >= 0 ? "+" : ""}
            {difference.toLocaleString()}
          </Text>
        );
      },
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={1200}
      footer={null}
      title={
        <Space>
          Customer
          <Tag color="blue">
            {mobileNumber || "-"}
          </Tag>

          <Tag
            color={
              tierColors[currentTier] || "default"
            }
          >
            {currentTier}
          </Tag>
        </Space>
      }
    >
      {latest ? (
        <>
          {/* =====================================================
              Current Status
          ===================================================== */}

          <Row
            gutter={[16, 16]}
            style={{ marginBottom: 16 }}
          >
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Latest Month"
                  value={displayMonth(
                    latest.Last_Update,
                  )}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Current Tier"
                  valueRender={() => (
                    <Tag
                      color={
                        tierColors[currentTier] ||
                        "default"
                      }
                      style={{
                        fontWeight: 700,
                        fontSize: 16,
                        padding: "5px 12px",
                      }}
                    >
                      {currentTier}
                    </Tag>
                  )}
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Latest Monthly Tickets"
                  value={latestTickets}
                  formatter={(value) =>
                    Number(value).toLocaleString()
                  }
                />
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Population Average"
                  value={latestPopulationAverage}
                  formatter={(value) =>
                    Number(value).toLocaleString()
                  }
                />
              </Card>
            </Col>
          </Row>

          {/* =====================================================
              Customer Statistics
          ===================================================== */}

          <Row
            gutter={[16, 16]}
            style={{ marginBottom: 16 }}
          >
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Total Tickets"
                  value={statistics.totalTickets}
                  formatter={(value) =>
                    Number(value).toLocaleString()
                  }
                />

                <Text type="secondary">
                  Across {history.length} month
                  {history.length !== 1 ? "s" : ""}
                </Text>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Monthly Average"
                  value={statistics.averageTickets}
                  precision={0}
                />

                <Text type="secondary">
                  Tickets per month
                </Text>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Highest Month"
                  value={statistics.highestTickets}
                  formatter={(value) =>
                    Number(value).toLocaleString()
                  }
                />

                <Text type="secondary">
                  {statistics.bestMonth
                    ? displayMonth(
                        statistics.bestMonth
                          .Last_Update,
                      )
                    : "-"}
                </Text>
              </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Favorite Lottery"
                  value={
                    statistics.favoriteLottery?.name ||
                    "-"
                  }
                />

                {statistics.favoriteLottery && (
                  <Text type="secondary">
                    {statistics.favoriteLottery.value.toLocaleString()}{" "}
                    tickets
                  </Text>
                )}
              </Card>
            </Col>
          </Row>

          {/* =====================================================
              Comparison Cards
          ===================================================== */}

          <Row
            gutter={[16, 16]}
            style={{ marginBottom: 16 }}
          >
            <Col xs={24} md={12}>
              <Card title="Month-to-Month Performance">
                {previous ? (
                  <>
                    <Statistic
                      title={`${displayMonth(
                        previous.Last_Update,
                      )} → ${displayMonth(
                        latest.Last_Update,
                      )}`}
                      value={Math.abs(
                        monthlyDifference,
                      )}
                      formatter={(value) =>
                        Number(
                          value,
                        ).toLocaleString()
                      }
                      prefix={
                        monthlyDifference >= 0
                          ? "+"
                          : "-"
                      }
                      suffix=" tickets"
                      valueStyle={{
                        color:
                          monthlyDifference >= 0
                            ? "#3f8600"
                            : "#cf1322",
                      }}
                    />

                    <div
                      style={{
                        marginTop: 10,
                      }}
                    >
                      <Text type="secondary">
                        Previous:{" "}
                        {previousTickets.toLocaleString()}
                      </Text>

                      {monthlyPercentage !== null && (
                        <>
                          {" "}
                          •{" "}
                          <Text
                            strong
                            type={
                              monthlyPercentage >= 0
                                ? "success"
                                : "danger"
                            }
                          >
                            {monthlyPercentage >= 0
                              ? "+"
                              : ""}
                            {monthlyPercentage.toFixed(
                              1,
                            )}
                            %
                          </Text>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <Text type="secondary">
                    Previous month data is not
                    available.
                  </Text>
                )}
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card title="Compared With Population">
                <Statistic
                  title="Difference from population average"
                  value={Math.abs(
                    populationDifference,
                  )}
                  prefix={
                    populationDifference >= 0
                      ? "+"
                      : "-"
                  }
                  suffix=" tickets"
                  valueStyle={{
                    color:
                      populationDifference >= 0
                        ? "#3f8600"
                        : "#cf1322",
                  }}
                />

                {populationPercentage !== null && (
                  <Text
                    strong
                    type={
                      populationPercentage >= 0
                        ? "success"
                        : "danger"
                    }
                  >
                    {populationPercentage >= 0
                      ? "+"
                      : ""}
                    {populationPercentage.toFixed(1)}%
                    compared with average
                  </Text>
                )}
              </Card>
            </Col>
          </Row>

          {/* =====================================================
              Main Charts
          ===================================================== */}

          <Row gutter={[16, 16]}>
            {/* Ticket Trend */}

            <Col xs={24} lg={16}>
              <Card
                title={
                  <Space>
                    Ticket Trend

                    <Segmented
                      options={[
                        "Hide avg",
                        "Show avg",
                      ]}
                      value={compareAvg}
                      onChange={setCompareAvg}
                      size="small"
                    />
                  </Space>
                }
              >
                <div
                  style={{
                    width: "100%",
                    height: 350,
                  }}
                >
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <LineChart
                      data={lineData}
                      margin={{
                        top: 8,
                        right: 20,
                        left: 0,
                        bottom: 8,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />

                      <XAxis dataKey="date" />

                      <YAxis />

                      <Tooltip
                        contentStyle={{
                          background: "#fff",
                          borderRadius: 8,
                        }}
                        formatter={(
                          value,
                          name,
                          entry,
                        ) => {
                          if (name === "Tickets") {
                            const tier =
                              entry?.payload
                                ?.tier || "N/A";

                            return [
                              `${Number(
                                value,
                              ).toLocaleString()} tickets`,
                              `Tickets (${tier})`,
                            ];
                          }

                          if (
                            name ===
                            "Population Avg"
                          ) {
                            return [
                              Number(
                                value,
                              ).toLocaleString(),
                              "Population Avg",
                            ];
                          }

                          return [value, name];
                        }}
                      />

                      <Legend />

                      <Line
                        type="linear"
                        dataKey="tickets"
                        name="Tickets"
                        stroke="#7b2ff7"
                        strokeWidth={3}
                        dot={<TierDot />}
                        activeDot={{
                          r: 8,
                        }}
                      />

                      {compareAvg ===
                        "Show avg" && (
                        <Line
                          type="linear"
                          dataKey="avg"
                          name="Population Avg"
                          stroke="#999999"
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          dot={false}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>

            {/* Latest Lottery Distribution */}

            <Col xs={24} lg={8}>
              <Card title="Latest Lottery Distribution">
                {pieData.length > 0 ? (
                  <div
                    style={{
                      height: 350,
                    }}
                  >
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="45%"
                          outerRadius={100}
                          label={({ percent }) =>
                            `${(
                              percent * 100
                            ).toFixed(0)}%`
                          }
                        >
                          {pieData.map(
                            (entry, index) => (
                              <Cell
                                key={entry.key}
                                fill={
                                  PIE_COLORS[
                                    index %
                                      PIE_COLORS.length
                                  ]
                                }
                              />
                            ),
                          )}
                        </Pie>

                        <Tooltip
                          formatter={(value) => [
                            Number(
                              value,
                            ).toLocaleString(),
                            "Tickets",
                          ]}
                        />

                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <Text type="secondary">
                    No lottery ticket breakdown is
                    available for the latest month.
                  </Text>
                )}
              </Card>
            </Col>
          </Row>

          {/* =====================================================
              Latest Lottery Details
          ===================================================== */}

          {pieData.length > 0 && (
            <>
              <Divider />

              <Card
                title={`Lottery Breakdown — ${displayMonth(
                  latest.Last_Update,
                )}`}
                style={{
                  marginBottom: 16,
                }}
              >
                <Row gutter={[24, 18]}>
                  {pieData.map((item, index) => {
                    const percentage =
                      latestTickets > 0
                        ? (item.value /
                            latestTickets) *
                          100
                        : 0;

                    return (
                      <Col
                        xs={24}
                        md={12}
                        key={item.key}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            marginBottom: 5,
                          }}
                        >
                          <Text strong>
                            {item.name}
                          </Text>

                          <Text>
                            {item.value.toLocaleString()}
                          </Text>
                        </div>

                        <Progress
                          percent={Number(
                            percentage.toFixed(1),
                          )}
                          strokeColor={
                            PIE_COLORS[
                              index %
                                PIE_COLORS.length
                            ]
                          }
                        />
                      </Col>
                    );
                  })}
                </Row>
              </Card>
            </>
          )}

          {/* =====================================================
              Overall Lottery Preference
          ===================================================== */}

          {overallLotteryData.length > 0 && (
            <Card
              title="Overall Lottery Preference"
              style={{
                marginBottom: 16,
              }}
            >
              <Row gutter={[24, 18]}>
                {overallLotteryData.map(
                  (item, index) => {
                    const percentage =
                      statistics.totalTickets > 0
                        ? (item.value /
                            statistics.totalTickets) *
                          100
                        : 0;

                    return (
                      <Col
                        xs={24}
                        md={12}
                        key={item.key}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            marginBottom: 5,
                          }}
                        >
                          <Space>
                            <Tag>
                              #{index + 1}
                            </Tag>

                            <Text strong>
                              {item.name}
                            </Text>
                          </Space>

                          <Text>
                            {item.value.toLocaleString()}
                          </Text>
                        </div>

                        <Progress
                          percent={Number(
                            percentage.toFixed(1),
                          )}
                          strokeColor={
                            PIE_COLORS[
                              index %
                                PIE_COLORS.length
                            ]
                          }
                        />
                      </Col>
                    );
                  },
                )}
              </Row>
            </Card>
          )}

          {/* =====================================================
              Tier Journey
          ===================================================== */}

          <Card
            title="Loyalty Tier Journey"
            style={{
              marginBottom: 16,
            }}
          >
            <Space wrap>
              {history.map((record, index) => {
                const tier =
                  record.Month_Tier ||
                  record.Current_Loyalty_Tier ||
                  "N/A";

                return (
                  <Space
                    key={`${record.Last_Update}-${index}`}
                    size={4}
                  >
                    <Text type="secondary">
                      {displayMonth(
                        record.Last_Update,
                      )}
                    </Text>

                    <Tag
                      color={
                        tierColors[tier] ||
                        "default"
                      }
                      style={{
                        fontWeight: 600,
                      }}
                    >
                      {tier}
                    </Tag>

                    {index <
                      history.length - 1 && (
                      <Text type="secondary">
                        →
                      </Text>
                    )}
                  </Space>
                );
              })}
            </Space>
          </Card>

          {/* =====================================================
              Monthly History
          ===================================================== */}

          <Card title="Monthly Customer History">
            <Table
              rowKey={(record, index) =>
                `${record.Last_Update}-${index}`
              }
              columns={historyColumns}
              dataSource={[...history].reverse()}
              pagination={
                history.length > 6
                  ? {
                      pageSize: 6,
                      size: "small",
                    }
                  : false
              }
              size="small"
              scroll={{
                x: 700,
              }}
            />
          </Card>
        </>
      ) : (
        <Card>
          No data available for this customer.
        </Card>
      )}
    </Modal>
  );
}

export default CustomerLoyaltyModal;