// src/pages/SuperAdminUsersPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { ENV } from "../../config/env";
const API_BASE = ENV.API_BASE_LOCAL;
const { Title, Text } = Typography;

// Change this only if your register endpoint is different
const REGISTER_ENDPOINT = `${API_BASE}/users/register`;

const ROLE_OPTIONS = [
  {
    label: "Admin",
    value: "admin",
  },
  {
    label: "Loyalty Manager",
    value: "loyalty_manager",
  },
  {
    label: "Data Analyzer",
    value: "data_analyzer",
  },
  {
    label: "Financial Sector",
    value: "financial",
  },
  {
    label: "User",
    value: "user",
  },
];

const STATUS_OPTIONS = [
  {
    label: "Pending",
    value: "pending",
  },
  {
    label: "Approved",
    value: "approved",
  },
  {
    label: "Rejected",
    value: "rejected",
  },
];

const SuperAdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingEmail, setActionLoadingEmail] = useState(null);

  const [addUserOpen, setAddUserOpen] = useState(false);
  const [addUserLoading, setAddUserLoading] = useState(false);

  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const token = localStorage.getItem("token");
  const currentRole = localStorage.getItem("role");
  const currentEmail = localStorage.getItem("email")?.trim().toLowerCase();

  const isAdmin = currentRole === "admin";

  const authHeaders = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    [token],
  );

  const loadUsers = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API_BASE}/users/all`, authHeaders);

      setUsers(res.data.data || []);
    } catch (error) {
      console.error("Load users error:", error);

      messageApi.open({
        type: "error",
        content: error.response?.data?.message || "Failed to load users.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const runAction = async (email, actionUrl, successMessage) => {
    try {
      const normalizedEmail = email?.trim().toLowerCase();
      const encodedEmail = encodeURIComponent(normalizedEmail);

      setActionLoadingEmail(normalizedEmail);

      await axios.patch(
        `${API_BASE}/users/email/${encodedEmail}/${actionUrl}`,
        {},
        authHeaders,
      );

      messageApi.open({
        type: "success",
        content: successMessage,
      });

      loadUsers();
    } catch (error) {
      console.error("User action error:", error);

      messageApi.open({
        type: "error",
        content: error.response?.data?.message || "Action failed.",
      });
    } finally {
      setActionLoadingEmail(null);
    }
  };

  const updateRole = async (email, role) => {
    try {
      const normalizedEmail = email?.trim().toLowerCase();
      const encodedEmail = encodeURIComponent(normalizedEmail);

      setActionLoadingEmail(normalizedEmail);

      await axios.patch(
        `${API_BASE}/users/email/${encodedEmail}/role`,
        { role },
        authHeaders,
      );

      messageApi.open({
        type: "success",
        content: "User role updated successfully.",
      });

      loadUsers();
    } catch (error) {
      console.error("Update role error:", error);

      messageApi.open({
        type: "error",
        content: error.response?.data?.message || "Failed to update role.",
      });
    } finally {
      setActionLoadingEmail(null);
    }
  };

  const deleteUser = async (email) => {
    try {
      const normalizedEmail = email?.trim().toLowerCase();
      const encodedEmail = encodeURIComponent(normalizedEmail);

      setActionLoadingEmail(normalizedEmail);

      await axios.delete(
        `${API_BASE}/users/email/${encodedEmail}`,
        authHeaders,
      );

      messageApi.open({
        type: "success",
        content: "User deleted successfully.",
      });

      loadUsers();
    } catch (error) {
      console.error("Delete user error:", error);

      messageApi.open({
        type: "error",
        content: error.response?.data?.message || "Failed to delete user.",
      });
    } finally {
      setActionLoadingEmail(null);
    }
  };

  const addNewUser = async (values) => {
    try {
      setAddUserLoading(true);

      const normalizedEmail = values.email?.trim().toLowerCase();

      await axios.post(
        `${API_BASE}/users/create`,
        {
          name: values.name?.trim(),
          email: normalizedEmail,
          password: values.password,
          role: values.role || "user",
          status: values.status || "approved",
        },
        authHeaders,
      );

      messageApi.open({
        type: "success",
        content:
          "User added successfully. User must change password on first login.",
      });

      form.resetFields();
      setAddUserOpen(false);
      loadUsers();
    } catch (error) {
      console.error("Add user error:", error);

      messageApi.open({
        type: "error",
        content: error.response?.data?.message || "Failed to add user.",
      });
    } finally {
      setAddUserLoading(false);
    }
  };
  const getRoleTag = (role) => {
    if (role === "admin") {
      return <Tag color="purple">Admin</Tag>;
    }

    if (role === "loyalty_manager") {
      return <Tag color="magenta">Loyalty Manager</Tag>;
    }

    if (role === "data_analyzer") {
      return <Tag color="blue">Data Analyzer</Tag>;
    }
    if (role === "financial") {
      return <Tag color="blue">Financial Officer</Tag>;
    }
    return <Tag color="default">User</Tag>;
  };

  const getStatusTag = (status) => {
    if (status === "approved") {
      return <Tag color="green">Approved</Tag>;
    }

    if (status === "rejected") {
      return <Tag color="red">Rejected</Tag>;
    }

    return <Tag color="orange">Pending</Tag>;
  };

  const columns = [
    {
      title: "User",
      key: "user",
      render: (_, record) => (
        <div>
          <Text strong>{record.name}</Text>
          <br />
          <Text type="secondary">{record.email}</Text>
        </div>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      filters: [
        { text: "Admin", value: "admin" },
        { text: "Loyalty Manager", value: "loyalty_manager" },
        { text: "Data Analyzer", value: "data_analyzer" },
        { text: "Financial Sector", value: "financial" },
        { text: "User", value: "user" },
      ],
      onFilter: (value, record) => record.role === value,
      render: (role) => getRoleTag(role),
    },
    {
      title: "Change Role",
      key: "change_role",
      width: 220,
      render: (_, record) => {
        const recordEmail = record.email?.trim().toLowerCase();
        const isSelf = recordEmail === currentEmail;
        const isRowLoading = actionLoadingEmail === recordEmail;

        return (
          <Select
            value={record.role}
            options={ROLE_OPTIONS}
            disabled={isSelf || isRowLoading}
            loading={isRowLoading}
            style={{ width: "100%" }}
            onChange={(value) => updateRole(record.email, value)}
          />
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      filters: [
        { text: "Pending", value: "pending" },
        { text: "Approved", value: "approved" },
        { text: "Rejected", value: "rejected" },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status) => getStatusTag(status),
    },
    {
      title: "Actions",
      key: "actions",
      width: 330,
      render: (_, record) => {
        const recordEmail = record.email?.trim().toLowerCase();
        const isSelf = recordEmail === currentEmail;
        const isRowLoading = actionLoadingEmail === recordEmail;

        return (
          <Space wrap>
            {record.status !== "approved" && (
              <Tooltip title="Approve user">
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={isRowLoading}
                  onClick={() =>
                    runAction(
                      record.email,
                      "approve",
                      "User approved successfully.",
                    )
                  }
                  style={{ borderRadius: 8 }}
                >
                  Approve
                </Button>
              </Tooltip>
            )}

            {record.status !== "rejected" && !isSelf && (
              <Tooltip title="Reject user">
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  loading={isRowLoading}
                  onClick={() =>
                    runAction(
                      record.email,
                      "reject",
                      "User rejected successfully.",
                    )
                  }
                  style={{ borderRadius: 8 }}
                >
                  Reject
                </Button>
              </Tooltip>
            )}

            {!isSelf && (
              <Popconfirm
                title="Delete this user?"
                description="This action cannot be undone."
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
                onConfirm={() => deleteUser(record.email)}
              >
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  loading={isRowLoading}
                  style={{ borderRadius: 8 }}
                >
                  Delete
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  if (!isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        {contextHolder}

        <Alert
          type="error"
          showIcon
          message="Access denied"
          description="Only admin users can manage system users."
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {contextHolder}

      <Card
        style={{
          borderRadius: 18,
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <Title level={3} style={{ margin: 0, color: "#6a1b9a" }}>
              System Users
            </Title>
            <Text type="secondary">
              Approve new users and manage system access roles.
            </Text>
          </div>

          <Space wrap>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddUserOpen(true)}
              style={{
                borderRadius: 10,
                background: "#6a1b9a",
                borderColor: "#6a1b9a",
              }}
            >
              Add User
            </Button>

            <Button
              icon={<ReloadOutlined />}
              onClick={loadUsers}
              loading={loading}
              style={{ borderRadius: 10 }}
            >
              Refresh
            </Button>
          </Space>
        </div>

        <Table
          rowKey="email"
          columns={columns}
          dataSource={users}
          loading={loading}
          pagination={{
            pageSize: 8,
            showSizeChanger: true,
            pageSizeOptions: ["8", "15", "25", "50"],
          }}
        />
      </Card>

      <Modal
        title="Add New User"
        open={addUserOpen}
        onCancel={() => {
          setAddUserOpen(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            role: "user",
            status: "pending",
          }}
          onFinish={addNewUser}
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[
              {
                required: true,
                message: "Please enter user name.",
              },
            ]}
          >
            <Input placeholder="Enter user name" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              {
                required: true,
                message: "Please enter email.",
              },
              {
                type: "email",
                message: "Please enter a valid email.",
              },
            ]}
          >
            <Input placeholder="Enter email address" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              {
                required: true,
                message: "Please enter password.",
              },
              {
                min: 6,
                message: "Password must be at least 6 characters.",
              },
            ]}
            hasFeedback
          >
            <Input.Password placeholder="Enter password" />
          </Form.Item>

          <Form.Item
            label="Confirm Password"
            name="confirmPassword"
            dependencies={["password"]}
            hasFeedback
            rules={[
              {
                required: true,
                message: "Please confirm password.",
              },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }

                  return Promise.reject(new Error("Passwords do not match."));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirm password" />
          </Form.Item>

          <Form.Item
            label="Role"
            name="role"
            rules={[
              {
                required: true,
                message: "Please select a role.",
              },
            ]}
          >
            <Select options={ROLE_OPTIONS} />
          </Form.Item>

          <Form.Item
            label="Status"
            name="status"
            rules={[
              {
                required: true,
                message: "Please select status.",
              },
            ]}
          >
            <Select options={STATUS_OPTIONS} />
          </Form.Item>

          <Space
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 10,
            }}
          >
            <Button
              onClick={() => {
                setAddUserOpen(false);
                form.resetFields();
              }}
            >
              Cancel
            </Button>

            <Button type="primary" htmlType="submit" loading={addUserLoading}>
              Add User
            </Button>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default SuperAdminUsersPage;
