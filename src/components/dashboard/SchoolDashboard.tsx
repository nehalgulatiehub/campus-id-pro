import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Users, Plus, FileSpreadsheet, Edit, Trash2 } from "lucide-react";
import { StudentForm } from "@/components/students/StudentForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import * as XLSX from "xlsx";

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
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Users className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* School Info */}
      <Card className="bg-gradient-to-r from-primary/10 via-background to-accent/10 border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to {userProfile?.school?.name}</CardTitle>
          <CardDescription className="text-lg">
            {userProfile?.school?.block?.name} Block, {userProfile?.school?.block?.district?.name} District
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-card rounded-lg border">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-primary">{students.length}</div>
              <div className="text-sm text-muted-foreground">Total Students</div>
            </div>
            <div className="text-center p-4 bg-card rounded-lg border">
              <FileSpreadsheet className="h-8 w-8 text-accent mx-auto mb-2" />
              <div className="text-2xl font-bold text-accent">
                {students.filter(s => s.photo_url).length}
              </div>
              <div className="text-sm text-muted-foreground">With Photos</div>
            </div>
            <div className="text-center p-4 bg-card rounded-lg border">
              <Edit className="h-8 w-8 text-success mx-auto mb-2" />
              <div className="text-2xl font-bold text-success">
                {new Set(students.map(s => s.class)).size}
              </div>
              <div className="text-sm text-muted-foreground">Classes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-hover">
              <Plus className="h-4 w-4" />
              Add New Student
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
          variant="outline" 
          className="flex items-center gap-2"
          disabled={students.length === 0}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      {/* Students List */}
      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <CardDescription>
            Manage student information and ID cards
          </CardDescription>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No students yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding your first student to the system.
              </p>
              <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add First Student
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Photo</th>
                    <th className="text-left p-3">Student Name</th>
                    <th className="text-left p-3">SRN No</th>
                    <th className="text-left p-3">Class</th>
                    <th className="text-left p-3">Section</th>
                    <th className="text-left p-3">Date of Birth</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student: any) => (
                    <tr key={student.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
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
                      </td>
                      <td className="p-3 font-medium">{student.student_name}</td>
                      <td className="p-3 font-mono">{student.srn_no}</td>
                      <td className="p-3">{student.class}</td>
                      <td className="p-3">{student.section}</td>
                      <td className="p-3">{new Date(student.date_of_birth).toLocaleDateString()}</td>
                      <td className="p-3">
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
                            variant="outline"
                            onClick={() => handleDeleteStudent(student.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};