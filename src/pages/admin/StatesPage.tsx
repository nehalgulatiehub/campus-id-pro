import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Map } from "lucide-react";

interface State {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export const StatesPage = () => {
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingState, setEditingState] = useState<State | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: ""
  });

  useEffect(() => {
    fetchStates();
  }, []);

  const fetchStates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("states")
      .select("*")
      .order("name");
    
    if (error) {
      toast.error("Error fetching states");
    } else {
      setStates(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingState) {
      const { error } = await supabase
        .from("states")
        .update(formData)
        .eq("id", editingState.id);
      
      if (error) {
        toast.error("Error updating state");
      } else {
        toast.success("State updated successfully");
        setEditingState(null);
        fetchStates();
      }
    } else {
      const { error } = await supabase
        .from("states")
        .insert([formData]);
      
      if (error) {
        toast.error("Error creating state");
      } else {
        toast.success("State created successfully");
        setIsAddDialogOpen(false);
        fetchStates();
      }
    }
    
    setFormData({ name: "", code: "" });
  };

  const handleEdit = (state: State) => {
    setEditingState(state);
    setFormData({
      name: state.name,
      code: state.code
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this state?")) return;
    
    const { error } = await supabase
      .from("states")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast.error("Error deleting state");
    } else {
      toast.success("State deleted successfully");
      fetchStates();
    }
  };

  if (loading) {
    return <LoadingState message="Loading states..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">States Management</h1>
          <p className="text-muted-foreground">Manage states in your system</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add State
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New State</DialogTitle>
              <DialogDescription>
                Create a new state in the system
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">State Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter state name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="code">State Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Enter state code"
                  required
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  Create State
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
            <Map className="h-5 w-5" />
            States ({states.length})
          </CardTitle>
          <CardDescription>
            List of all states in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {states.length === 0 ? (
            <EmptyState
              icon={<Map className="h-12 w-12" />}
              title="No states found"
              description="Start by adding your first state to the system."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {states.map((state) => (
                  <TableRow key={state.id}>
                    <TableCell className="font-medium">{state.name}</TableCell>
                    <TableCell className="font-mono">{state.code}</TableCell>
                    <TableCell>{new Date(state.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(state)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(state.id)}
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
      <Dialog open={!!editingState} onOpenChange={(open) => !open && setEditingState(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit State</DialogTitle>
            <DialogDescription>
              Update the state information
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">State Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter state name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="edit-code">State Code</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder="Enter state code"
                required
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                Update State
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditingState(null)}
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