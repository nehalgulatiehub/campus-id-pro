import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle } from "lucide-react";
import * as XLSX from 'xlsx';

interface ExcelImportProps {
  schools: any[];
  onImportComplete: () => void;
}

export const ExcelImport = ({ schools, onImportComplete }: ExcelImportProps) => {
  const [selectedSchool, setSelectedSchool] = useState("");
  const [importData, setImportData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const template = [
      {
        "Student Name": "John Doe",
        "SRN No": "SRN001",
        "Class": "10",
        "Section": "A",
        "Date of Birth": "2005-05-15"
      },
      {
        "Student Name": "Jane Smith", 
        "SRN No": "SRN002",
        "Class": "10",
        "Section": "B",
        "Date of Birth": "2005-03-20"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "student_import_template.xlsx");
    toast.success("Template downloaded successfully!");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          toast.error("Excel file is empty");
          return;
        }

        // Validate required columns
        const requiredColumns = ["Student Name", "SRN No", "Class", "Section", "Date of Birth"];
        const firstRow = jsonData[0] as any;
        const missingColumns = requiredColumns.filter(col => !(col in firstRow));
        
        if (missingColumns.length > 0) {
          toast.error(`Missing required columns: ${missingColumns.join(", ")}`);
          return;
        }

        setImportData(jsonData);
        toast.success(`Loaded ${jsonData.length} student records from Excel file`);
      } catch (error) {
        toast.error("Error reading Excel file");
        console.error("Error:", error);
      }
    };
    
    reader.readAsBinaryString(file);
  };

  const validateSRN = async (srnNo: string, schoolId: string) => {
    const { data, error } = await supabase
      .from("students")
      .select("id")
      .eq("srn_no", srnNo)
      .eq("school_id", schoolId)
      .maybeSingle();

    if (error) {
      console.error("Error validating SRN:", error);
      return false;
    }

    return !data; // Return true if no existing student found
  };

  const importStudents = async () => {
    if (!selectedSchool) {
      toast.error("Please select a school");
      return;
    }

    if (importData.length === 0) {
      toast.error("Please upload an Excel file first");
      return;
    }

    setImporting(true);
    setProgress(0);
    setResults(null);

    const totalRecords = importData.length;
    let successfulRecords = 0;
    let failedRecords = 0;
    const errors: string[] = [];

    try {
      // Get current user for logging
      const { data: { user } } = await supabase.auth.getUser();

      for (let i = 0; i < importData.length; i++) {
        const row = importData[i] as any;
        
        try {
          // Validate required fields
          if (!row["Student Name"] || !row["SRN No"] || !row["Class"] || !row["Section"] || !row["Date of Birth"]) {
            errors.push(`Row ${i + 1}: Missing required fields`);
            failedRecords++;
            continue;
          }

          // Validate SRN uniqueness
          const isUnique = await validateSRN(row["SRN No"], selectedSchool);
          if (!isUnique) {
            errors.push(`Row ${i + 1}: SRN ${row["SRN No"]} already exists`);
            failedRecords++;
            continue;
          }

          // Parse date
          let dateOfBirth;
          try {
            const date = new Date(row["Date of Birth"]);
            if (isNaN(date.getTime())) {
              throw new Error("Invalid date");
            }
            dateOfBirth = date.toISOString().split('T')[0];
          } catch {
            errors.push(`Row ${i + 1}: Invalid date format for Date of Birth`);
            failedRecords++;
            continue;
          }

          // Insert student
          const { error: insertError } = await supabase
            .from("students")
            .insert({
              school_id: selectedSchool,
              student_name: row["Student Name"].toString().trim(),
              srn_no: row["SRN No"].toString().trim(),
              class: row["Class"].toString().trim(),
              section: row["Section"].toString().trim(),
              date_of_birth: dateOfBirth,
              registration_date: new Date().toISOString()
            });

          if (insertError) {
            errors.push(`Row ${i + 1}: ${insertError.message}`);
            failedRecords++;
          } else {
            successfulRecords++;
          }
        } catch (error: any) {
          errors.push(`Row ${i + 1}: ${error.message}`);
          failedRecords++;
        }

        setProgress(((i + 1) / totalRecords) * 100);
      }

      // Log import results
      if (user) {
        await supabase.from("import_logs").insert({
          user_id: user.id,
          filename: fileInputRef.current?.files?.[0]?.name || "unknown",
          total_records: totalRecords,
          successful_records: successfulRecords,
          failed_records: failedRecords,
          errors: errors.length > 0 ? errors.join("\n") : null
        });
      }

      setResults({
        total: totalRecords,
        successful: successfulRecords,
        failed: failedRecords,
        errors
      });

      if (successfulRecords > 0) {
        toast.success(`Successfully imported ${successfulRecords} students`);
        onImportComplete();
      }

      if (failedRecords > 0) {
        toast.warning(`${failedRecords} records failed to import`);
      }

    } catch (error: any) {
      toast.error("Import process failed: " + error.message);
      console.error("Import error:", error);
    } finally {
      setImporting(false);
    }
  };

  const clearImport = () => {
    setImportData([]);
    setResults(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Excel Import
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select School</label>
          <Select value={selectedSchool} onValueChange={setSelectedSchool}>
            <SelectTrigger>
              <SelectValue placeholder="Choose school for import" />
            </SelectTrigger>
            <SelectContent>
              {schools.map((school: any) => (
                <SelectItem key={school.id} value={school.id}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button onClick={downloadTemplate} variant="outline" className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            variant="outline" 
            className="flex-1"
            disabled={importing}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Excel File
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />

        {importData.length > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {importData.length} student records loaded and ready for import
            </AlertDescription>
          </Alert>
        )}

        {importing && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground">
              Importing students... {Math.round(progress)}%
            </p>
          </div>
        )}

        {results && (
          <Alert className={results.failed > 0 ? "border-yellow-200" : "border-green-200"}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p>Import completed:</p>
                <p>• Total records: {results.total}</p>
                <p>• Successful: {results.successful}</p>
                <p>• Failed: {results.failed}</p>
                {results.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer">View errors</summary>
                    <ul className="mt-1 text-xs space-y-1">
                      {results.errors.slice(0, 10).map((error, idx) => (
                        <li key={idx}>• {error}</li>
                      ))}
                      {results.errors.length > 10 && (
                        <li>... and {results.errors.length - 10} more errors</li>
                      )}
                    </ul>
                  </details>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={importStudents}
            disabled={importing || importData.length === 0 || !selectedSchool}
            className="flex-1"
          >
            {importing ? "Importing..." : "Start Import"}
          </Button>
          
          <Button 
            onClick={clearImport}
            variant="outline"
            disabled={importing}
          >
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};