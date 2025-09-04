// app/approvals/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Eye,
  Download,
} from "lucide-react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

type ApprovalKind = "timesheet" | "expense";
type ApprovalStatus = "pending" | "approved" | "rejected";

interface ApprovalItem {
  id: string;
  type: ApprovalKind;
  employeeName: string;
  project: string;
  amount?: number; // for expenses
  hours?: number;  // for timesheets
  date: string;
  status: ApprovalStatus;
  description: string;
}

export default function ApprovalsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"all" | "time" | "expenses">("all");

  // Demo data; replace with your fetched data later
  const [approvals, setApprovals] = useState<ApprovalItem[]>([
    {
      id: "1",
      type: "timesheet",
      employeeName: "John Smith",
      project: "Metro Hospital",
      hours: 40,
      date: "2025-01-15",
      status: "pending",
      description: "Weekly timesheet for Metro Hospital project",
    },
    {
      id: "2",
      type: "expense",
      employeeName: "Sarah Johnson",
      project: "Downtown Office",
      amount: 245.5,
      date: "2025-01-14",
      status: "pending",
      description: "Office supplies and client lunch expenses",
    },
    {
      id: "3",
      type: "timesheet",
      employeeName: "Mike Chen",
      project: "City Schools",
      hours: 38.5,
      date: "2025-01-13",
      status: "approved",
      description: "Weekly timesheet for City Schools project",
    },
  ]);

  const handleApprove = (id: string) => {
    setApprovals((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "approved" } : i))
    );
  };

  const handleReject = (id: string) => {
    setApprovals((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "rejected" } : i))
    );
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    const cfg = {
      pending: { cls: "bg-yellow-100 text-yellow-800", Icon: Clock },
      approved: { cls: "bg-green-100 text-green-800", Icon: CheckCircle },
      rejected: { cls: "bg-red-100 text-red-800", Icon: XCircle },
    }[status];

    const SIcon = cfg.Icon;
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}
      >
        <SIcon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Global counts (all items)
  const global = useMemo(() => {
    const pending = approvals.filter((i) => i.status === "pending");
    const approved = approvals.filter((i) => i.status === "approved");
    const rejected = approvals.filter((i) => i.status === "rejected");
    return { pending, approved, rejected };
  }, [approvals]);

  // Tab-scoped list
  const filtered = useMemo(() => {
    let list = approvals;
    if (tab === "time") list = approvals.filter((i) => i.type === "timesheet");
    if (tab === "expenses") list = approvals.filter((i) => i.type === "expense");
    return {
      all: list,
      pending: list.filter((i) => i.status === "pending"),
      approved: list.filter((i) => i.status === "approved"),
      rejected: list.filter((i) => i.status === "rejected"),
    };
  }, [approvals, tab]);

  // Reusable list renderer
  const PendingList = ({ items }: { items: ApprovalItem[] }) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            All Caught Up!
          </h3>
          <p className="text-gray-600">No pending approvals in this view.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-500 uppercase">
                    {item.type}
                  </span>
                  {getStatusBadge(item.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Employee</p>
                    <p className="font-medium text-gray-900">{item.employeeName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Project</p>
                    <p className="font-medium text-gray-900">{item.project}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium text-gray-900">{item.date}</p>
                  </div>
                </div>

                {item.type === "timesheet" && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">Hours</p>
                    <p className="font-medium text-gray-900">{item.hours} hours</p>
                  </div>
                )}

                {item.type === "expense" && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="font-medium text-gray-900">
                      ${item.amount?.toFixed(2)}
                    </p>
                  </div>
                )}

                <div className="mt-2">
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="text-gray-900">{item.description}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 ml-6">
                <button
                  onClick={() => handleApprove(item.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Approve</span>
                </button>
                <button
                  onClick={() => handleReject(item.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>
                <button className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Summary cards (respect the current tab’s filter)
  const Summary = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="p-3 bg-yellow-100 rounded-lg">
            <Clock className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-gray-900">
              {filtered.pending.length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="p-3 bg-green-100 rounded-lg">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Approved</p>
            <p className="text-2xl font-bold text-gray-900">
              {filtered.approved.length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center">
          <div className="p-3 bg-red-100 rounded-lg">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Rejected</p>
            <p className="text-2xl font-bold text-gray-900">
              {filtered.rejected.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ProtectedRoute allowedRoles={["client_approver"]}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                Back to Dashboard
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
                <p className="text-gray-600">Review and approve timesheets and expenses</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Pending (All)</p>
                <p className="text-lg font-bold text-yellow-600">
                  {global.pending.length}
                </p>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs + Content */}
        <div className="px-6 py-8">
          <div className="max-w-6xl mx-auto">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="mb-6">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="time">Timesheets</TabsTrigger>
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
              </TabsList>

              {/* All */}
              <TabsContent value="all" className="mt-0">
                <Summary />
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Pending Approvals (All)
                    </h2>
                    <p className="text-sm text-gray-600">
                      Review and approve pending submissions
                    </p>
                  </div>
                  <div className="p-6">
                    <PendingList items={filtered.pending} />
                  </div>
                </div>
              </TabsContent>

              {/* Timesheets */}
              <TabsContent value="time" className="mt-0">
                <Summary />
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Pending Timesheets
                    </h2>
                  </div>
                  <div className="p-6">
                    <PendingList
                      items={filtered.pending.filter((i) => i.type === "timesheet")}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Expenses */}
              <TabsContent value="expenses" className="mt-0">
                <Summary />
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Pending Expenses
                    </h2>
                  </div>
                  <div className="p-6">
                    <PendingList
                      items={filtered.pending.filter((i) => i.type === "expense")}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Recent Activity (always shows a few most recent overall) */}
            <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {approvals.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {item.employeeName} — {item.type} for {item.project}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(item.status)}
                        <span className="text-sm text-gray-500">{item.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* /Recent Activity */}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}









