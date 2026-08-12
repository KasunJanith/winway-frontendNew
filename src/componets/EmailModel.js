import React, { useMemo, useState } from "react";
import { Modal, Form, Input, Button, Row, Col, Select } from "antd";
import {
  Editor,
  EditorProvider,
  Toolbar,
  BtnBold,
  BtnItalic,
  BtnUnderline,
  BtnStrikeThrough,
  BtnBulletList,
  BtnNumberedList,
  BtnUndo,
  BtnRedo,
  BtnLink,
  BtnClearFormatting,
  BtnStyles,
} from "react-simple-wysiwyg";

const { Option } = Select;

/* ----------------------------------------------
   🔁 UTILS
---------------------------------------------- */

/* Extract nested keys */
const extractKeys = (obj, prefix = "") =>
  Object.entries(obj || {}).flatMap(([k, v]) =>
    typeof v === "object" && v !== null
      ? extractKeys(v, `${prefix}${k}.`)
      : `${prefix}${k}`,
  );
const getGenderTitle = (customer = {}) => {
  const g = (customer.Gender || "").toLowerCase();

  if (g === "male") return "Mr.";
  if (g === "female") return "Ms.";

  return ""; // fallback
};

/* Replace {{key}} with real values */
const applyTemplate = (html, data) =>
  html.replace(/{{(.*?)}}/g, (_, key) => {
    return key.split(".").reduce((o, i) => (o ? o[i] : ""), data) ?? "-";
  });

/* ----------------------------------------------
   EMAIL TEMPLATE
---------------------------------------------- */

function toProperCase(name = "") {
  return name
    .replace(/[^a-zA-Z ]/g, "") // remove commas & symbols
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getFullGreeting(customer = {}) {
  const title = getGenderTitle(customer);
  const firstName = customer.FirstName?.trim();
  const lastName = customer.LastName?.trim();

  const name =
    firstName && lastName
      ? `${firstName} ${lastName}`
      : firstName || lastName || "Valued Customer";
  return toProperCase(`Dear ${title ? title + " " : ""}${name},`);
}

const generateLoyaltyCustomeEmail = (
  body,
  customer = {},
  title,
  headerLogo,
  footerLogo,
) => {
  const renderedBody = applyTemplate(body, customer);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
</head>

<body style="margin:0; padding:0; background:#f4f4f7;  sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding:30px 0;">
        <table width="800" style="
          background:#EBF0F9;
          border-radius:18px;
          overflow:hidden;
          border:3px solid #000;
          box-shadow:0 5px 25px rgba(0,0,0,0.1);
        ">

          <!-- HEADER -->
          <tr>
            <td align="center">
              <div style="
                background:linear-gradient(135deg,#7b2ff7,#f107a3);
                padding:22px 30px;
              ">
                <table width="100%">
                  <tr>
                    <td align="left" width="70">
                      <img src="${headerLogo}" width="90" height="90" style="border-radius:8px;" />
                    </td>

                    <td align="center">
                      <h1 style="color:#fff; font-size:32px; margin:0; font-family:'Crimson Text';">
                        ${title}
                      </h1>
                    </td>

                    <td width="70"></td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px; font-size:16px; color:#333; line-height:1.6;">
             <p style="font-size:18px; font-family:'Sylfaen'; font-style:italic;">
  <strong>

   ${getFullGreeting(customer)}
  </strong>
</p>

  <p style="margin:0 0 0 0; font-family:'Sylfaen'; font-style: italic;font-size:15px;">


              ${renderedBody}</p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#D6DCE5; padding:18px 30px; color:#777;">
              <table width="100%">
                <tr>
                  <td align="left">
                    <strong>
                      © ${new Date().getFullYear()} ThinkCube Systems (Pvt) Ltd.<br/>
                      📞 0707884884 | 0722884884
                    </strong>
                    <br/>
                    <a href="https://www.winway.lk">www.winway.lk</a> |
                    <a href="https://www.884.lk">www.884.lk</a>
                  </td>

                  <td align="right" width="60">
                    <img src="${footerLogo}" width="55" height="55" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

/* ----------------------------------------------
   MAIN COMPONENT
---------------------------------------------- */
const EmailModal = ({
  open,
  onClose,
  onSend,
  headerLogo,
  footerLogo,
  customers,
}) => {
  const [form] = Form.useForm();
  const [editorValue, setEditorValue] = useState("");
  const [title, setTitle] = useState("Loyalty Rewards Program");

  /* 🔽 Dynamic keys from CustomerInfo */
  const templateKeys = useMemo(() => {
    if (!customers.length) return [];
    return extractKeys(customers[0].CustomerInfo);
  }, [customers]);

  /* 📩 Submit */
  const handleSubmit = () => {
    form.validateFields().then((values) => {
      onSend({
        subject: values.subject,
        body: editorValue,
        title,
      });

      // setEditorValue("");
    });
  };

  /* 🧹 Clear */
  const clearEditor = () => {
    setEditorValue("");
    setTitle("Loyalty Rewards Program");
    form.resetFields();
  };

  /* 🖼 Preview HTML */
  const previewHtml = useMemo(() => {
    if (!customers.length) return "";
    return generateLoyaltyCustomeEmail(
      editorValue,
      customers[0].CustomerInfo,
      title,
      headerLogo,
      footerLogo,
    );
  }, [editorValue, customers, title, headerLogo, footerLogo]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={1400}
      centered
      title={
        <div
          style={{
            background: "linear-gradient(90deg,#001529,#00509e)",
            color: "white",
            padding: "18px 0",
            margin: "-24px -24px 16px -24px",
            textAlign: "center",
            fontWeight: 700,
            fontSize: 20,
            borderBottom: "3px solid #7b2ff7",
          }}
        >
          Send Custom Email
        </div>
      }
      footer={[
        <Button key="clear" danger onClick={clearEditor}>
          Clear
        </Button>,
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="send"
          type="primary"
          onClick={handleSubmit}
          style={{ background: "#7b2ff7", borderColor: "#7b2ff7" }}
        >
          Send
        </Button>,
      ]}
    >
      <Row gutter={20}>
        {/* LEFT */}
        <Col span={8}>
          <Form form={form} layout="vertical">
            <Form.Item
              label="Subject"
              name="subject"
              rules={[{ required: true, message: "Subject is required" }]}
            >
              <Input />
            </Form.Item>

            <Form.Item label="Email Title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </Form.Item>

            <Form.Item label="Insert Dynamic Field">
              <Select
                showSearch
                placeholder="Select field"
                onSelect={(v) => setEditorValue((prev) => `${prev} {{${v}}}`)}
              >
                {templateKeys.map((k) => (
                  <Option key={k} value={k}>
                    {k}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label="Email Body" required>
              <EditorProvider>
                <Editor
                  value={editorValue}
                  onChange={(e) => setEditorValue(e.target.value)}
                  style={{ height: 350, background: "#fff" }}
                >
                  <Toolbar>
                    <BtnBold />
                    <BtnItalic />
                    <BtnUnderline />
                    <BtnStrikeThrough />
                    <BtnStyles />
                    <BtnBulletList />
                    <BtnNumberedList />
                    <BtnLink />
                    <BtnUndo />
                    <BtnRedo />
                    <BtnClearFormatting />
                  </Toolbar>
                </Editor>
              </EditorProvider>
            </Form.Item>
          </Form>
        </Col>

        {/* RIGHT */}
        <Col span={16}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Preview</div>
          <iframe
            title="Email Preview"
            srcDoc={previewHtml}
            style={{
              width: "100%",
              height: 500,
              border: "1px solid #ccc",
              borderRadius: 8,
              background: "white",
            }}
          />
        </Col>
      </Row>
    </Modal>
  );
};

export default EmailModal;
