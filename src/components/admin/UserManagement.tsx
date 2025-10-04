import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Search } from "lucide-react";
import { AddUserDialog } from "./AddUserDialog";

export const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles (
            role
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = users;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(user => {
        const userRole = user.user_roles?.[0]?.role || 'free';
        return userRole === roleFilter;
      });
    }

    setFilteredUsers(filtered);
  }, [searchQuery, roleFilter, users]);

  const handleRoleChange = async (userId: string, newRole: 'free' | 'premium' | 'admin') => {
    try {
      // First, delete existing role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Then insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: newRole
        });

      if (error) throw error;

      toast.success(`Role updated to ${newRole}`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error("Failed to update role");
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-serif">User Management</h2>
        <Button onClick={() => setAddUserDialogOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-4">
          {filteredUsers.map((user) => {
            const currentRole = user.user_roles?.[0]?.role || 'free';
            
            return (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded">
                <div className="flex-1">
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Joined: {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32">
                    <Select
                      value={currentRole}
                      onValueChange={(value: any) => handleRoleChange(user.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-4 gap-4 text-sm">
        <Card className="p-4">
          <p className="text-muted-foreground mb-1">Total Users</p>
          <p className="text-2xl font-bold">{users.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-muted-foreground mb-1">Free</p>
          <p className="text-2xl font-bold">{users.filter(u => u.user_roles?.[0]?.role === 'free' || !u.user_roles?.length).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-muted-foreground mb-1">Premium</p>
          <p className="text-2xl font-bold">{users.filter(u => u.user_roles?.[0]?.role === 'premium').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-muted-foreground mb-1">Admin</p>
          <p className="text-2xl font-bold">{users.filter(u => u.user_roles?.[0]?.role === 'admin').length}</p>
        </Card>
      </div>

      <AddUserDialog
        open={addUserDialogOpen}
        onOpenChange={setAddUserDialogOpen}
        onUserAdded={fetchUsers}
      />
    </div>
  );
};
