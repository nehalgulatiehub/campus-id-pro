import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StudentForm } from "@/components/students/StudentForm";
import { StatsCard } from "@/components/ui/stats-card";
import { LoadingState } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { Users, Plus, Edit, Trash2, Download, Eye, FileSpreadsheet, Camera, GraduationCap } from "lucide-react";
import * as XLSX from 'xlsx';

interface SchoolDashboardProps {
  userProfile: any;
}

export const SchoolDashboard = ({ userProfile }: SchoolDashboardProps) => {
  const [students, setStudents] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile?.school_id) {
      fetchStudents();
    }
  }, [userProfile?.school_id]);

  const fetchStudents = async () => {
    if (!userProfile?.school_id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("school_id", userProfile.school_id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Error fetching students");
      console.error("Error:", error);
    } else {
      setStudents(data || []);
    }
    setLoading(false);
  };

  const handleStudentSaved = () => {
    fetchStudents();
    setShowAddForm(false);
    setEditingStudent(null);
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;

    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", studentId);

    if (error) {
      toast.error("Error deleting student");
    } else {
      toast.success("Student deleted successfully");
      fetchStudents();
    }
  };

  const exportToExcel = () => {
    const exportData = students.map(student => ({
      "Student Name": student.student_name,
      "SRN No": student.srn_no,
      "Class": student.class,
      "Section": student.section,
      "Date of Birth": student.date_of_birth,
      "School": userProfile?.school?.name,
      "Block": userProfile?.school?.block?.name,
      "Registration Date": new Date(student.registration_date).toLocaleDateString(),
      "Photo Filename": student.photo_url ? `${student.srn_no}.jpg` : "No photo"
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `${userProfile?.school?.name}_students_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Excel file downloaded successfully!");
  };

  if (loading) {
    return <LoadingState message="Loading students..." />;
  }

  const studentsWithPhotos = students.filter(s => s.photo_url).length;
  const uniqueClasses = new Set(students.map(s => s.class));

  return (
    <div className="space-y-6">
      {/* School Info */}
      <Card className="bg-gradient-to-r from-primary/10 via-background to-accent/10 border-primary/20 card-hover">
        <CardHeader>
          <CardTitle className="text-2xl gradient-text">Welcome to {userProfile?.school?.name}</CardTitle>
          <p className="text-lg text-muted-foreground">
            {userProfile?.school?.block?.name} Block, {userProfile?.school?.block?.district?.name} District
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard
              title="Total Students"
              value={students.length}
              icon={<Users className="h-4 w-4" />}
              gradient="from-primary/10 to-primary/20"
            />

            <StatsCard
              title="Students with Photos"
              value={studentsWithPhotos}
              icon={<Camera className="h-4 w-4" />}
              gradient="from-success/10 to-success/20"
            />

            <StatsCard
              title="Total Classes"
              value={uniqueClasses.size}
              icon={<GraduationCap className="h-4 w-4" />}
              gradient="from-warning/10 to-warning/20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogTrigger asChild>
            <Button variant="gradient" size="lg" data-add-student>
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
            </DialogHeader>
            <StudentForm
              schoolId={userProfile?.school_id}
              onSaved={handleStudentSaved}
              onCancel={() => setShowAddForm(false)}
            />
          </DialogContent>
        </Dialog>

        <Button 
          onClick={exportToExcel}
          variant="success"
          size="lg"
          disabled={students.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export to Excel
        </Button>
      </div>

      {/* Students List */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <p className="text-muted-foreground">
            Manage student information and ID cards
          </p>
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
                  <TableHead>Section</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      <EmptyState
                        icon={<Users className="h-12 w-12" />}
                        title="No students yet"
                        description="Get started by adding your first student to begin managing ID cards."
                        action={{
                          label: "Add First Student",
                          onClick: () => setShowAddForm(true)
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student: any) => (
                    <TableRow key={student.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                          {student.photo_url ? (
                            <img 
                              src={student.photo_url} 
                              alt={student.student_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Users className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{student.student_name}</TableCell>
                      <TableCell className="font-mono">{student.srn_no}</TableCell>
                      <TableCell>{student.class}</TableCell>
                      <TableCell>{student.section}</TableCell>
                      <TableCell>{new Date(student.date_of_birth).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setEditingStudent(student)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Edit Student</DialogTitle>
                              </DialogHeader>
                              {editingStudent && (
                                <StudentForm
                                  schoolId={userProfile?.school_id}
                                  student={editingStudent}
                                  onSaved={handleStudentSaved}
                                  onCancel={() => setEditingStudent(null)}
                                />
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleDeleteStudent(student.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
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