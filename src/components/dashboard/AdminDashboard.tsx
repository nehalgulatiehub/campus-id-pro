import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatsCard } from "@/components/ui/stats-card";
import { LoadingState } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { Users, School, Building, MapPin, Search, Download, Filter, X, FileSpreadsheet } from "lucide-react";
import * as XLSX from 'xlsx';

export const AdminDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    state: "",
    district: "",
    block: "",
    school: "",
    class: "",
    section: ""
  });
  
  const [students, setStudents] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [schools, setSchools] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalSchools: 0,
    totalBlocks: 0,
    totalDistricts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStates();
    fetchStats();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (filters.state) {
      fetchDistricts(filters.state);
    } else {
      setDistricts([]);
      setBlocks([]);
      setSchools([]);
    }
  }, [filters.state]);

  useEffect(() => {
    if (filters.district) {
      fetchBlocks(filters.district);
    } else {
      setBlocks([]);
      setSchools([]);
    }
  }, [filters.district]);

  useEffect(() => {
    if (filters.block) {
      fetchSchools(filters.block);
    } else {
      setSchools([]);
    }
  }, [filters.block]);

  useEffect(() => {
    fetchStudents();
  }, [searchTerm, filters]);

  const fetchStates = async () => {
    const { data, error } = await supabase
      .from("states")
      .select("*")
      .order("name");
    
    if (error) {
      toast.error("Error fetching states");
    } else {
      setStates(data || []);
    }
  };

  const fetchDistricts = async (stateId: string) => {
    const { data, error } = await supabase
      .from("districts")
      .select("*")
      .eq("state_id", stateId)
      .order("name");
    
    if (error) {
      toast.error("Error fetching districts");
    } else {
      setDistricts(data || []);
    }
  };

  const fetchBlocks = async (districtId: string) => {
    const { data, error } = await supabase
      .from("blocks")
      .select("*")
      .eq("district_id", districtId)
      .order("name");
    
    if (error) {
      toast.error("Error fetching blocks");
    } else {
      setBlocks(data || []);
    }
  };

  const fetchSchools = async (blockId: string) => {
    const { data, error } = await supabase
      .from("schools")
      .select("*")
      .eq("block_id", blockId)
      .order("name");
    
    if (error) {
      toast.error("Error fetching schools");
    } else {
      setSchools(data || []);
    }
  };

  const fetchStats = async () => {
    try {
      const [studentsRes, schoolsRes, blocksRes, districtsRes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("schools").select("id", { count: "exact", head: true }),
        supabase.from("blocks").select("id", { count: "exact", head: true }),
        supabase.from("districts").select("id", { count: "exact", head: true })
      ]);

      setStats({
        totalStudents: studentsRes.count || 0,
        totalSchools: schoolsRes.count || 0,
        totalBlocks: blocksRes.count || 0,
        totalDistricts: districtsRes.count || 0
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    let query = supabase
      .from("students")
      .select(`
        *,
        school:schools(
          name,
          code,
          block:blocks(
            name,
            district:districts(
              name,
              state:states(name)
            )
          )
        )
      `)
      .order("created_at", { ascending: false });

    // Apply search filter
    if (searchTerm) {
      query = query.ilike("srn_no", `%${searchTerm}%`);
    }

    // Apply other filters
    if (filters.school) {
      query = query.eq("school_id", filters.school);
    }
    if (filters.class) {
      query = query.eq("class", filters.class);
    }
    if (filters.section) {
      query = query.eq("section", filters.section);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      toast.error("Error fetching students");
    } else {
      setStudents(data || []);
    }
    setLoading(false);
  };

  const exportToExcel = () => {
    const exportData = students.map(student => ({
      "Student Name": student.student_name,
      "SRN No": student.srn_no,
      "Class": student.class,
      "Section": student.section,
      "Date of Birth": student.date_of_birth,
      "School": student.school?.name,
      "Block": student.school?.block?.name,
      "District": student.school?.block?.district?.name,
      "State": student.school?.block?.district?.state?.name,
      "Registration Date": new Date(student.registration_date).toLocaleDateString()
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `students_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Excel file downloaded successfully!");
  };

  const clearFilters = () => {
    setFilters({
      state: "",
      district: "",
      block: "",
      school: "",
      class: "",
      section: ""
    });
    setSearchTerm("");
  };

  if (loading) {
    return <LoadingState message="Loading dashboard data..." />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Total Students"
          value={stats.totalStudents}
          icon={<Users className="h-4 w-4" />}
          gradient="from-primary/10 to-primary/20"
        />

        <StatsCard
          title="Total Schools"
          value={stats.totalSchools}
          icon={<School className="h-4 w-4" />}
          gradient="from-accent/10 to-accent/20"
        />

        <StatsCard
          title="Total Blocks"
          value={stats.totalBlocks}
          icon={<Building className="h-4 w-4" />}
          gradient="from-success/10 to-success/20"
        />

        <StatsCard
          title="Total Districts"
          value={stats.totalDistricts}
          icon={<MapPin className="h-4 w-4" />}
          gradient="from-warning/10 to-warning/20"
        />
      </div>

      {/* Search and Filters */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter Students
          </CardTitle>
          <CardDescription>
            Search by SRN number or filter by location and class details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <label htmlFor="search" className="text-sm font-medium">Search by SRN</label>
              <Input
                id="search"
                placeholder="Enter SRN number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">State</label>
              <Select value={filters.state} onValueChange={(value) => setFilters(prev => ({ ...prev, state: value, district: "", block: "", school: "" }))}>
                <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((state: any) => (
                    <SelectItem key={state.id} value={state.id}>{state.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">District</label>
              <Select value={filters.district} onValueChange={(value) => setFilters(prev => ({ ...prev, district: value, block: "", school: "" }))} disabled={!filters.state}>
                <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Select District" />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((district: any) => (
                    <SelectItem key={district.id} value={district.id}>{district.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Block</label>
              <Select value={filters.block} onValueChange={(value) => setFilters(prev => ({ ...prev, block: value, school: "" }))} disabled={!filters.district}>
                <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Select Block" />
                </SelectTrigger>
                <SelectContent>
                  {blocks.map((block: any) => (
                    <SelectItem key={block.id} value={block.id}>{block.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">School</label>
              <Select value={filters.school} onValueChange={(value) => setFilters(prev => ({ ...prev, school: value }))} disabled={!filters.block}>
                <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Select School" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school: any) => (
                    <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Class</label>
              <Input
                placeholder="Enter class..."
                value={filters.class}
                onChange={(e) => setFilters(prev => ({ ...prev, class: e.target.value }))}
                className="transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Section</label>
              <Input
                placeholder="Enter section..."
                value={filters.section}
                onChange={(e) => setFilters(prev => ({ ...prev, section: e.target.value }))}
                className="transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={clearFilters} variant="outline" size="lg">
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
            <Button onClick={exportToExcel} variant="gradient" size="lg">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle>Students ({students.length})</CardTitle>
          <CardDescription>
            List of all students matching your search criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Photo</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead>SRN No</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>DOB</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      <EmptyState
                        icon={<Users className="h-12 w-12" />}
                        title={searchTerm ? "No students found" : "No students registered"}
                        description={searchTerm ? "Try adjusting your search criteria." : "Students will appear here once they are registered by schools."}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student: any) => (
                    <TableRow key={student.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center overflow-hidden">
                          {student.photo_url ? (
                            <img 
                              src={student.photo_url} 
                              alt={student.student_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Users className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{student.student_name}</TableCell>
                      <TableCell className="font-mono">{student.srn_no}</TableCell>
                      <TableCell>{student.class}-{student.section}</TableCell>
                      <TableCell>{student.school?.name}</TableCell>
                      <TableCell>{student.school?.block?.district?.name}</TableCell>
                      <TableCell>{new Date(student.date_of_birth).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};