import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  InputNumber,
  Button,
  Typography,
  message,
  Spin,
  Divider,
  Input,
  Statistic,
} from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { getSettings, saveSettingsGroup } from "../api/endPoints";
const { Title, Text } = Typography;

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({});
  const [lotteryPrizes, setLotteryPrizes] = useState({});
  // 🔄 Load settings from backend
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const settingsArray = await getSettings();
      const map = Object.fromEntries(
        settingsArray.data.data.map((s) => [s.key, s.value])
      );

      setSettings(map);
      setLotteryPrizes({
        AdaSampatha: map.AdaSampatha,
        DhanaNidhanaya: map.DhanaNidhanaya,
        Govisetha: map.Govisetha,
        Handahana: map.Handahana,
        MahajanaSampatha: map.MahajanaSampatha,
        MegaPower: map.MegaPower,
        NLBJaya: map.NLBJaya,
        SubaDawasak: map.SubaDawasak,
      });
    } catch (err) {
      message.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };
  const formattedDate = settings?.LastUpdatedPrizes
    ? new Date(settings.LastUpdatedPrizes).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Colombo",
      })
    : "N/A";

  // 💾 Save handler for a specific key group
  const saveSettingGroup = async (group) => {
    try {
      setSaving(true);

      await saveSettingsGroup(group);

      message.success("Settings saved successfully");
    } catch (err) {
      console.error(err);
      message.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };
  useEffect(() => {
    fetchSettings();
  }, []);

  // 🧾 Input update helper
  const updateValue = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <>
      <Title level={3} style={{ textAlign: "left" }}>
        Settings
      </Title>
      <Divider />
      <Title level={4} style={{ textAlign: "left" }}>
        Loyalty Program Settings
      </Title>
      <Divider />
      <Row gutter={[24, 24]}>
        {/* 🅰️ ENTRY TIER CRITERIA */}
        <Col xs={24} md={12} lg={8}>
          <Card
            headStyle={{
              background: "#001529",
              color: "#fff",
              fontWeight: "600",
              borderRadius: "10px 10px 0 0",
            }}
            title=" Entry Tier Criteria"
            extra={
              <Button
                icon={<SaveOutlined />}
                type="primary"
                loading={saving}
                onClick={() =>
                  saveSettingGroup({
                    LOYALTY_ENTRY_PLATINUM_TICKETS:
                      settings.LOYALTY_ENTRY_PLATINUM_TICKETS,
                    LOYALTY_ENTRY_GOLD_TICKETS:
                      settings.LOYALTY_ENTRY_GOLD_TICKETS,
                    LOYALTY_ENTRY_SILVER_TICKETS:
                      settings.LOYALTY_ENTRY_SILVER_TICKETS,
                    LOYALTY_ENTRY_MIN_CHECK_TICKETS:
                      settings.LOYALTY_ENTRY_MIN_CHECK_TICKETS,
                  })
                }
              >
                Save
              </Button>
            }
            style={{
              borderRadius: 12,
              boxShadow: "0 4px 20px rgba(123,47,247,0.1)",
            }}
          >
            <Text>Minimum Tickets Required for Each Tier</Text>
            <div style={{ marginTop: 16 }}>
              <p>Platinum:</p>
              <InputNumber
                value={Number(settings.LOYALTY_ENTRY_PLATINUM_TICKETS)}
                onChange={(v) =>
                  updateValue("LOYALTY_ENTRY_PLATINUM_TICKETS", v)
                }
                min={0}
              />
              <p style={{ marginTop: 12 }}>Gold:</p>
              <InputNumber
                value={Number(settings.LOYALTY_ENTRY_GOLD_TICKETS)}
                onChange={(v) => updateValue("LOYALTY_ENTRY_GOLD_TICKETS", v)}
                min={0}
              />
              <p style={{ marginTop: 12 }}>Silver:</p>
              <InputNumber
                value={Number(settings.LOYALTY_ENTRY_SILVER_TICKETS)}
                onChange={(v) => updateValue("LOYALTY_ENTRY_SILVER_TICKETS", v)}
                min={0}
              />
              <p style={{ marginTop: 12 }}>Minimum Check Threshold:</p>
              <InputNumber
                value={Number(settings.LOYALTY_ENTRY_MIN_CHECK_TICKETS)}
                onChange={(v) =>
                  updateValue("LOYALTY_ENTRY_MIN_CHECK_TICKETS", v)
                }
                min={0}
              />
            </div>
          </Card>
        </Col>

        {/* 🅱️ MONTHLY MAINTENANCE */}
        <Col xs={24} md={12} lg={8}>
          <Card
            headStyle={{
              background: "#001529",
              color: "#fff",
              fontWeight: "600",
              borderRadius: "10px 10px 0 0",
            }}
            title="Monthly Maintenance"
            extra={
              <Button
                icon={<SaveOutlined />}
                type="primary"
                loading={saving}
                onClick={() =>
                  saveSettingGroup({
                    LOYALTY_MONTHLY_PLATINUM_TICKETS:
                      settings.LOYALTY_MONTHLY_PLATINUM_TICKETS,
                    LOYALTY_MONTHLY_GOLD_TICKETS:
                      settings.LOYALTY_MONTHLY_GOLD_TICKETS,
                    LOYALTY_MONTHLY_SILVER_TICKETS:
                      settings.LOYALTY_MONTHLY_SILVER_TICKETS,
                    LOYALTY_DOWNGRADE_THRESHOLD:
                      settings.LOYALTY_DOWNGRADE_THRESHOLD,
                  })
                }
              >
                Save
              </Button>
            }
            style={{
              borderRadius: 12,
              boxShadow: "0 4px 20px rgba(241,7,163,0.1)",
            }}
          >
            <Text>Minimum Monthly Ticket Counts per Tier</Text>
            <div style={{ marginTop: 16 }}>
              <p>Platinum:</p>
              <InputNumber
                value={Number(settings.LOYALTY_MONTHLY_PLATINUM_TICKETS)}
                onChange={(v) =>
                  updateValue("LOYALTY_MONTHLY_PLATINUM_TICKETS", v)
                }
                min={0}
              />
              <p style={{ marginTop: 12 }}>Gold:</p>
              <InputNumber
                value={Number(settings.LOYALTY_MONTHLY_GOLD_TICKETS)}
                onChange={(v) => updateValue("LOYALTY_MONTHLY_GOLD_TICKETS", v)}
                min={0}
              />
              <p style={{ marginTop: 12 }}>Silver:</p>
              <InputNumber
                value={Number(settings.LOYALTY_MONTHLY_SILVER_TICKETS)}
                onChange={(v) =>
                  updateValue("LOYALTY_MONTHLY_SILVER_TICKETS", v)
                }
                min={0}
              />
              <p style={{ marginTop: 12 }}>Downgrade Threshold (Blue):</p>
              <InputNumber
                value={Number(settings.LOYALTY_DOWNGRADE_THRESHOLD)}
                onChange={(v) => updateValue("LOYALTY_DOWNGRADE_THRESHOLD", v)}
                min={0}
              />
            </div>
          </Card>
        </Col>

        {/* ⏳ DOWNGRADE POLICY */}
        <Col xs={24} md={12} lg={8}>
          <Card
            headStyle={{
              background: "#001529",
              color: "#fff",
              fontWeight: "600",
              borderRadius: "10px 10px 0 0",
            }}
            title="Downgrade Policy"
            extra={
              <Button
                icon={<SaveOutlined />}
                type="primary"
                loading={saving}
                onClick={() =>
                  saveSettingGroup({
                    DOWNGRADE_MONTHS: settings.DOWNGRADE_MONTHS,
                  })
                }
              >
                Save
              </Button>
            }
            style={{
              borderRadius: 12,
              boxShadow: "0 4px 20px rgba(255,215,64,0.2)",
            }}
          >
            <Text>Months Below Threshold Before Downgrade</Text>
            <div style={{ marginTop: 16 }}>
              <p>Consecutive Months:</p>
              <InputNumber
                value={Number(settings.DOWNGRADE_MONTHS)}
                onChange={(v) => updateValue("DOWNGRADE_MONTHS", v)}
                min={1}
                max={12}
              />
            </div>
          </Card>
        </Col>
      </Row>
      <Divider />
      
    </>
  );
};

export default Settings;
