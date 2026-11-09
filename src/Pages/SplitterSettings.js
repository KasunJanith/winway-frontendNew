import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  RobotOutlined,
  SaveOutlined,
  SettingOutlined,
  TrophyOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";

import {
  getSplitterSettings,
  updateSplitterValidations,
  addSplitterAgent,
  updateSplitterAgent,
  deleteSplitterAgent,
  addSplitterLottery,
  updateSplitterLottery,
  deleteSplitterLottery,
} from "./api/index";

import {
  DEFAULT_CONFIG,
  loadConfig,
  saveConfig,
} from "../config/splitterConfig";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const SplitterSettings = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingValidation, setSavingValidation] = useState(false);
  const [messageApi, messageContextHolder] = message.useMessage();

  // Agent selection dropdown state
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [agentForm] = Form.useForm();

  // Lottery selection dropdown state
  const [selectedLotteryCode, setSelectedLotteryCode] = useState(null);
  const [lotteryModalOpen, setLotteryModalOpen] = useState(false);
  const [editingLottery, setEditingLottery] = useState(null);
  const [lotteryForm] = Form.useForm();

  // Fetch from backend on mount, with localStorage fallback
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const local = loadConfig();
    try {
      const res = await getSplitterSettings();
      if (res.data) {
        const backendData = res.data;
        // Preserve local active/inactive flags when merging with backend lists
        const localAgentActive = {};
        (local.agents || []).forEach((a) => {
          localAgentActive[a.name || a.id] = a.active !== false;
        });
        const mergedAgents = (backendData.agents || []).map((a) => {
          const key = a.name || String(a.id);
          return {
            id: key,
            dbId: a.id,
            name: a.name,
            active: localAgentActive[key] !== undefined ? localAgentActive[key] : true,
          };
        });

        const localLotteryActive = {};
        (local.lotteries || []).forEach((l) => {
          localLotteryActive[(l.code || "").toLowerCase()] = l.active !== false;
        });
        const mergedLotteries = (backendData.lotteries || []).map((l) => {
          const codeKey = (l.code || "").toLowerCase();
          return {
            code: l.code,
            prefix: l.prefix || l.code.toLowerCase(),
            displayName: l.name,
            base_date: l.base_date || null,
            base_draw_number: l.base_draw_number || null,
            active: localLotteryActive[codeKey] !== undefined ? localLotteryActive[codeKey] : true,
          };
        });

        // Start from DEFAULT_CONFIG validations so new rules appear in the UI
        const mergedValidations = { ...local.validations };
        // Ensure every known default key exists
        Object.keys(local.validations || {}).forEach((k) => {
          if (!mergedValidations[k]) mergedValidations[k] = local.validations[k];
        });

        if (backendData.validations) {
          Object.keys(backendData.validations).forEach((k) => {
            if (mergedValidations[k] && typeof backendData.validations[k] === "boolean") {
              mergedValidations[k] = {
                ...mergedValidations[k],
                enabled: Boolean(backendData.validations[k]),
              };
            } else if (mergedValidations[k] && typeof backendData.validations[k] === "number") {
              // numeric settings like expectedFileCount are stored as enabled metadata only on bools
            }
          });
        }

        const newConfig = {
          agents: mergedAgents.length ? mergedAgents : local.agents,
          lotteries: mergedLotteries.length ? mergedLotteries : local.lotteries,
          validations: mergedValidations,
        };

        setConfig(newConfig);
        saveConfig(newConfig);
        return;
      }
    } catch (err) {
      console.warn("Backend settings API unavailable; using local configuration:", err);
    } finally {
      setLoading(false);
    }

    setConfig(local);
  };

  if (!config) return null;

  const persistLocal = (updated) => {
    setConfig(updated);
    saveConfig(updated);
  };

  // -------------------------------------------------------------
  // VALIDATION TOGGLE & UPDATE
  // -------------------------------------------------------------
  const handleValidationToggle = async (key, checked) => {
    const rule = config.validations[key];
    if (rule?.locked) return;

    setSavingValidation(true);
    const updatedValidations = {
      ...config.validations,
      [key]: { ...rule, enabled: checked },
    };

    const updatedConfig = {
      ...config,
      validations: updatedValidations,
    };

    persistLocal(updatedConfig);

    try {
      // Send flat key:value so backend update_validations can apply it
      const payload = { [key]: checked };
      const res = await updateSplitterValidations(payload);
      const backendVal = res?.data?.validations?.[key];
      const confirmed =
        backendVal === undefined ? checked : Boolean(backendVal);

      // Keep local in sync with what backend actually stored
      const synced = {
        ...updatedConfig,
        validations: {
          ...updatedValidations,
          [key]: { ...rule, enabled: confirmed },
        },
      };
      persistLocal(synced);

      messageApi.success(
        `"${rule.label}" is now ${confirmed ? "ON (enabled)" : "OFF (disabled)"} on the server.`
      );
    } catch (e) {
      console.error("Failed to save validation to backend:", e);
      messageApi.error(
        `Could not save "${rule.label}" to the server. Local setting was updated, but uploads still use the server value until this succeeds.`
      );
    } finally {
      setSavingValidation(false);
    }
  };

  const handleReset = () => {
    Modal.confirm({
      title: "Reset to defaults?",
      icon: <WarningOutlined style={{ color: "#fa8c16" }} />,
      content:
        "All validation rules, agents, and lotteries will be reset to default values.",
      okText: "Reset Defaults",
      okButtonProps: { danger: true },
      centered: true,
      onOk: async () => {
        try {
          const defaultPayload = {};
          Object.keys(DEFAULT_CONFIG.validations).forEach((k) => {
            defaultPayload[k] = DEFAULT_CONFIG.validations[k].enabled;
          });
          await updateSplitterValidations(defaultPayload);
        } catch (e) {
          // ignore
        }
        persistLocal({ ...DEFAULT_CONFIG });
        messageApi.success("Settings restored to default state.");
      },
    });
  };

  // -------------------------------------------------------------
  // AGENT OPERATIONS
  // -------------------------------------------------------------
  const openAddAgent = () => {
    setEditingAgent(null);
    agentForm.resetFields();
    setAgentModalOpen(true);
  };

  const openEditAgent = (agent) => {
    setEditingAgent(agent);
    agentForm.setFieldsValue({ id: agent.id, name: agent.name });
    setAgentModalOpen(true);
  };

  const handleAgentSave = async () => {
    try {
      const values = await agentForm.validateFields();
      const id = values.id.trim().toUpperCase();
      const name = values.name.trim().toUpperCase();

      if (editingAgent) {
        // Edit agent
        try {
          if (editingAgent.dbId) {
            await updateSplitterAgent(editingAgent.dbId, { name });
          }
        } catch (e) {
          console.warn("Backend update error:", e);
        }

        const updatedAgents = config.agents.map((a) =>
          a.id === editingAgent.id ? { ...a, id, name } : a
        );
        persistLocal({ ...config, agents: updatedAgents });
        messageApi.success(`Agent "${name}" updated successfully.`);
      } else {
        // Add agent
        if (config.agents.some((a) => a.id === id || a.name === name)) {
          messageApi.error(`Agent "${name}" already exists.`);
          return;
        }

        let newDbId = null;
        try {
          const res = await addSplitterAgent({ name });
          newDbId = res.data?.id;
        } catch (e) {
          console.warn("Backend add agent error:", e);
        }

        const updatedAgents = [
          ...config.agents,
          { id, dbId: newDbId, name, active: true },
        ];
        persistLocal({ ...config, agents: updatedAgents });
        setSelectedAgentId(id);
        messageApi.success(`Agent "${name}" added successfully.`);
      }

      setAgentModalOpen(false);
    } catch (e) {
      // form validation failed
    }
  };

  const handleAgentDelete = async (agent) => {
    try {
      if (agent.dbId) {
        await deleteSplitterAgent(agent.dbId);
      }
    } catch (e) {
      const errDetail = e.response?.data?.detail;
      if (errDetail) {
        messageApi.error(errDetail);
        return;
      }
    }

    const updatedAgents = config.agents.filter((a) => a.id !== agent.id);
    persistLocal({ ...config, agents: updatedAgents });
    if (selectedAgentId === agent.id) {
      setSelectedAgentId(null);
    }
    messageApi.success(`Agent "${agent.name}" removed.`);
  };

  const handleAgentToggle = (agentId, active) => {
    const updatedAgents = config.agents.map((a) =>
      a.id === agentId ? { ...a, active } : a
    );
    persistLocal({ ...config, agents: updatedAgents });
    messageApi.success(`Agent "${agentId}" ${active ? "activated" : "deactivated"}.`);
  };

  const currentSelectedAgent = config.agents.find(
    (a) => a.id === selectedAgentId || a.name === selectedAgentId
  );

  // -------------------------------------------------------------
  // LOTTERY OPERATIONS
  // -------------------------------------------------------------
  const openAddLottery = () => {
    setEditingLottery(null);
    lotteryForm.resetFields();
    setLotteryModalOpen(true);
  };

  const openEditLottery = (lottery) => {
    setEditingLottery(lottery);
    lotteryForm.setFieldsValue({
      code: lottery.code,
      prefix: lottery.prefix,
      displayName: lottery.displayName || lottery.name,
      base_date: lottery.base_date ? dayjs(lottery.base_date) : null,
      base_draw_number: lottery.base_draw_number || "0001",
    });
    setLotteryModalOpen(true);
  };

  const handleLotterySave = async () => {
    try {
      const values = await lotteryForm.validateFields();
      const code = values.code.trim();
      const prefix = values.prefix.trim().toLowerCase();
      const displayName = values.displayName.trim();

      if (editingLottery) {
        // Edit lottery
        const base_date = values.base_date
          ? (values.base_date.format
              ? values.base_date.format("YYYY-MM-DD")
              : values.base_date)
          : undefined;
        const base_draw_number = values.base_draw_number
          ? String(values.base_draw_number).trim()
          : undefined;
        try {
          await updateSplitterLottery(editingLottery.code, {
            name: displayName,
            prefix: prefix,
            base_date,
            base_draw_number,
          });
        } catch (e) {
          console.warn("Backend update lottery error:", e);
          messageApi.error(
            e?.response?.data?.detail || "Failed to update lottery on server."
          );
        }

        const updatedLotteries = config.lotteries.map((l) =>
          l.code.toLowerCase() === editingLottery.code.toLowerCase()
            ? { ...l, code, prefix, displayName, base_date, base_draw_number }
            : l
        );
        persistLocal({ ...config, lotteries: updatedLotteries });
        messageApi.success(`Lottery "${displayName}" updated.`);
      } else {
        // Add lottery
        if (
          config.lotteries.some(
            (l) => l.code.toLowerCase() === code.toLowerCase()
          )
        ) {
          messageApi.error(`Lottery "${code}" already exists.`);
          return;
        }

        try {
          const payload = {
            code,
            name: displayName,
            prefix,
          };
          if (values.base_date) {
            payload.base_date = values.base_date.format
              ? values.base_date.format("YYYY-MM-DD")
              : values.base_date;
          }
          if (values.base_draw_number) {
            payload.base_draw_number = String(values.base_draw_number).trim();
          }
          await addSplitterLottery(payload);
        } catch (e) {
          console.warn("Backend add lottery error:", e);
          messageApi.error(
            e?.response?.data?.detail || "Failed to save lottery on server."
          );
        }

        const updatedLotteries = [
          ...config.lotteries,
          { code, prefix, displayName, active: true },
        ];
        persistLocal({ ...config, lotteries: updatedLotteries });
        setSelectedLotteryCode(code);
        messageApi.success(`Lottery "${displayName}" added successfully.`);
      }

      setLotteryModalOpen(false);
    } catch (e) {
      // form validation failed
    }
  };

  const handleLotteryDelete = async (code) => {
    try {
      await deleteSplitterLottery(code);
    } catch (e) {
      const errDetail = e.response?.data?.detail;
      if (errDetail) {
        messageApi.error(errDetail);
        return;
      }
    }

    const updatedLotteries = config.lotteries.filter(
      (l) => l.code.toLowerCase() !== code.toLowerCase()
    );
    persistLocal({ ...config, lotteries: updatedLotteries });
    if (selectedLotteryCode === code) {
      setSelectedLotteryCode(null);
    }
    messageApi.success(`Lottery "${code}" removed.`);
  };

  const handleLotteryToggle = (code, active) => {
    const updatedLotteries = config.lotteries.map((l) =>
      l.code === code ? { ...l, active } : l
    );
    persistLocal({ ...config, lotteries: updatedLotteries });
    messageApi.success(`Lottery "${code}" ${active ? "enabled" : "disabled"}.`);
  };

  const currentSelectedLottery = config.lotteries.find(
    (l) => l.code.toLowerCase() === (selectedLotteryCode || "").toLowerCase()
  );

  // -------------------------------------------------------------
  // TABLES
  // -------------------------------------------------------------
  const agentColumns = [
    {
      title: "Agent ID / Name",
      dataIndex: "name",
      key: "name",
      render: (v) => (
        <Space>
          <UserOutlined style={{ color: "#1677ff" }} />
          <Text strong>{v}</Text>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "active",
      key: "active",
      width: 110,
      align: "center",
      render: (active, record) => (
        <Switch
          size="small"
          checked={active}
          onChange={(checked) => handleAgentToggle(record.id, checked)}
          checkedChildren="Active"
          unCheckedChildren="Off"
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit agent">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditAgent(record)}
            />
          </Tooltip>

          <Popconfirm
            title="Delete this agent?"
            description={`Remove agent "${record.name}" from system.`}
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleAgentDelete(record)}
          >
            <Tooltip title="Delete agent">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const lotteryColumns = [
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
      width: 100,
      render: (v) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: "File Prefix",
      dataIndex: "prefix",
      key: "prefix",
      width: 140,
      render: (v) => (
        <Tooltip title="Case-insensitive: accepts simple, capital, or mixed prefix">
          <Text code>{v}</Text>
        </Tooltip>
      ),
    },
    {
      title: "Display Name",
      dataIndex: "displayName",
      key: "displayName",
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: "Status",
      dataIndex: "active",
      key: "active",
      width: 110,
      align: "center",
      render: (active, record) => (
        <Switch
          size="small"
          checked={active}
          onChange={(checked) => handleLotteryToggle(record.code, checked)}
          checkedChildren="Active"
          unCheckedChildren="Off"
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      align: "center",
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit lottery details">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditLottery(record)}
            />
          </Tooltip>

          <Popconfirm
            title="Delete lottery?"
            description={`Remove lottery "${record.displayName}" from system.`}
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleLotteryDelete(record.code)}
          >
            <Tooltip title="Delete lottery">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // -------------------------------------------------------------
  // VALIDATIONS SECTION
  // -------------------------------------------------------------
  const validationRulesList = Object.entries(config.validations).map(
    ([key, rule]) => ({ key, ...rule })
  );

  return (
    <>
      {messageContextHolder}

      {/* Header */}
      <Card
        bordered={false}
        style={{
          marginBottom: 24,
          borderRadius: 16,
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
        }}
      >
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col>
            <Space>
              <SettingOutlined style={{ fontSize: 26, color: "#722ed1" }} />
              <div>
                <Title level={2} style={{ margin: 0 }}>
                  Splitter Settings & Management
                </Title>
                <Text type="secondary">
                  Manage agent assignments, customize lottery details (display names and prefixes), and configure system validations.
                </Text>
              </div>
            </Space>
          </Col>

          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchSettings}
                loading={loading}
              >
                Refresh
              </Button>
              <Button
                danger
                icon={<ReloadOutlined />}
                onClick={handleReset}
              >
                Reset Defaults
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Agents Management Card */}
      <Card
        bordered={false}
        style={{
          marginBottom: 24,
          borderRadius: 16,
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
        }}
        title={
          <Space>
            <RobotOutlined style={{ color: "#1677ff", fontSize: 20 }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>Agents Management</span>
            <Tag color="blue">{config.agents.length} Total</Tag>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openAddAgent}
          >
            Add New Agent
          </Button>
        }
      >
        <Row gutter={[20, 20]} style={{ marginBottom: 20 }} align="middle">
          <Col xs={24} md={10}>
            <Text strong style={{ display: "block", marginBottom: 6 }}>
              Select Agent from Dropdown to Manage:
            </Text>
            <Select
              style={{ width: "100%" }}
              placeholder="-- Select an Agent to Edit or Remove --"
              value={selectedAgentId}
              onChange={setSelectedAgentId}
              allowClear
            >
              {config.agents.map((ag) => (
                <Option key={ag.id} value={ag.id}>
                  <Space>
                    <UserOutlined />
                    <span>{ag.name}</span>
                    {!ag.active && <Tag color="default">Inactive</Tag>}
                  </Space>
                </Option>
              ))}
            </Select>
          </Col>

          {currentSelectedAgent && (
            <Col xs={24} md={14}>
              <Card
                size="small"
                style={{
                  background: "#f0f5ff",
                  borderRadius: 10,
                  borderColor: "#adc6ff",
                }}
              >
                <Row align="middle" justify="space-between">
                  <Col>
                    <Space direction="vertical" size={2}>
                      <Text strong style={{ fontSize: 15 }}>
                        Selected Agent: {currentSelectedAgent.name}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Status: {currentSelectedAgent.active ? "Active" : "Inactive"}
                      </Text>
                    </Space>
                  </Col>
                  <Col>
                    <Space>
                      <Button
                        icon={<EditOutlined />}
                        type="primary"
                        size="small"
                        onClick={() => openEditAgent(currentSelectedAgent)}
                      >
                        Edit Details
                      </Button>
                      <Popconfirm
                        title="Delete selected agent?"
                        description={`Are you sure you want to remove agent "${currentSelectedAgent.name}"?`}
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleAgentDelete(currentSelectedAgent)}
                      >
                        <Button danger size="small" icon={<DeleteOutlined />}>
                          Remove
                        </Button>
                      </Popconfirm>
                    </Space>
                  </Col>
                </Row>
              </Card>
            </Col>
          )}
        </Row>

        <Table
          rowKey="id"
          columns={agentColumns}
          dataSource={config.agents}
          pagination={false}
          size="small"
        />
      </Card>

      {/* Lotteries Management Card */}
      <Card
        bordered={false}
        style={{
          marginBottom: 24,
          borderRadius: 16,
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
        }}
        title={
          <Space>
            <TrophyOutlined style={{ color: "#fa8c16", fontSize: 20 }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>Lottery Details & Filename Prefix</span>
            <Tag color="orange">{config.lotteries.length} Lotteries</Tag>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openAddLottery}
          >
            Add New Lottery
          </Button>
        }
      >
        <Alert
          type="info"
          showIcon
          message="Case-Insensitive Prefix Matching"
          description="In upload page, lottery prefixes can be either simple or capital (e.g. 'jaya0595.DBF', 'JAYA0595.dbf', or 'Jaya0595.dbf'). The draw number is strictly verified against today's orders."
          style={{ marginBottom: 16, borderRadius: 10 }}
        />

        <Row gutter={[20, 20]} style={{ marginBottom: 20 }} align="middle">
          <Col xs={24} md={10}>
            <Text strong style={{ display: "block", marginBottom: 6 }}>
              Select Lottery to Edit Details / Prefix:
            </Text>
            <Select
              style={{ width: "100%" }}
              placeholder="-- Select a Lottery to Edit Details --"
              value={selectedLotteryCode}
              onChange={setSelectedLotteryCode}
              allowClear
            >
              {config.lotteries.map((l) => (
                <Option key={l.code} value={l.code}>
                  <Space>
                    <Tag color="blue">{l.code}</Tag>
                    <span>{l.displayName}</span>
                    <Text code style={{ fontSize: 11 }}>[{l.prefix}]</Text>
                  </Space>
                </Option>
              ))}
            </Select>
          </Col>

          {currentSelectedLottery && (
            <Col xs={24} md={14}>
              <Card
                size="small"
                style={{
                  background: "#fff7e6",
                  borderRadius: 10,
                  borderColor: "#ffd591",
                }}
              >
                <Row align="middle" justify="space-between">
                  <Col>
                    <Space direction="vertical" size={2}>
                      <Text strong style={{ fontSize: 15 }}>
                        {currentSelectedLottery.displayName} ({currentSelectedLottery.code})
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        File Prefix: <Text code>{currentSelectedLottery.prefix}</Text> (matches simple/capital in uploads)
                      </Text>
                    </Space>
                  </Col>
                  <Col>
                    <Space>
                      <Button
                        icon={<EditOutlined />}
                        type="primary"
                        size="small"
                        onClick={() => openEditLottery(currentSelectedLottery)}
                      >
                        Edit Lottery
                      </Button>
                      <Popconfirm
                        title="Delete this lottery?"
                        description={`Remove "${currentSelectedLottery.displayName}"?`}
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleLotteryDelete(currentSelectedLottery.code)}
                      >
                        <Button danger size="small" icon={<DeleteOutlined />}>
                          Remove
                        </Button>
                      </Popconfirm>
                    </Space>
                  </Col>
                </Row>
              </Card>
            </Col>
          )}
        </Row>

        <Table
          rowKey="code"
          columns={lotteryColumns}
          dataSource={config.lotteries}
          pagination={false}
          size="small"
        />
      </Card>

      {/* System Validations Card */}
      <Card
        bordered={false}
        style={{
          marginBottom: 24,
          borderRadius: 16,
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
        }}
        title={
          <Space>
            <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 20 }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>System Validation Rules</span>
            <Tag color="green">
              {validationRulesList.filter((r) => r.enabled).length} of{" "}
              {validationRulesList.length} Active
            </Tag>
          </Space>
        }
      >
        <Alert
          type="warning"
          showIcon
          message="Editable Validations Control"
          description={
            <div>
              You can tick or untick any validation below as needed.
              For example, <strong>unticking 'Require exact DBF file count'</strong> allows you to upload a ZIP archive with <strong>4 files instead of 8</strong>.
              Draw numbers remain strictly checked against the orders.
            </div>
          }
          style={{ marginBottom: 20, borderRadius: 10 }}
        />

        <Row gutter={[16, 16]}>
          {validationRulesList.map((rule) => {
            const isTicked = rule.enabled;
            return (
              <Col xs={24} key={rule.key}>
                <Card
                  size="small"
                  style={{
                    borderRadius: 12,
                    border: isTicked
                      ? "1px solid #b7eb8f"
                      : "1px solid #ffd591",
                    background: isTicked ? "#f6ffed" : "#fffbe6",
                    transition: "all 0.2s ease",
                  }}
                >
                  <Row align="middle" justify="space-between" gutter={[16, 8]}>
                    <Col flex="auto">
                      <Space align="start" size={12}>
                        {rule.locked ? (
                          <LockOutlined style={{ color: "#8c8c8c", fontSize: 18, marginTop: 4 }} />
                        ) : isTicked ? (
                          <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 18, marginTop: 4 }} />
                        ) : (
                          <CloseCircleOutlined style={{ color: "#fa8c16", fontSize: 18, marginTop: 4 }} />
                        )}
                        <div>
                          <Space>
                            <Text strong style={{ fontSize: 15 }}>
                              {rule.label}
                            </Text>
                            <Tag color={rule.page === "Upload" ? "blue" : rule.page === "Split" ? "purple" : "cyan"}>
                              {rule.page || "System"}
                            </Tag>
                            {rule.locked && (
                              <Tag color="default" style={{ fontSize: 11 }}>
                                Mandatory
                              </Tag>
                            )}
                          </Space>
                          <Paragraph
                            type="secondary"
                            style={{ margin: "4px 0 0", fontSize: 13 }}
                          >
                            {rule.description}
                          </Paragraph>
                        </div>
                      </Space>
                    </Col>

                    <Col>
                      <Tooltip
                        title={
                          rule.locked
                            ? "This rule is mandatory and cannot be disabled."
                            : isTicked
                            ? "Click to untick / disable this validation"
                            : "Click to tick / enable this validation"
                        }
                      >
                        <Switch
                          checked={isTicked}
                          disabled={rule.locked || savingValidation}
                          onChange={(checked) => handleValidationToggle(rule.key, checked)}
                          checkedChildren="Ticked"
                          unCheckedChildren="Unticked"
                        />
                      </Tooltip>
                    </Col>
                  </Row>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>

      {/* Add / Edit Agent Modal */}
      <Modal
        open={agentModalOpen}
        title={
          <Space>
            <UserOutlined />
            <span>{editingAgent ? "Edit Agent Details" : "Add New Agent"}</span>
          </Space>
        }
        onCancel={() => setAgentModalOpen(false)}
        onOk={handleAgentSave}
        okText={<><SaveOutlined /> Save Agent</>}
        centered
        destroyOnClose
      >
        <Divider style={{ margin: "12px 0 20px" }} />
        <Form form={agentForm} layout="vertical">
          <Form.Item
            name="id"
            label="Agent Code / Identifier"
            rules={[{ required: true, message: "Agent identifier is required." }]}
            tooltip="Uppercase identifier for agent (e.g. AGENT3, JAYAWAY)"
          >
            <Input
              placeholder="e.g. AGENT3"
              disabled={!!editingAgent}
              style={{ textTransform: "uppercase" }}
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="Agent Display Name"
            rules={[{ required: true, message: "Agent display name is required." }]}
            tooltip="Name displayed across splitter screens and zip outputs"
          >
            <Input placeholder="e.g. AGENT3" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add / Edit Lottery Modal */}
      <Modal
        open={lotteryModalOpen}
        title={
          <Space>
            <TrophyOutlined />
            <span>{editingLottery ? "Edit Lottery Details" : "Add New Lottery"}</span>
          </Space>
        }
        onCancel={() => setLotteryModalOpen(false)}
        onOk={handleLotterySave}
        okText={<><SaveOutlined /> Save Lottery</>}
        centered
        destroyOnClose
      >
        <Divider style={{ margin: "12px 0 20px" }} />
        <Form form={lotteryForm} layout="vertical">
          <Form.Item
            name="code"
            label="Lottery Code"
            rules={[{ required: true, message: "Lottery code is required." }]}
            tooltip="Short code used by database and order entry (e.g. jaya, ada, maha)"
          >
            <Input
              placeholder="e.g. jaya"
              disabled={!!editingLottery}
            />
          </Form.Item>

          <Form.Item
            name="prefix"
            label="File Prefix in Uploaded ZIP"
            rules={[{ required: true, message: "File prefix is required." }]}
            tooltip="Prefix in DBF filenames (e.g. 'jaya' matches jaya0595.DBF, JAYA0595.dbf, Jaya0595.dbf). Case-insensitive."
          >
            <Input placeholder="e.g. jaya" />
          </Form.Item>

          <Form.Item
            name="displayName"
            label="Display Name on Each Page"
            rules={[{ required: true, message: "Display name is required." }]}
            tooltip="Display title shown on Upload, Split, and Download pages"
          >
            <Input placeholder="e.g. NLB Jaya" />
          </Form.Item>

          <Form.Item
            name="base_date"
            label="First draw date"
            tooltip="The date this lottery starts (or its reference date). Draw number advances by +1 each calendar day from this date."
            rules={[{ required: true, message: "First draw date is required." }]}
            initialValue={dayjs()}
          >
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item
            name="base_draw_number"
            label="Starting draw number"
            tooltip="Draw number on the first draw date (e.g. 0001). Next days get 0002, 0003, …"
            rules={[{ required: true, message: "Starting draw number is required." }]}
            initialValue="0001"
          >
            <Input placeholder="0001" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default SplitterSettings;