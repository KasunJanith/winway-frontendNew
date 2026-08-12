import React, { useEffect, useMemo, useState } from "react";
import { Row, Col, message } from "antd";
import axios from "axios";
import LoyalityCustomersSMS from "./LoyalityCustomersSMS";
import SMSPage from "./SMSPage";


import { ENV } from "../config/env";
const API_BASE = ENV.API_BASE_LOCAL;

function LoyaltyHub() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/loyalCustomer/combined`);
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      console.log(list[0]);
      setCustomers(list);
    } catch (err) {
      console.error(err);
      message.error("Failed to fetch loyalty customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

const summary = useMemo(() => {
  const s = { Platinum: 0, Gold: 0, Silver: 0, Blue: 0 };

  customers.forEach((c) => {
    const tier = c.CustomerInfo?.Current_Loyalty_Tier;
    if (tier && s[tier] !== undefined) {
      s[tier]++;
    }
  });

  return s;
}, [customers]);


  return (
    <Row gutter={[16, 16]}>


      <Col span={24}>
        <SMSPage loyaltyCustomers={customers} />
      </Col>
    </Row>
  );
}

export default LoyaltyHub;
