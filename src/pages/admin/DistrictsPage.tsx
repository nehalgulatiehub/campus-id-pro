import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { Plus, Edit, Trash2, MapPin } from "lucide-react";

interface District {
  id: string;
  name: string;
  code: string;
  state_id: string;
  created_at: string;
  state?: {
    name: string;
  };
}

interface State {
  id: string;
  name: string;
}

export const DistrictsPage = () => {
  const [districts, setDistricts] = useState<District[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    state_id: ""
  });

  useEffect(() => {
    fetchDistricts();
    fetchStates();
  }, []);

  const fetchDistricts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("districts")
      .select(`
        *,
        state:states(name)
      `)
      .order("name");
    
    if (error) {
      toast.error("Error fetching districts");
    } else {
      setDistricts(data || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingDistrict) {
      const { error } = await supabase
        .from("districts")
        .update(formData)
        .eq("id", editingDistrict.id);
      
      if (error) {
        toast.error("Error updating district");
      } else {
        toast.success("District updated successfully");
        setEditingDistrict(null);
        fetchDistricts();
      }
    } else {
      const { error } = await supabase
        .from("districts")
        .insert([formData]);
      
      if (error) {
        toast.error("Error creating district");
      } else {
        toast.success("District created successfully");
        setIsAddDialogOpen(false);
        fetchDistricts();
      }
    }
    
    setFormData({ name: "", code: "", state_id: "" });
  };

  const handleEdit = (district: District) => {
    setEditingDistrict(district);
    setFormData({
      name: district.name,
      code: district.code,
      state_id: district.state_id
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this district?")) return;
    
    const { error } = await supabase
      .from("districts")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast.error("Error deleting district");
    } else {
      toast.success("District deleted successfully");
      fetchDistricts();
    }
  };

  if (loading) {
    return <LoadingState message="Loading districts..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Districts Management</h1>
          <p className="text-muted-foreground">Manage districts in your system</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add District
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New District</DialogTitle>
              <DialogDescription>
                Create a new district in the system
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label htmlFor="name">District Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter district name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="code">District Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Enter district code"
                  required
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1" disabled={!formData.state_id}>
                  Create District
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
            <MapPin className="h-5 w-5" />
            Districts ({districts.length})
          </CardTitle>
          <CardDescription>
            List of all districts in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {districts.length === 0 ? (
            <EmptyState
              icon={<MapPin className="h-12 w-12" />}
              title="No districts found"
              description="Start by adding your first district to the system."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>District Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {districts.map((district) => (
                  <TableRow key={district.id}>
                    <TableCell className="font-medium">{district.name}</TableCell>
                    <TableCell className="font-mono">{district.code}</TableCell>
                    <TableCell>{district.state?.name}</TableCell>
                    <TableCell>{new Date(district.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(district)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(district.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingDistrict} onOpenChange={(open) => !open && setEditingDistrict(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit District</DialogTitle>
            <DialogDescription>
              Update the district information
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="edit-name">District Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter district name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="edit-code">District Code</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder="Enter district code"
                required
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                Update District
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditingDistrict(null)}
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