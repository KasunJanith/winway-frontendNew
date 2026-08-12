import React, { useEffect, useState } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  message,
  Alert,
} from "antd";
import {
  LockOutlined,
  ArrowRightOutlined,
  LogoutOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import axios from "axios";
import winwayLogo from "../../assets/logo.png";
import winwayLeft from "../../assets/back.png";
import { useNavigate } from "react-router-dom";

import { ENV } from "../../config/env";

const API_BASE = ENV.API_BASE_LOCAL;

const { Title, Text } = Typography;

const ChangePassword = () => {
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();

  const tempToken = localStorage.getItem("tempToken");
  const name = localStorage.getItem("name");
  const email = localStorage.getItem("email");

  useEffect(() => {
    if (!tempToken) {
      messageApi.open({
        type: "error",
        content: "Please login first.",
      });

      navigate("/", { replace: true });
    }
  }, [tempToken, navigate, messageApi]);

  const handleChangePassword = async (values) => {
    try {
      setLoading(true);

      await axios.patch(
        `${API_BASE}/users/change-first-password`,
        {
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${tempToken}`,
          },
        }
      );

      localStorage.removeItem("tempToken");
      localStorage.removeItem("token");

      messageApi.open({
        type: "success",
        content: "Password changed successfully. Please login again.",
      });

      setTimeout(() => {
        navigate("/", { replace: true });
      }, 800);
    } catch (err) {
      console.error("Change password error:", err);

      messageApi.open({
        type: "error",
        content:
          err.response?.data?.message ||
          "Failed to change password. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    localStorage.removeItem("tempToken");
    localStorage.removeItem("token");
    localStorage.removeItem("id");
    localStorage.removeItem("name");
    localStorage.removeItem("email");
    localStorage.removeItem("role");
    localStorage.removeItem("status");

    navigate("/", { replace: true });
  };

  return (
    <>
      {contextHolder}

      <style>
        {`
          .change-password-page {
            min-height: 100vh;
            display: flex;
            background: radial-gradient(circle at top left, #fff0fb 0%, #ffffff 35%, #f8f5ff 100%);
            overflow: hidden;
          }

          .change-password-left {
            flex: 1.1;
            position: relative;
            background-image: url(${winwayLeft});
            background-size: cover;
            background-position: center;
            display: flex;
            align-items: flex-end;
            padding: 60px;
            overflow: hidden;
          }

          .change-password-left::before {
            content: "";
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, rgba(0, 21, 41, 0.25), rgba(106, 27, 154, 0.28));
          }

          .change-password-left::after {
            content: "";
            position: absolute;
            top: 0;
            right: 0;
            width: 180px;
            height: 100%;
            background: linear-gradient(to right, rgba(255,255,255,0), #ffffff);
          }

          .left-content {
            position: relative;
            z-index: 2;
            max-width: 460px;
            color: white;
          }

          .left-card {
            padding: 26px;
            border-radius: 24px;
            background: rgba(0, 21, 41, 0.48);
            backdrop-filter: blur(8px);
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
          }

          .change-password-right {
            flex: 0.9;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
            position: relative;
          }

          .change-password-card {
            width: 430px;
            border-radius: 28px !important;
            background: rgba(255, 255, 255, 0.92) !important;
            border: 1px solid rgba(255,255,255,0.75) !important;
            box-shadow: 0 24px 70px rgba(123, 47, 247, 0.18), 0 10px 30px rgba(241, 7, 163, 0.12) !important;
            backdrop-filter: blur(12px);
          }

          .change-password-logo-wrap {
            width: 92px;
            height: 92px;
            border-radius: 24px;
            margin: 0 auto 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, rgba(123,47,247,0.10), rgba(241,7,163,0.10), rgba(255,215,64,0.20));
            box-shadow: inset 0 0 0 1px rgba(255,255,255,0.8);
          }

          .change-password-logo {
            width: 70px;
            height: 70px;
            object-fit: contain;
          }

          .change-password-input {
            border-radius: 14px !important;
            padding: 11px 14px !important;
            border: 1px solid #ddd !important;
            background: #ffffff !important;
          }

          .main-action-btn {
            height: 48px;
            border-radius: 15px !important;
            border: none !important;
            color: #fff !important;
            font-weight: 800 !important;
            background: linear-gradient(135deg, #7b2ff7, #f107a3, #ffd740) !important;
            box-shadow: 0 12px 24px rgba(241, 7, 163, 0.23);
          }

          .main-action-btn:hover {
            transform: translateY(-1px);
            opacity: 0.95;
          }

          .secondary-action-btn {
            height: 44px;
            border-radius: 14px !important;
            font-weight: 700 !important;
            color: #6a1b9a !important;
          }

          @media (max-width: 900px) {
            .change-password-page {
              display: block;
            }

            .change-password-left {
              display: none;
            }

            .change-password-right {
              min-height: 100vh;
              padding: 22px;
            }

            .change-password-card {
              width: 100%;
              max-width: 430px;
            }
          }
        `}
      </style>

      <div className="change-password-page">
        <div className="change-password-left">
          <div className="left-content">
            <div className="left-card">
              <Title
                level={2}
                style={{
                  color: "#fff",
                  marginBottom: 8,
                  fontWeight: 900,
                }}
              >
                Secure Your Account
              </Title>

              <Text
                style={{
                  color: "rgba(255,255,255,0.88)",
                  fontSize: 15,
                  lineHeight: 1.7,
                }}
              >
                For your account safety, please replace your temporary password
                with a new private password before accessing the WinWay
                dashboard.
              </Text>
            </div>
          </div>
        </div>

        <div className="change-password-right">
          <Card className="change-password-card" hoverable>
            <div className="change-password-logo-wrap">
              <img
                src={winwayLogo}
                alt="WinWay Logo"
                className="change-password-logo"
              />
            </div>

            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <SafetyOutlined
                style={{
                  fontSize: 34,
                  color: "#7b2ff7",
                  marginBottom: 8,
                }}
              />

              <Title
                level={3}
                style={{
                  textAlign: "center",
                  color: "#32104f",
                  fontWeight: 900,
                  marginBottom: 4,
                }}
              >
                Change Password
              </Title>

              <Text
                style={{
                  display: "block",
                  textAlign: "center",
                  color: "#777",
                  marginBottom: 6,
                }}
              >
                Please create a new password to continue.
              </Text>
            </div>

            <Alert
              type="info"
              showIcon
              style={{
                marginBottom: 22,
                borderRadius: 14,
              }}
              message={
                <span>
                  Logged in as <strong>{name || email}</strong>
                </span>
              }
            />

            <Form layout="vertical" onFinish={handleChangePassword}>
              <Form.Item
                name="currentPassword"
                label={
                  <span style={{ color: "#333" }}>
                    Current Temporary Password
                  </span>
                }
                rules={[
                  {
                    required: true,
                    message: "Please enter your current temporary password.",
                  },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: "#7b2ff7" }} />}
                  placeholder="Enter current password"
                  size="large"
                  className="change-password-input"
                />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label={<span style={{ color: "#333" }}>New Password</span>}
                rules={[
                  {
                    required: true,
                    message: "Please enter your new password.",
                  },
                  {
                    min: 6,
                    message: "Password must be at least 6 characters.",
                  },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: "#7b2ff7" }} />}
                  placeholder="Enter new password"
                  size="large"
                  className="change-password-input"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label={
                  <span style={{ color: "#333" }}>Confirm New Password</span>
                }
                dependencies={["newPassword"]}
                rules={[
                  {
                    required: true,
                    message: "Please confirm your new password.",
                  },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("newPassword") === value) {
                        return Promise.resolve();
                      }

                      return Promise.reject(
                        new Error(
                          "New password and confirm password do not match."
                        )
                      );
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: "#7b2ff7" }} />}
                  placeholder="Confirm new password"
                  size="large"
                  className="change-password-input"
                />
              </Form.Item>

              <Button
                htmlType="submit"
                loading={loading}
                block
                size="large"
                className="main-action-btn"
                icon={<ArrowRightOutlined />}
                iconPosition="end"
              >
                Change Password
              </Button>

              <Button
                type="text"
                block
                size="large"
                className="secondary-action-btn"
                icon={<LogoutOutlined />}
                onClick={handleBackToLogin}
                style={{ marginTop: 10 }}
              >
                Back to Login
              </Button>
            </Form>

            <div
              style={{
                textAlign: "center",
                marginTop: 24,
                fontSize: 12,
                color: "#999",
              }}
            >
              © {new Date().getFullYear()} WinWay. All rights reserved.
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};

export default ChangePassword;