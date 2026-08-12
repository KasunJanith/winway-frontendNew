import { useEffect, useMemo, useState } from "react";
import {
  Table,
  Tag,
  Typography,
  Input,
  Button,
  Space,
  Select,
  message,
} from "antd";
import {
  DownloadOutlined,
  ReloadOutlined,
  SearchOutlined,
  FileExcelOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import { getMonthlyUpgrades } from "../api/endPoints";

const { Title, Text } = Typography;

/* =========================
   CONSTANTS
========================= */

const tierColors = {
  Platinum: "purple",
  Gold: "gold",
  Silver: "silver",
  Blue: "blue",
  Warning: "default",
};

/* =========================
   DATA SHAPER (PIVOT)
========================= */
const pivotMonthlyData = (raw = []) => {
  const data = Array.isArray(raw) ? raw : [];

  const monthsSet = new Set();
  const rowsMap = {};

  data.forEach((item) => {
    const mobile = item.MobileNumber;
    const month = item.Last_Update;
    if (!mobile || !month) return;

    monthsSet.add(month);

    if (!rowsMap[mobile]) {
      rowsMap[mobile] = {
        key: mobile,
        mobile,
      };
    }

    rowsMap[mobile][month] = {
      tier: item.Month_Tier,
      tickets: Number(item.Monthly_Ticket_Count) || 0,
    };
  });

  return {
    rows: Object.values(rowsMap),
    months: Array.from(monthsSet), // keep original order
  };
};

/* =========================
   CSV DOWNLOAD
========================= */
const downloadCSV = (rows, months) => {
  const headers = ["Mobile Number", ...months];
  const csv = [headers.join(",")];

  rows.forEach((row) => {
    csv.push(
      [
        row.mobile,
        ...months.map((m) =>
          row[m] ? `${row[m].tier} (${row[m].tickets})` : "-"
        ),
      ].join(",")
    );
  });

  const blob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "monthly_loyalty_upgrades.csv";
  link.click();
};

/* =========================
   EXCEL DOWNLOAD
========================= */
const downloadExcel = (rows, months) => {
  const data = rows.map((row) => {
    const obj = { MobileNumber: row.mobile };
    months.forEach((m) => {
      obj[m] = row[m] ? `${row[m].tier} (${row[m].tickets})` : "";
    });
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Monthly Upgrades");
  XLSX.writeFile(wb, "monthly_loyalty_upgrades.xlsx");
};

/* =========================
   COMPONENT
========================= */

const MonthlyUpgradesTable = () => {
  const [rows, setRows] = useState([]);
  const [months, setMonths] = useState([]);
  const [visibleMonths, setVisibleMonths] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  /* =========================
     LOAD DATA
  ========================= */
  const loadData = () => {
    setLoading(true);

    getMonthlyUpgrades()
      .then((res) => {
        const list =
          res.data?.data ||
          res.data?.result ||
          res.data?.monthlyUpgrades ||
          res.data ||
          [];

        const { rows, months } = pivotMonthlyData(list);

        setRows(rows);
        setMonths(months);
        setVisibleMonths(months);
        setSelectedRowKeys([]);

        message.success("Monthly upgrades loaded");
      })
      .catch(() => message.error("Failed to load monthly upgrades"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  /* =========================
     FILTERED ROWS
  ========================= */
  const filteredRows = useMemo(() => {
    if (!search) return rows;
    return rows.filter((r) =>
      String(r.mobile).includes(search.trim())
    );
  }, [rows, search]);

  /* =========================
     MONTH ORDER:
     ENTRY MONTH FIRST
  ========================= */
  const orderedMonths = useMemo(() => {
    if (!visibleMonths.length) return [];

    const entryMonth = visibleMonths.find((m) => m === "Entry");
    const rest = visibleMonths.filter((m) => m !== "Entry");

    return entryMonth ? ["Entry", ...rest] : rest;
  }, [visibleMonths]);

  /* =========================
     COLUMNS
  ========================= */
  const columns = useMemo(() => {
    const mobileColumn = {
      title: "Mobile Number",
      dataIndex: "mobile",
      key: "mobile",
      width: 180,
      fixed: "left",
    };

    const monthColumns = orderedMonths.map((month) => ({
      title: month === "Entry" ? "Entry" : month.replace("_", " "),
      dataIndex: month,
      key: month,
      align: "center",
      width: 180,
      render: (value) =>
        value ? (
          <Tag color={tierColors[value.tier] || "default"}>
            {value.tier} ({value.tickets})
          </Tag>
        ) : (
          "–"
        ),
    }));

    return [mobileColumn, ...monthColumns];
  }, [orderedMonths]);

  /* =========================
     ROW SELECTION
  ========================= */
  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
  };

  const exportRows = selectedRowKeys.length
    ? filteredRows.filter((r) => selectedRowKeys.includes(r.key))
    : filteredRows;

  return (
    <div>
      <Title level={4}>Monthly Loyalty Upgrades</Title>

      {/* ================= ACTION BAR ================= */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search mobile number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ width: 240 }}
        />

        <Select
          mode="multiple"
          placeholder="Visible months"
          value={visibleMonths}
          onChange={setVisibleMonths}
          options={months.map((m) => ({
            label: m === "Entry" ? "Entry" : m.replace("_", " "),
            value: m,
          }))}
          style={{ minWidth: 280 }}
        />

        <Button icon={<ReloadOutlined />} onClick={loadData}>
          Refresh
        </Button>

        <Button
          icon={<DownloadOutlined />}
          onClick={() => downloadCSV(exportRows, orderedMonths)}
        >
          CSV
        </Button>

        <Button
          icon={<FileExcelOutlined />}
          type="primary"
          onClick={() => downloadExcel(exportRows, orderedMonths)}
        >
          Excel
        </Button>

        <Button
          icon={<PrinterOutlined />}
          onClick={() => window.print()}
        >
          Print
        </Button>
      </Space>

      {/* ================= TABLE ================= */}
      <Table
        columns={columns}
        dataSource={filteredRows}
        loading={loading}
        bordered
        sticky
        rowSelection={rowSelection}
        scroll={{ x: "max-content", y: 520 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ["5", "10", "20", "50", "100"],
        }}
      />
    </div>
  );
};

export default MonthlyUpgradesTable;
