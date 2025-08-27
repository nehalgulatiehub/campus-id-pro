import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Crop, Eye, Save, X } from "lucide-react";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";

interface StudentFormProps {
  schoolId: string;
  student?: any;
  onSaved: () => void;
  onCancel: () => void;
}

export const StudentForm = ({ schoolId, student, onSaved, onCancel }: StudentFormProps) => {
  const [formData, setFormData] = useState({
    student_name: student?.student_name || "",
    srn_no: student?.srn_no || "",
    class: student?.class || "",
    section: student?.section || "",
    date_of_birth: student?.date_of_birth || ""
  });
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(student?.photo_url || "");
  const [croppedImage, setCroppedImage] = useState<string>("");
  const [showCropper, setShowCropper] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const cropperRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCrop = () => {
    const cropper = (cropperRef.current as any)?.cropper;
    if (cropper) {
      const croppedCanvas = cropper.getCroppedCanvas({
        width: 300,
        height: 400,
        fillColor: '#fff',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });
      
      const croppedDataURL = croppedCanvas.toDataURL('image/jpeg', 0.8);
      setCroppedImage(croppedDataURL);
      setShowCropper(false);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!croppedImage || !formData.srn_no) return null;

    try {
      // Convert base64 to blob
      const response = await fetch(croppedImage);
      const blob = await response.blob();
      
      const fileName = `${formData.srn_no}.jpg`;
      const filePath = `${schoolId}/${fileName}`;

      // Delete existing photo if updating
      if (student?.photo_url) {
        const oldPath = student.photo_url.split('/').pop();
        if (oldPath && oldPath !== fileName) {
          await supabase.storage
            .from('student-photos')
            .remove([`${schoolId}/${oldPath}`]);
        }
      }

      const { data, error } = await supabase.storage
        .from('student-photos')
        .upload(filePath, blob, {
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (error) {
        console.error('Upload error:', error);
        toast.error('Error uploading photo');
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('student-photos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error processing photo');
      return null;
    }
  };

  const validateSRN = async (srn: string): Promise<boolean> => {
    if (!srn || srn === student?.srn_no) return true;

    const { data, error } = await supabase
      .from('students')
      .select('id')
      .eq('school_id', schoolId)
      .eq('srn_no', srn)
      .maybeSingle();

    if (error) {
      console.error('SRN validation error:', error);
      return true; // Allow submission on error
    }

    return !data; // Return true if no existing student found
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.student_name || !formData.srn_no || !formData.class || !formData.section || !formData.date_of_birth) {
        toast.error('Please fill in all required fields');
        setLoading(false);
        return;
      }

      // Validate SRN uniqueness
      const isValidSRN = await validateSRN(formData.srn_no);
      if (!isValidSRN) {
        toast.error('SRN number already exists for this school');
        setLoading(false);
        return;
      }

      // Upload image if provided
      let photoUrl = student?.photo_url || null;
      if (croppedImage) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          photoUrl = uploadedUrl;
        }
      }

      // Prepare student data
      const studentData = {
        ...formData,
        school_id: schoolId,
        photo_url: photoUrl
      };

      let result;
      if (student) {
        // Update existing student
        result = await supabase
          .from('students')
          .update(studentData)
          .eq('id', student.id);
      } else {
        // Create new student
        result = await supabase
          .from('students')
          .insert(studentData);
      }

      if (result.error) {
        console.error('Save error:', result.error);
        toast.error('Error saving student data');
      } else {
        toast.success(student ? 'Student updated successfully!' : 'Student added successfully!');
        onSaved();
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const generateIDCard = () => {
    return (
      <div className="w-64 h-80 bg-gradient-to-br from-primary to-accent p-4 rounded-lg text-white shadow-lg">
        <div className="text-center mb-3">
          <h3 className="text-sm font-bold">STUDENT ID CARD</h3>
          <p className="text-xs opacity-90">Academic Year 2024-25</p>
        </div>
        
        <div className="flex flex-col items-center space-y-2">
          <div className="w-20 h-24 bg-white rounded border-2 border-white overflow-hidden">
            {(croppedImage || imagePreview) ? (
              <img 
                src={croppedImage || imagePreview} 
                alt="Student" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs">
                No Photo
              </div>
            )}
          </div>
          
          <div className="text-center space-y-1 text-sm">
            <p className="font-bold">{formData.student_name || "Student Name"}</p>
            <p className="text-xs">SRN: {formData.srn_no || "SRN Number"}</p>
            <p className="text-xs">Class: {formData.class || "Class"} - {formData.section || "Section"}</p>
            <p className="text-xs">DOB: {formData.date_of_birth ? new Date(formData.date_of_birth).toLocaleDateString() : "Date of Birth"}</p>
          </div>
        </div>
        
        <div className="mt-3 text-center text-xs opacity-75">
          <p>School ID Management System</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Fields */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="student_name">Student Name *</Label>
                <Input
                  id="student_name"
                  name="student_name"
                  value={formData.student_name}
                  onChange={handleInputChange}
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="srn_no">SRN Number *</Label>
                <Input
                  id="srn_no"
                  name="srn_no"
                  value={formData.srn_no}
                  onChange={handleInputChange}
                  placeholder="Enter SRN number"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="class">Class *</Label>
                  <Input
                    id="class"
                    name="class"
                    value={formData.class}
                    onChange={handleInputChange}
                    placeholder="e.g., 10"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section">Section *</Label>
                  <Input
                    id="section"
                    name="section"
                    value={formData.section}
                    onChange={handleInputChange}
                    placeholder="e.g., A"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth *</Label>
                <Input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Photo Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Student Photo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Upload Photo</Label>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Choose Photo
                  </Button>
                  
                  {croppedImage && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowPreview(true)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                  )}
                </div>
              </div>

              {(croppedImage || imagePreview) && (
                <div className="text-center">
                  <img 
                    src={croppedImage || imagePreview} 
                    alt="Student preview" 
                    className="w-24 h-32 object-cover rounded border mx-auto"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={loading}
              className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary-hover"
            >
              <Save className="h-4 w-4" />
              {loading ? "Saving..." : (student ? "Update Student" : "Add Student")}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>

        {/* ID Card Preview */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ID Card Preview</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              {generateIDCard()}
            </CardContent>
          </Card>
        </div>
      </form>

      {/* Image Cropper Modal */}
      {showCropper && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Crop Photo</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCropper(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="h-96">
                <Cropper
                  ref={cropperRef}
                  src={imagePreview}
                  style={{ height: '100%', width: '100%' }}
                  aspectRatio={3/4}
                  guides={false}
                  dragMode="move"
                  cropBoxMovable={true}
                  cropBoxResizable={true}
                  toggleDragModeOnDblclick={false}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleCrop} className="flex items-center gap-2">
                  <Crop className="h-4 w-4" />
                  Apply Crop
                </Button>
                <Button variant="outline" onClick={() => setShowCropper(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">ID Card Preview</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex justify-center scale-125">
              {generateIDCard()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};