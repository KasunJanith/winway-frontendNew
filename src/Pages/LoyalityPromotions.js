import { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Tag,
  Space,
  message,
  Typography,
  Divider,
  Card,
  Image,
  Popconfirm,
  Row,
  Col,
  Upload,
} from "antd";
import { InboxOutlined } from "@ant-design/icons";
import axios from "axios";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Title, Text } = Typography;

const API_BASE = "http://localhost:8001/api/loyalCustomer";

const TIER_OPTIONS = ["Blue", "Silver", "Gold", "Platinum"];

const PROMO_TYPES = [
  { label: "Loyalty Only", value: "LOYAL" },
  { label: "General (Public)", value: "GENERAL" },
];

const tierColors = {
  Blue: "blue",
  Silver: "geekblue",
  Gold: "gold",
  Platinum: "purple",
};

const LoyalityPromotions = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [file, setFile] = useState(null);
  const [search, setSearch] = useState("");
  const [form] = Form.useForm();

  /* =======================
     FETCH PROMOTIONS
  ======================== */
  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/getAllPromotions`);
      setPromotions(res.data);
    } catch {
      message.error("Failed to load promotions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  /* =======================
     OPEN MODAL
  ======================== */
  const openModal = (record = null) => {
    setEditing(record);
    setFile(null);
    setOpen(true);

    if (record) {
      form.setFieldsValue({
        promotion_code: record.promotion_code,
        title: record.title,
        description: record.description,
        terms_conditions: record.terms_conditions,
        status: record.status,
        type: record.type,
        dateRange: [dayjs(record.start_date), dayjs(record.end_date)],
        eligible_tiers: record.eligible_tiers
          ? JSON.parse(record.eligible_tiers)
          : [],
      });
    } else {
      form.resetFields();
    }
  };

  /* =======================
     SUBMIT FORM
  ======================== */
  const onFinish = async (values) => {
    const formData = new FormData();

    const promotionCode = editing
      ? editing.promotion_code
      : values.promotion_code;

    formData.append("promotion_code", promotionCode);
    formData.append("title", values.title);
    formData.append("description", values.description);
    formData.append(
      "start_date",
      values.dateRange[0].format("YYYY-MM-DD")
    );
    formData.append(
      "end_date",
      values.dateRange[1].format("YYYY-MM-DD")
    );
    formData.append("terms_conditions", values.terms_conditions || "");
    formData.append("status", values.status);
    formData.append("type", values.type);
    formData.append(
      "eligible_tiers",
      JSON.stringify(values.eligible_tiers)
    );

    if (file) {
      formData.append("image", file);
    }

    try {
      if (editing) {
        await axios.put(`${API_BASE}/updatePromotion`, formData);
        message.success("Promotion updated successfully");
      } else {
        await axios.post(`${API_BASE}/createPromotion`, formData);
        message.success("Promotion created successfully");
      }

      setOpen(false);
      fetchPromotions();
    } catch (err) {
      message.error(err.response?.data?.error || "Action failed");
    }
  };

  /* =======================
     DEACTIVATE
  ======================== */
  const deactivate = async (id) => {
    await axios.patch(`${API_BASE}/deactivatePromotion/${id}/deactivate`);
    message.success("Promotion deactivated");
    fetchPromotions();
  };

  /* =======================
     FILTER
  ======================== */
  const filteredPromotions = promotions.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.promotion_code.toLowerCase().includes(search.toLowerCase())
  );

  const computeStatus = (promo) => {
    if (dayjs().isAfter(dayjs(promo.end_date))) return "EXPIRED";
    return promo.status;
  };

  /* =======================
     TABLE COLUMNS
  ======================== */
  const columns = [
    {
      title: "Code",
      dataIndex: "promotion_code",
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: "Title",
      dataIndex: "title",
    },
    {
      title: "Type",
      dataIndex: "type",
      render: (type) => (
        <Tag color={type === "LOYAL" ? "purple" : "blue"}>
          {type}
        </Tag>
      ),
    },
    {
      title: "Eligible Tiers",
      dataIndex: "eligible_tiers",
      render: (tiers) =>
        tiers ? (
          JSON.parse(tiers).map((t) => (
            <Tag key={t} color={tierColors[t]}>
              {t}
            </Tag>
          ))
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Period",
      render: (_, r) => {
        const daysLeft = dayjs(r.end_date).diff(dayjs(), "day");
        return (
          <>
            <Text type="secondary">
              {r.start_date} → {r.end_date}
            </Text>
            {daysLeft >= 0 && daysLeft <= 3 && (
              <Tag color="red" style={{ marginLeft: 8 }}>
                Ends in {daysLeft} days
              </Tag>
            )}
          </>
        );
      },
    },
    {
      title: "Image",
      render: (_, r) =>
        r.image ? (
          <Image
            width={70}
            height={45}
            src={`${API_BASE}/promotions/image/${r.promotion_code}`}
            style={{ borderRadius: 6 }}
            preview
          />
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Status",
      render: (_, r) => {
        const status = computeStatus(r);
        const colors = {
          ACTIVE: "green",
          INACTIVE: "default",
          EXPIRED: "red",
        };
        return (
          <Tag color={colors[status]} style={{ fontWeight: 600 }}>
            {status}
          </Tag>
        );
      },
    },
    {
      title: "Actions",
      render: (_, r) => (
        <Space>
          <Button
            type="link"
            disabled={dayjs(r.end_date).isBefore(dayjs())}
            onClick={() => openModal(r)}
          >
            Edit
          </Button>

          {r.status === "ACTIVE" && (
            <Popconfirm
              title="Deactivate this promotion?"
              description="This will make it unavailable immediately."
              onConfirm={() => deactivate(r.id)}
            >
              <Button danger type="link">
                Deactivate
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Title level={3}>Loyalty Promotions</Title>
      <Text type="secondary">
        Manage loyalty and public promotions
      </Text>

      <Divider />

      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Search by code or title"
          allowClear
          style={{ width: 300 }}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="primary" onClick={() => openModal()}>
          + Add Promotion
        </Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredPromotions}
        loading={loading}
        bordered
        pagination={{ pageSize: 6 }}
      />

      {/* MODAL */}
      <Modal
        title={editing ? "Edit Promotion" : "Add Promotion"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? "Update Promotion" : "Create Promotion"}
        width={760}
        destroyOnClose
      >
        <Form layout="vertical" form={form} onFinish={onFinish}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="promotion_code"
                label="Promotion Code"
                rules={[{ required: true }]}
              >
                <Input disabled={!!editing} />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item
                name="status"
                label="Status"
                rules={[{ required: true }]}
              >
                <Select>
                  <Select.Option value="ACTIVE">ACTIVE</Select.Option>
                  <Select.Option value="INACTIVE">INACTIVE</Select.Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item
                name="type"
                label="Promotion Type"
                rules={[{ required: true }]}
              >
                <Select>
                  {PROMO_TYPES.map((t) => (
                    <Select.Option key={t.value} value={t.value}>
                      {t.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true }]}
          >
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="Promotion Period"
            rules={[{ required: true }]}
          >
            <RangePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="eligible_tiers"
            label="Eligible Tiers"
            rules={[{ required: true }]}
          >
            <Select mode="multiple">
              {TIER_OPTIONS.map((tier) => (
                <Select.Option key={tier} value={tier}>
                  {tier}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Promotion Image">
            <Upload.Dragger
              maxCount={1}
              beforeUpload={(file) => {
                setFile(file);
                return false;
              }}
              accept="image/*"
            >
              <InboxOutlined />
              <p>Click or drag image to upload</p>
            </Upload.Dragger>
          </Form.Item>

          {editing && (
            <Image
              src={`${API_BASE}/promotions/image/${editing.promotion_code}`}
              width={140}
              style={{ borderRadius: 6, marginBottom: 12 }}
            />
          )}

          <Form.Item name="terms_conditions" label="Terms & Conditions">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default LoyalityPromotions;
