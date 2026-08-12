import React, { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

// Layouts & Pages
import DashboardLayout from "./Pages/DashboardLayout";
import FileUploadForm from "./Pages/FileUploadForm";
import ResultsView from "./Pages/ResultsView";
import Login from "./Pages/Auth/Login";
import Loyality from "./Pages/Loyality";
import MonthlyUpgrade from "./Pages/MonthlyUpgrade";
import Settings from "./Pages/Settings";
import LoyaltyCustomers from "./Pages/LoyaltyCustomers";
import LoyaltyEmails from "./Pages/LoyaltyEmails";
import Dashboard from "./Pages/DashBoardPage";
import CustomSMS from "./Pages/CustomSMS";
import CustomEmails from "./Pages/CustomEmails";
import LoyalityPromotions from "./Pages/LoyalityPromotions";
import MonthlyUpgradesTable from "./Pages/MonthlyUpgradesTable";
import FileManager from "./Pages/FileManager.js";
import WeeklyImagesManager from "./Pages/WeeklyImagesManager.js";
import RegistrationCountPage from "./Pages/RegistrationCountPage.js";
import DailySalesSummery from "./Pages/DailySalesSummery.js";
import DailyFullSummaryRecc from "./Pages/DailyFullSummaryRecc.js";
import SmsWelcome from "./SMS/SmsWelcome.js";
import ReconciliationSummary from "./Pages/DailyLastSoldTime.js";
import DailyFullSummary from "./Pages/DailyFullSummary.js";
import SuperAdminUsersPage from "./Pages/Auth/SuperAdminUsersPage.js";
import ChangePassword from "./Pages/Auth/ChangePassword";

import Overview from "./Pages/Overview";
import OrderEntry from "./Pages/OrderEntry.js";
import Assignment from "./Pages/Assignment.js";
import SplitPage from "./Pages/SplitPage.js";
import UploadPage from "./Pages/UploadPage.js";
import DownloadPage from "./Pages/DownloadPage.js";

import ResultUpload from "./Pages/ResultUpload.js";
import ResultSplit from "./Pages/ResultSplit.js";
import ResultDownload from "./Pages/ResultDownload.js";

const getDefaultTab = () => {
  const role = (localStorage.getItem("role") || "")
    .trim()
    .toLowerCase();

  const financialRoles = [
    "financial",
    "financial user",
    "financial_user",
    "financial-user",
    "finance",
  ];

  return financialRoles.includes(role) ? "10-1" : "0";
};

function App() {
  const [results, setResults] = useState(null);

  const [activeTab, setActiveTab] = useState(() => getDefaultTab());

  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    Boolean(localStorage.getItem("token")),
  );

  const navigate = useNavigate();
  const location = useLocation();

  const isLoggedIn =
    isAuthenticated || Boolean(localStorage.getItem("token"));

  const publicPaths = [
    "/login",
    "/change-password",
    "/sms/welcome",
  ];

  // Check authentication when the app loads or route changes
  useEffect(() => {
    const token = localStorage.getItem("token");
    const isPublicPath = publicPaths.includes(location.pathname);

    if (token) {
      setIsAuthenticated(true);

      // Set Financial User default tab after page refresh
      if (location.pathname === "/dashboard") {
        const defaultTab = getDefaultTab();

        if (defaultTab === "10-1") {
          setActiveTab("10-1");
        }
      }

      return;
    }

    setIsAuthenticated(false);

    if (!isPublicPath) {
      navigate("/login", { replace: true });
    }
  }, [location.pathname, navigate]);

  // Warn the user before closing or refreshing
  useEffect(() => {
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);

    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, []);

  const handleResults = (data) => {
    setResults(data);
    setActiveTab("2");
  };

  const handleLoginSuccess = () => {
    // Login.js must save token and role before calling this function
    setIsAuthenticated(true);

    const defaultTab = getDefaultTab();
    setActiveTab(defaultTab);

    navigate("/dashboard", { replace: true });
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setActiveTab("0");
    setResults(null);

    navigate("/login", { replace: true });
  };

  return (
    <Routes>
      {/* Default path */}
      <Route
        path="/"
        element={
          <Navigate
            to={isLoggedIn ? "/dashboard" : "/login"}
            replace
          />
        }
      />

      {/* Login */}
      <Route
        path="/login"
        element={
          isLoggedIn ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Login onLogin={handleLoginSuccess} />
          )
        }
      />

      {/* Public routes */}
      <Route
        path="/change-password"
        element={<ChangePassword />}
      />

      <Route
        path="/sms/welcome"
        element={<SmsWelcome />}
      />

      {/* Protected Dashboard */}
      <Route
        path="/dashboard"
        element={
          isLoggedIn ? (
            <DashboardLayout
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onLogout={handleLogout}
            >
              {activeTab === "0" && <Dashboard />}

              {activeTab === "1" && (
                <FileUploadForm setResults={handleResults} />
              )}

              {activeTab === "2" && (
                <ResultsView results={results} />
              )}

              {activeTab === "4" && <Settings />}

              {/* Loyalty */}
              {activeTab === "5-1" && <Loyality />}
              {activeTab === "5-2" && <LoyaltyCustomers />}
              {activeTab === "5-3" && <MonthlyUpgrade />}
              {activeTab === "5-4" && <LoyalityPromotions />}
              {activeTab === "5-5" && <LoyaltyEmails />}
              {activeTab === "5-7" && <MonthlyUpgradesTable />}

              {/* Custom Messages */}
              {activeTab === "6-1" && <CustomSMS />}
              {activeTab === "6-2" && <CustomEmails />}

              {/* Files and Images */}
              {activeTab === "7" && <FileManager />}
              {activeTab === "8" && <WeeklyImagesManager />}

              {/* Reports */}
              {activeTab === "9-1" && <RegistrationCountPage />}
              {activeTab === "9-2" && <DailySalesSummery />}
              {activeTab === "9-3" && <ReconciliationSummary />}
              {activeTab === "9-4" && <DailyFullSummary />}
              {activeTab === "9-5" && <DailyFullSummaryRecc />}

              {/* Super Admin */}
              {activeTab === "11" && <SuperAdminUsersPage />}

              {/* Order Management */}
              {activeTab === "10-1" && <Overview />}
              {activeTab === "10-2-1" && <OrderEntry />}
              {activeTab === "10-2-2" && <Assignment />}
              {activeTab === "10-2-3" && <UploadPage />}
              {activeTab === "10-2-4" && <SplitPage />}
              {activeTab === "10-2-5" && <DownloadPage />}

              {/* Winning Result Management */}
              {activeTab === "10-3-1" && <ResultUpload />}
              {activeTab === "10-3-2" && <ResultSplit />}
              {activeTab === "10-3-3" && <ResultDownload />}
            </DashboardLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Unknown paths */}
      <Route
        path="*"
        element={
          <Navigate
            to={isLoggedIn ? "/dashboard" : "/login"}
            replace
          />
        }
      />
    </Routes>
  );
}

export default App;