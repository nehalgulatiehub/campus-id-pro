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
import { Plus, Edit, Trash2, Building2 } from "lucide-react";

interface Block {
  id: string;
  name: string;
  code: string;
  district_id: string;
  created_at: string;
  district?: {
    name: string;
    state?: {
      name: string;
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

export const BlocksPage = () => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [filteredDistricts, setFilteredDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    state_id: "",
    district_id: ""
  });

  useEffect(() => {
    fetchBlocks();
    fetchStates();
    fetchDistricts();
  }, []);

  useEffect(() => {
    if (formData.state_id) {
      const filtered = districts.filter(d => d.state_id === formData.state_id);
      setFilteredDistricts(filtered);
      setFormData(prev => ({ ...prev, district_id: "" }));
    } else {
      setFilteredDistricts([]);
    }
  }, [formData.state_id, districts]);

  const fetchBlocks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blocks")
      .select(`
        *,
        district:districts(
          name,
          state:states(name)
        )
      `)
      .order("name");
    
    if (error) {
      toast.error("Error fetching blocks");
    } else {
      setBlocks(data || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      name: formData.name,
      code: formData.code,
      district_id: formData.district_id
    };
    
    if (editingBlock) {
      const { error } = await supabase
        .from("blocks")
        .update(submitData)
        .eq("id", editingBlock.id);
      
      if (error) {
        toast.error("Error updating block");
      } else {
        toast.success("Block updated successfully");
        setEditingBlock(null);
        fetchBlocks();
      }
    } else {
      const { error } = await supabase
        .from("blocks")
        .insert([submitData]);
      
      if (error) {
        toast.error("Error creating block");
      } else {
        toast.success("Block created successfully");
        setIsAddDialogOpen(false);
        fetchBlocks();
      }
    }
    
    setFormData({ name: "", code: "", state_id: "", district_id: "" });
  };

  const handleEdit = (block: Block) => {
    setEditingBlock(block);
    const stateId = districts.find(d => d.id === block.district_id)?.state_id || "";
    setFormData({
      name: block.name,
      code: block.code,
      state_id: stateId,
      district_id: block.district_id
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this block?")) return;
    
    const { error } = await supabase
      .from("blocks")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast.error("Error deleting block");
    } else {
      toast.success("Block deleted successfully");
      fetchBlocks();
    }
  };

  if (loading) {
    return <LoadingState message="Loading blocks..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Blocks Management</h1>
          <p className="text-muted-foreground">Manage blocks in your system</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Block
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Block</DialogTitle>
              <DialogDescription>
                Create a new block in the system
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
                <Label htmlFor="name">Block Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter block name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="code">Block Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Enter block code"
                  required
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1" disabled={!formData.district_id}>
                  Create Block
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
            <Building2 className="h-5 w-5" />
            Blocks ({blocks.length})
          </CardTitle>
          <CardDescription>
            List of all blocks in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {blocks.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-12 w-12" />}
              title="No blocks found"
              description="Start by adding your first block to the system."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Block Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blocks.map((block) => (
                  <TableRow key={block.id}>
                    <TableCell className="font-medium">{block.name}</TableCell>
                    <TableCell className="font-mono">{block.code}</TableCell>
                    <TableCell>{block.district?.name}</TableCell>
                    <TableCell>{block.district?.state?.name}</TableCell>
                    <TableCell>{new Date(block.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(block)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(block.id)}
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
      <Dialog open={!!editingBlock} onOpenChange={(open) => !open && setEditingBlock(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Block</DialogTitle>
            <DialogDescription>
              Update the block information
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
              <Label htmlFor="edit-name">Block Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter block name"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="edit-code">Block Code</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                placeholder="Enter block code"
                required
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                Update Block
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditingBlock(null)}
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