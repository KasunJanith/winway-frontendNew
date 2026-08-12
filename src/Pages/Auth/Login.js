import React, { useState } from "react";
import { Card, Form, Input, Button, Typography, message } from "antd";
import {
  MailOutlined,
  LockOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import axios from "axios";
import winwayLogo from "../../assets/logo.png";
import winwayLeft from "../../assets/back.png";
import { useNavigate } from "react-router-dom";

import { ENV } from "../../config/env";

const API_BASE = ENV.API_BASE_LOCAL;

const { Title, Text } = Typography;

const Login = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();

  const handleLogin = async (values) => {
    try {
      setLoading(true);

      const res = await axios.post(`${API_BASE}/users/login`, {
        email: values.email,
        password: values.password,
      });

      const data = res.data;

      // First-time login: user must change sample password
      if (data.requiresPasswordChange) {
        localStorage.removeItem("token");

        localStorage.setItem("tempToken", data.token);
        localStorage.setItem("name", data.name || "");
        localStorage.setItem("email", data.email || "");
        localStorage.setItem("role", data.role || "");
        localStorage.setItem("status", data.status || "");

        if (data.id) {
          localStorage.setItem("id", data.id);
        }

        navigate("/change-password", { replace: true });
        return;
      }

      // Normal login
      localStorage.setItem("token", data.token);
      localStorage.setItem("name", data.name || "");
      localStorage.setItem("email", data.email || "");
      localStorage.setItem("role", data.role || "");
      localStorage.setItem("status", data.status || "");

      if (data.id) {
        localStorage.setItem("id", data.id);
      } else {
        localStorage.removeItem("id");
      }

      // Clear temporary token from any previous first-time login
      localStorage.removeItem("tempToken");

      messageApi.success(`Welcome ${data.name || ""}`);

      // App.js reads the stored role and selects:
      // Financial User -> activeTab "10-1"
      if (typeof onLogin === "function") {
        onLogin();
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      console.error("Login error:", err);

      messageApi.error(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          "Login failed! Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {contextHolder}

      <style>
        {`
          .login-page {
            min-height: 100vh;
            display: flex;
            background: radial-gradient(
              circle at top left,
              #fff0fb 0%,
              #ffffff 35%,
              #f8f5ff 100%
            );
            overflow: hidden;
          }

          .login-left {
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

          .login-left::before {
            content: "";
            position: absolute;
            inset: 0;
            background: linear-gradient(
              135deg,
              rgba(0, 21, 41, 0.25),
              rgba(106, 27, 154, 0.28)
            );
          }

          .login-left::after {
            content: "";
            position: absolute;
            top: 0;
            right: 0;
            width: 180px;
            height: 100%;
            background: linear-gradient(
              to right,
              rgba(255, 255, 255, 0),
              #ffffff
            );
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

          .login-right {
            flex: 0.9;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
            position: relative;
          }

          .login-card {
            width: 410px;
            border-radius: 28px !important;
            background: rgba(255, 255, 255, 0.92) !important;
            border: 1px solid rgba(255, 255, 255, 0.75) !important;
            box-shadow:
              0 24px 70px rgba(123, 47, 247, 0.18),
              0 10px 30px rgba(241, 7, 163, 0.12) !important;
            backdrop-filter: blur(12px);
          }

          .login-logo-wrap {
            width: 92px;
            height: 92px;
            border-radius: 24px;
            margin: 0 auto 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(
              135deg,
              rgba(123, 47, 247, 0.1),
              rgba(241, 7, 163, 0.1),
              rgba(255, 215, 64, 0.2)
            );
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.8);
          }

          .login-logo {
            width: 70px;
            height: 70px;
            object-fit: contain;
          }

          .login-input {
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
            background: linear-gradient(
              135deg,
              #7b2ff7,
              #f107a3,
              #ffd740
            ) !important;
            box-shadow: 0 12px 24px rgba(241, 7, 163, 0.23);
          }

          .main-action-btn:hover {
            transform: translateY(-1px);
            opacity: 0.95;
          }

          @media (max-width: 900px) {
            .login-page {
              display: block;
            }

            .login-left {
              display: none;
            }

            .login-right {
              min-height: 100vh;
              padding: 22px;
            }

            .login-card {
              width: 100%;
              max-width: 420px;
            }
          }
        `}
      </style>

      <div className="login-page">
        <div className="login-left">
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
                WinWay Analytics
              </Title>

              <Text
                style={{
                  color: "rgba(255,255,255,0.88)",
                  fontSize: 15,
                  lineHeight: 1.7,
                }}
              >
                Manage customer insights, loyalty performance, reports, and
                communication tools from one secure dashboard.
              </Text>
            </div>
          </div>
        </div>

        <div className="login-right">
          <Card className="login-card" hoverable>
            <div className="login-logo-wrap">
              <img src={winwayLogo} alt="WinWay Logo" className="login-logo" />
            </div>

            <Title
              level={3}
              style={{
                textAlign: "center",
                color: "#32104f",
                fontWeight: 900,
                marginBottom: 20,
              }}
            >
              Welcome Back
            </Title>

            <Form layout="vertical" onFinish={handleLogin} autoComplete="off">
              <Form.Item
                name="email"
                label={<span style={{ color: "#333" }}>Email</span>}
                rules={[
                  {
                    required: true,
                    message: "Please enter your email.",
                  },
                  {
                    type: "email",
                    message: "Please enter a valid email.",
                  },
                ]}
              >
                <Input
                  prefix={<MailOutlined style={{ color: "#7b2ff7" }} />}
                  placeholder="you@example.com"
                  size="large"
                  className="login-input"
                  autoComplete="email"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<span style={{ color: "#333" }}>Password</span>}
                rules={[
                  {
                    required: true,
                    message: "Please enter your password.",
                  },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: "#7b2ff7" }} />}
                  placeholder="Enter your password"
                  size="large"
                  className="login-input"
                  autoComplete="current-password"
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
                Sign In
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

export default Login;
