import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuthGuard } from "./components/AuthGuard";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Analyze } from "./pages/Analyze";
import { Chat } from "./pages/Chat";
import { Rag } from "./pages/Rag";
import { Alerts } from "./pages/Alerts";

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Login />} />
          <Route element={<AuthGuard />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analyze" element={<Analyze />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/rag" element={<Rag />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
