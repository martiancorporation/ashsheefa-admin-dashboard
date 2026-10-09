import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Download,
  Printer,
  Pencil,
  Trash2,
  Ellipsis,
  Loader2,
  ShieldPlus,
  Users,
  CalendarCheck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import API from "@/api";
import TablePagination from "@/pages/components/common/Pagination";
import { toast } from "sonner";
import { formatCardDate } from "./components/ayushman-card";
import PreviewModal from "./components/preview-modal";
import AddEditModal from "./components/add-edit-modal";
import DeleteConfirmationModal from "./components/delete-confirmation-modal";
import { downloadCardPdf, printCardDirect } from "./utils/pdf-generator";

export default function AyushmanBharatPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedGender, setSelectedGender] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    admitted: 0,
    discharged: 0,
    todayAdmissions: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState(null);
  const [previewRecord, setPreviewRecord] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);

  const [actionDropdownOpenId, setActionDropdownOpenId] = useState(null);

  // Fetch records
  const fetchRecords = async (page = currentPage) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: itemsPerPage,
        search: searchQuery,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        gender: selectedGender !== "all" ? selectedGender : undefined,
      };

      const res = await API.ayushmanBharat.getAllRecords(params);
      if (res?.success) {
        setRecords(res.data || []);
        setTotalPages(res.totalPages || 1);
      } else {
        toast.error(res?.error || "Failed to load Ayushman Bharat records");
        setRecords([]);
      }
    } catch (err) {
      console.error("Error fetching records:", err);
      toast.error("Failed to load records");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await API.ayushmanBharat.getStats();
      if (res?.success && res?.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(currentPage);
  }, [currentPage, selectedStatus, selectedGender]);

  useEffect(() => {
    fetchStats();
  }, []);

  // Search debounce / trigger
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    fetchRecords(1);
  };

  const handleRefresh = () => {
    fetchRecords(currentPage);
    fetchStats();
    toast.success("Data refreshed");
  };


  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case "admitted":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "discharged":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "under observation":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "transferred":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const statsData = [
    { name: "Total Admissions", value: stats.total, icon: ShieldPlus, color: "text-blue-600" },
    { name: "Today's Admissions", value: stats.todayAdmissions, icon: CalendarCheck, color: "text-emerald-600" },
    { name: "Active (Admitted)", value: stats.admitted, icon: Users, color: "text-blue-600" },
    { name: "Discharged", value: stats.discharged, icon: CheckCircle2, color: "text-gray-600" },
  ];

  const cell = "border-r border-gray-200 py-3 group-hover:border-blue-300 transition-colors duration-200";
  const head = "text-[#7F7F7F] font-normal border-r border-gray-200 py-3";
  const menuItem = "flex items-center px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors";
  const openAdd = () => {
    setRecordToEdit(null);
    setAddModalOpen(true);
  };

  return (
    <>
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link to="/dashboard" className="flex items-center text-gray-600">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-[1.5px] h-[15px] bg-[#7F7F7F]"></div>
          <p className="text-[#4B4B4B] font-medium">Ayushman Bharat</p>
        </div>
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        {statsData.map((data) => (
          <div
            key={data.name}
            className="w-full rounded-[10px] border border-[#D9D9D9] bg-[#F9F9F9] px-2 py-2 flex items-center gap-x-3"
          >
            <div className={`bg-[#FFFFFF] border border-[#D9D9D9] rounded-[6px] flex items-center justify-center p-1.5 ${data.color}`}>
              <data.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[#636363] text-sm">{data.name}</p>
              <p className="text-[#323232] text-[18px] font-bold">
                {statsLoading ? "..." : data.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="w-full md:w-auto flex flex-wrap items-center gap-2">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full md:w-[130px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Admitted">Admitted</SelectItem>
              <SelectItem value="Discharged">Discharged</SelectItem>
              <SelectItem value="Under Observation">Under Observation</SelectItem>
              <SelectItem value="Transferred">Transferred</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedGender} onValueChange={setSelectedGender}>
            <SelectTrigger className="w-full md:w-[130px]">
              <SelectValue placeholder="All Sex" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sex</SelectItem>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <form onSubmit={handleSearchSubmit} className="relative w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-md border border-gray-300 w-full md:w-[200px]"
            />
          </form>

          <Button
            onClick={handleRefresh}
            variant="outline"
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>

          <Button
            onClick={openAdd}
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Add Entry
          </Button>
        </div>
      </div>

      <div className="w-full h-[calc(100%-50px)] overflow-y-scroll overscroll-y-contain eme-scroll">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading records...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-2">No records found</div>
            <p className="text-gray-400">
              {searchQuery || selectedStatus !== "all" || selectedGender !== "all"
                ? "Try adjusting your search or filter criteria"
                : "No Ayushman Bharat records available yet"}
            </p>
          </div>
        ) : (
          <div className="w-full">
            <div className="w-full overflow-x-auto border border-gray-200 rounded-lg">
              <Table className="border-collapse border-0 w-full">
                <TableHeader>
                  <TableRow className="bg-gray-50 border border-gray-200">
                    <TableHead className={head}>No.</TableHead>
                    <TableHead className={head}>ID / IP No.</TableHead>
                    <TableHead className={head}>Patient Name</TableHead>
                    <TableHead className={head}>Age / Sex</TableHead>
                    <TableHead className={head}>Consultant</TableHead>
                    <TableHead className={head}>Secondary</TableHead>
                    <TableHead className={head}>DOA</TableHead>
                    <TableHead className={`${head} text-center`}>Bed No.</TableHead>
                    <TableHead className={`${head} text-center`}>Status</TableHead>
                    <TableHead className={`${head} text-center`}>Card</TableHead>
                    <TableHead className="text-[#7F7F7F] text-center font-normal py-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((rec, index) => (
                    <TableRow
                      key={rec._id}
                      className="hover:bg-blue-50 border-b border-gray-100 transition-all duration-200 hover:border-blue-200 group"
                    >
                      <TableCell className={cell}>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                      <TableCell className={cell}>{rec.patient_id}</TableCell>
                      <TableCell className={`${cell} break-words whitespace-normal max-w-[150px]`}>
                        {rec.patient_name}
                      </TableCell>
                      <TableCell className={cell}>
                        {rec.age} / {rec.gender}
                      </TableCell>
                      <TableCell className={`${cell} break-words whitespace-normal max-w-[150px]`}>
                        {rec.consultant}
                      </TableCell>
                      <TableCell className={`${cell} break-words whitespace-normal max-w-[150px]`}>
                        {rec.secondary || "-"}
                      </TableCell>
                      <TableCell className={cell}>{formatCardDate(rec.doa)}</TableCell>
                      <TableCell className={`${cell} text-center`}>{rec.bed_no || "-"}</TableCell>
                      <TableCell className={`${cell} text-center`}>
                        <Badge
                          variant="outline"
                          className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadge(rec.status)}`}
                        >
                          {rec.status || "Admitted"}
                        </Badge>
                      </TableCell>
                      <TableCell className={`${cell} text-center`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewRecord(rec)}
                          className="h-8 text-blue-600 hover:bg-blue-50 cursor-pointer"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Preview
                        </Button>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex justify-center gap-2">
                          <DropdownMenu
                            open={actionDropdownOpenId === rec._id}
                            onOpenChange={(op) => setActionDropdownOpenId(op ? rec._id : null)}
                          >
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-gray-100 cursor-pointer"
                              >
                                <Ellipsis className="h-4 w-4 text-gray-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-56 bg-white border border-gray-200 rounded-lg shadow-lg"
                            >
                              <DropdownMenuItem className={menuItem} onClick={() => downloadCardPdf(rec)}>
                                <Download className="h-4 w-4 mr-2 text-gray-500" />
                                Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem className={menuItem} onClick={() => printCardDirect(rec)}>
                                <Printer className="h-4 w-4 mr-2 text-gray-500" />
                                Print Card
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className={menuItem}
                                onClick={() => {
                                  setRecordToEdit(rec);
                                  setAddModalOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2 text-gray-500" />
                                Edit Record
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="flex items-center px-2 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                                onClick={() => setRecordToDelete(rec)}
                              >
                                <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                                Delete Record
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
            />
          </div>
        )}
      </div>

      <PreviewModal
        open={Boolean(previewRecord)}
        onOpenChange={(op) => !op && setPreviewRecord(null)}
        record={previewRecord}
      />

      <AddEditModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        recordToEdit={recordToEdit}
        onSuccess={() => {
          fetchRecords(currentPage);
          fetchStats();
        }}
      />

      <DeleteConfirmationModal
        record={recordToDelete}
        onClose={() => setRecordToDelete(null)}
        onDeleteSuccess={() => {
          fetchRecords(currentPage);
          fetchStats();
        }}
      />
    </>
  );
}
