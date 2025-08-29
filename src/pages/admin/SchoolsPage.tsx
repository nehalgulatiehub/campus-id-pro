import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingState } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { Plus, Edit, Trash2, School, User, Key } from "lucide-react";

interface School {
  id: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
  address?: string;
  block_id: string;
  created_at: string;
  block?: {
    name: string;
    district?: {
      name: string;
      state?: {
        name: string;
      };
    };
  };
}

interface State {
  id: string;
  name: string;
}

interface District {
  id: string;
  name: string;
  state_id: string;
}

interface Block {
  id: string;
  name: string;
  district_id: string;
}

export const SchoolsPage = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [filteredDistricts, setFilteredDistricts] = useState<District[]>([]);
  const [filteredBlocks, setFilteredBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [createLoginCredentials, setCreateLoginCredentials] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    email: "",
    phone: "",
    address: "",
    state_id: "",
    district_id: "",
    block_id: "",
    login_email: "",
    login_password: ""
  });

  useEffect(() => {
    fetchSchools();
    fetchStates();
    fetchDistricts();
    fetchBlocks();
  }, []);

  useEffect(() => {
    if (formData.state_id) {
      const filtered = districts.filter(d => d.state_id === formData.state_id);
      setFilteredDistricts(filtered);
      setFormData(prev => ({ ...prev, district_id: "", block_id: "" }));
    } else {
      setFilteredDistricts([]);
    }
  }, [formData.state_id, districts]);

  useEffect(() => {
    if (formData.district_id) {
      const filtered = blocks.filter(b => b.district_id === formData.district_id);
      setFilteredBlocks(filtered);
      setFormData(prev => ({ ...prev, block_id: "" }));
    } else {
      setFilteredBlocks([]);
    }
  }, [formData.district_id, blocks]);

  const fetchSchools = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("schools")
      .select(`
        *,
        block:blocks(
          name,
          district:districts(
            name,
            state:states(name)
          )
        )
      `)
      .order("name");
    
    if (error) {
      toast.error("Error fetching schools");
    } else {
      setSchools(data || []);
    }
    setLoading(false);
  };

  const fetchStates = async () => {
    const { data, error } = await supabase
      .from("states")
      .select("id, name")
      .order("name");
    
    if (error) {
      toast.error("Error fetching states");
    } else {
      setStates(data || []);
    }
  };

  const fetchDistricts = async () => {
    const { data, error } = await supabase
      .from("districts")
      .select("id, name, state_id")
      .order("name");
    
    if (error) {
      toast.error("Error fetching districts");
    } else {
      setDistricts(data || []);
    }
  };

  const fetchBlocks = async () => {
    const { data, error } = await supabase
      .from("blocks")
      .select("id, name, district_id")
      .order("name");
    
    if (error) {
      toast.error("Error fetching blocks");
    } else {
      setBlocks(data || []);
    }
  };

  const createUserAccount = async (email: string, password: string, schoolId: string) => {
    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            role: 'school'
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from("user_profiles")
          .insert([{
            user_id: authData.user.id,
            email,
            name: formData.name,
            role: 'school',
            school_id: schoolId
          }]);

        if (profileError) {
          console.error("Profile creation error:", profileError);
          toast.error("User created but profile setup failed");
        } else {
          toast.success("School user account created successfully");
        }
      }
    } catch (error) {
      console.error("Error creating user account:", error);
      toast.error("Failed to create user account");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      name: formData.name,
      code: formData.code,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      block_id: formData.block_id
    };
    
    if (editingSchool) {
      const { error } = await supabase
        .from("schools")
        .update(submitData)
        .eq("id", editingSchool.id);
      
      if (error) {
        toast.error("Error updating school");
      } else {
        toast.success("School updated successfully");
        setEditingSchool(null);
        fetchSchools();
      }
    } else {
      const { data: schoolData, error } = await supabase
        .from("schools")
        .insert([submitData])
        .select()
        .single();
      
      if (error) {
        toast.error("Error creating school");
      } else {
        toast.success("School created successfully");
        
        // Create user account if requested
        if (createLoginCredentials && formData.login_email && formData.login_password) {
          await createUserAccount(formData.login_email, formData.login_password, schoolData.id);
        }
        
        setIsAddDialogOpen(false);
        fetchSchools();
      }
    }
    
    setFormData({ 
      name: "", code: "", email: "", phone: "", address: "", 
      state_id: "", district_id: "", block_id: "",
      login_email: "", login_password: ""
    });
    setCreateLoginCredentials(false);
  };

  const handleEdit = (school: School) => {
    setEditingSchool(school);
    const block = blocks.find(b => b.id === school.block_id);
    const district = districts.find(d => d.id === block?.district_id);
    const stateId = states.find(s => s.id === district?.state_id)?.id || "";
    
    setFormData({
      name: school.name,
      code: school.code,
      email: school.email || "",
      phone: school.phone || "",
      address: school.address || "",
      state_id: stateId,
      district_id: district?.id || "",
      block_id: school.block_id,
      login_email: "",
      login_password: ""
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this school?")) return;
    
    const { error } = await supabase
      .from("schools")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast.error("Error deleting school");
    } else {
      toast.success("School deleted successfully");
      fetchSchools();
    }
  };

  if (loading) {
    return <LoadingState message="Loading schools..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Schools Management</h1>
          <p className="text-muted-foreground">Manage schools in your system</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add School
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New School</DialogTitle>
              <DialogDescription>
                Create a new school in the system and optionally set up login credentials
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Location Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="state">State</Label>
                  <Select 
                    value={formData.state_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, state_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state.id} value={state.id}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="district">District</Label>
                  <Select 
                    value={formData.district_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, district_id: value }))}
                    disabled={!formData.state_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select District" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredDistricts.map((district) => (
                        <SelectItem key={district.id} value={district.id}>
                          {district.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="block">Block</Label>
                  <Select 
                    value={formData.block_id} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, block_id: value }))}
                    disabled={!formData.district_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Block" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredBlocks.map((block) => (
                        <SelectItem key={block.id} value={block.id}>
                          {block.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* School Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">School Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter school name"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="code">School Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="Enter school code"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">School Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter school email"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">School Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter school phone"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">School Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter school address"
                  rows={3}
                />
              </div>

              {/* Login Credentials Section */}
              <div className="border-t pt-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox
                    id="create-login"
                    checked={createLoginCredentials}
                    onCheckedChange={(checked) => setCreateLoginCredentials(!!checked)}
                  />
                  <Label htmlFor="create-login" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Create login credentials for this school
                  </Label>
                </div>

                {createLoginCredentials && (
                  <div className="space-y-4 bg-muted/20 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Key className="h-4 w-4" />
                      Login credentials will be created for school access
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="login-email">Login Email</Label>
                        <Input
                          id="login-email"
                          type="email"
                          value={formData.login_email}
                          onChange={(e) => setFormData(prev => ({ ...prev, login_email: e.target.value }))}
                          placeholder="Enter login email"
                          required={createLoginCredentials}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="login-password">Login Password</Label>
                        <Input
                          id="login-password"
                          type="password"
                          value={formData.login_password}
                          onChange={(e) => setFormData(prev => ({ ...prev, login_password: e.target.value }))}
                          placeholder="Enter password (min 6 chars)"
                          required={createLoginCredentials}
                          minLength={6}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={!formData.block_id || (createLoginCredentials && (!formData.login_email || !formData.login_password))}
                >
                  Create School
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Schools ({schools.length})
          </CardTitle>
          <CardDescription>
            List of all schools in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {schools.length === 0 ? (
            <EmptyState
              icon={<School className="h-12 w-12" />}
              title="No schools found"
              description="Start by adding your first school to the system."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Block</TableHead>
                    <TableHead>District</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schools.map((school) => (
                    <TableRow key={school.id}>
                      <TableCell className="font-medium">{school.name}</TableCell>
                      <TableCell className="font-mono">{school.code}</TableCell>
                      <TableCell>{school.email || "N/A"}</TableCell>
                      <TableCell>{school.phone || "N/A"}</TableCell>
                      <TableCell>{school.block?.name}</TableCell>
                      <TableCell>{school.block?.district?.name}</TableCell>
                      <TableCell>{school.block?.district?.state?.name}</TableCell>
                      <TableCell>{new Date(school.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(school)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(school.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingSchool} onOpenChange={(open) => !open && setEditingSchool(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit School</DialogTitle>
            <DialogDescription>
              Update the school information
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Location Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-state">State</Label>
                <Select 
                  value={formData.state_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, state_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select State" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((state) => (
                      <SelectItem key={state.id} value={state.id}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit-district">District</Label>
                <Select 
                  value={formData.district_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, district_id: value }))}
                  disabled={!formData.state_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select District" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredDistricts.map((district) => (
                      <SelectItem key={district.id} value={district.id}>
                        {district.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit-block">Block</Label>
                <Select 
                  value={formData.block_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, block_id: value }))}
                  disabled={!formData.district_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Block" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredBlocks.map((block) => (
                      <SelectItem key={block.id} value={block.id}>
                        {block.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* School Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">School Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter school name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="edit-code">School Code</Label>
                <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Enter school code"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-email">School Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter school email"
                />
              </div>
              
              <div>
                <Label htmlFor="edit-phone">School Phone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter school phone"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-address">School Address</Label>
              <Textarea
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter school address"
                rows={3}
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                Update School
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditingSchool(null)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};