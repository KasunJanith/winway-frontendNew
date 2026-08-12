import React, { useEffect, useState } from "react";
import { Card, Input, Spin, Empty, Typography, Tabs } from "antd";
import {
  getCombinedCustomers,
  getMonthlyUpgrades,
} from "../api/endPoints";

const { Title } = Typography;

const LoyaltyCustomerProfile = () => {
  const [loading, setLoading] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [monthlyUpgrades, setMonthlyUpgrades] = useState([]);

  const [search, setSearch] = useState("");
  const [combinedCustomer, setCombinedCustomer] = useState(null);
  const [upgradeHistory, setUpgradeHistory] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const normalizeMobile = (value) => String(value || "").trim();

  const fetchData = async () => {
    setLoading(true);

    try {
      const [combinedRes, monthlyRes] = await Promise.all([
        getCombinedCustomers(),
        getMonthlyUpgrades(),
      ]);

      if (combinedRes.data?.success) {
        setCustomers(combinedRes.data.data || []);
      }

      if (monthlyRes.data?.success) {
        setMonthlyUpgrades(monthlyRes.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch loyalty data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    const mobile = normalizeMobile(value);
    setSearch(mobile);

    if (!mobile) {
      setCombinedCustomer(null);
      setUpgradeHistory([]);
      return;
    }

    const combined = customers.find(
      (c) => normalizeMobile(c.MobileNumber) === mobile
    );

    const history = monthlyUpgrades.filter(
      (c) => normalizeMobile(c.MobileNumber) === mobile
    );

    setCombinedCustomer(combined || null);
    setUpgradeHistory(history || []);
  };

  const JsonView = ({ title, data }) => (
    <Card style={{ marginTop: 24 }}>
      <Title level={4}>{title}</Title>

      {!data || (Array.isArray(data) && data.length === 0) ? (
        <Empty description="No data found" />
      ) : (
        <pre
          style={{
            background: "#1e1e1e",
            color: "#00ff99",
            padding: 20,
            borderRadius: 8,
            overflow: "auto",
            maxHeight: "80vh",
            fontSize: 13,
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </Card>
  );

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Loyal Customer Debug</Title>

      <Card>
        <Input.Search
          placeholder="Enter Mobile Number"
          enterButton="Search"
          allowClear
          size="large"
          onSearch={handleSearch}
          style={{ maxWidth: 450 }}
        />
      </Card>

      {loading && (
        <div style={{ textAlign: "center", marginTop: 60 }}>
          <Spin size="large" />
        </div>
      )}

      {!loading && search && !combinedCustomer && upgradeHistory.length === 0 && (
        <Card style={{ marginTop: 24 }}>
          <Empty description="Customer not found in both endpoints" />
        </Card>
      )}

      {!loading && search && (
        <Tabs
          style={{ marginTop: 24 }}
          defaultActiveKey="combined"
          items={[
            {
              key: "combined",
              label: "Combined Customer",
              children: (
                <JsonView
                  title="getCombinedCustomers Result"
                  data={combinedCustomer}
                />
              ),
            },
            {
              key: "monthly",
              label: `Monthly Upgrades (${upgradeHistory.length})`,
              children: (
                <JsonView
                  title="getMonthlyUpgrades Result"
                  data={upgradeHistory}
                />
              ),
            },
          ]}
        />
      )}
    </div>
  );
};

export default LoyaltyCustomerProfile;