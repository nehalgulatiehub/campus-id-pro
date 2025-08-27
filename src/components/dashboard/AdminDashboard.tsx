import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Users, Building, MapPin, FileSpreadsheet, Plus } from "lucide-react";
import * as XLSX from "xlsx";

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

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalStudents}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
            <Building className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.totalSchools}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Blocks</CardTitle>
            <MapPin className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.totalBlocks}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Districts</CardTitle>
            <MapPin className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.totalDistricts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
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
              <Label htmlFor="search">Search by SRN</Label>
              <Input
                id="search"
                placeholder="Enter SRN number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>State</Label>
              <Select value={filters.state} onValueChange={(value) => setFilters(prev => ({ ...prev, state: value, district: "", block: "", school: "" }))}>
                <SelectTrigger>
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
              <Label>District</Label>
              <Select value={filters.district} onValueChange={(value) => setFilters(prev => ({ ...prev, district: value, block: "", school: "" }))} disabled={!filters.state}>
                <SelectTrigger>
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
              <Label>Block</Label>
              <Select value={filters.block} onValueChange={(value) => setFilters(prev => ({ ...prev, block: value, school: "" }))} disabled={!filters.district}>
                <SelectTrigger>
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
              <Label>School</Label>
              <Select value={filters.school} onValueChange={(value) => setFilters(prev => ({ ...prev, school: value }))} disabled={!filters.block}>
                <SelectTrigger>
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
              <Label>Class</Label>
              <Input
                placeholder="Enter class..."
                value={filters.class}
                onChange={(e) => setFilters(prev => ({ ...prev, class: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Section</Label>
              <Input
                placeholder="Enter section..."
                value={filters.section}
                onChange={(e) => setFilters(prev => ({ ...prev, section: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={clearFilters} variant="outline">
              Clear Filters
            </Button>
            <Button onClick={exportToExcel} className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Export to Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Students ({students.length})</CardTitle>
          <CardDescription>
            List of all students matching your search criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Photo</th>
                  <th className="text-left p-2">Student Name</th>
                  <th className="text-left p-2">SRN No</th>
                  <th className="text-left p-2">Class</th>
                  <th className="text-left p-2">School</th>
                  <th className="text-left p-2">District</th>
                  <th className="text-left p-2">DOB</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student: any) => (
                  <tr key={student.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                        {student.photo_url ? (
                          <img 
                            src={student.photo_url} 
                            alt={student.student_name}
                            className="w-full h-full object-cover rounded-md"
                          />
                        ) : (
                          <Users className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </td>
                    <td className="p-2 font-medium">{student.student_name}</td>
                    <td className="p-2">{student.srn_no}</td>
                    <td className="p-2">{student.class}-{student.section}</td>
                    <td className="p-2">{student.school?.name}</td>
                    <td className="p-2">{student.school?.block?.district?.name}</td>
                    <td className="p-2">{new Date(student.date_of_birth).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {students.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No students found matching your criteria
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};