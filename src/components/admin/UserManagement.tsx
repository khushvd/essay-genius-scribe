import { useState, useEffect } from "react";
import { profilesService } from "@/services/profiles.service";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Search, CheckCircle, XCircle, Ban } from "lucide-react";
import { AddUserDialog } from "./AddUserDialog";
import { supabase } from "@/integrations/supabase/client";

export const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const result = await profilesService.listUsers();
    
    if (result.success) {
      setUsers(result.data);
      setFilteredUsers(result.data);
    } else {
      console.error('Failed to load users:', result.error);
      
      // Check for permission/RLS errors
      if (result.error.code === 'PGRST301' || result.error.message.includes('row-level security')) {
        toast.error("Access denied: You don't have admin permissions. Please contact support.");
      } else {
        toast.error(`Failed to load users: ${result.error.message}`);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = users;

    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter(user => {
        const userRole = user.user_roles?.[0]?.role || 'free';
        return userRole === roleFilter;
      });
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(user => user.account_status === statusFilter);
    }

    setFilteredUsers(filtered);
  }, [searchQuery, roleFilter, statusFilter, users]);

  const handleRoleChange = async (userId: string, newRole: 'free' | 'premium' | 'admin') => {
    setUpdatingUserId(userId);
    
    const previousUsers = [...users];
    
    // Optimistic update
    setUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === userId ? { ...user, role: newRole, user_roles: [{ role: newRole }] } : user
      )
    );

    const result = await profilesService.updateUserRole(userId, newRole);

    if (!result.success) {
      setUsers(previousUsers);
      toast.error('Failed to update role: ' + result.error.message);
    } else {
      toast.success(`Role updated to ${newRole}`);
    }
    
    setUpdatingUserId(null);
  };

  const handleStatusChange = async (userId: string, newStatus: 'approved' | 'rejected' | 'suspended', userEmail: string, userName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const result = await profilesService.updateAccountStatus(userId, newStatus, user?.id || '');

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }

      // Send email notification
      const emailType = newStatus === 'approved' ? 'approval' : newStatus === 'rejected' ? 'rejection' : 'suspension';
      await supabase.functions.invoke('send-user-emails', {
        body: {
          type: emailType,
          recipientEmail: userEmail,
          recipientName: userName,
          adminName: user?.email || 'Administrator',
        }
      });

      toast.success(`User ${newStatus}`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error("Failed to update status");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-success/10 text-success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'suspended':
        return <Badge variant="destructive" className="bg-destructive/10">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-4">
          {filteredUsers.map((user) => {
            const currentRole = user.user_roles?.[0]?.role || 'free';
            
            return (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{user.full_name}</p>
                    {getStatusBadge(user.account_status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Joined: {new Date(user.created_at).toLocaleDateString()}
                  </p>
                  {user.approved_at && (
                    <p className="text-xs text-muted-foreground">
                      Approved: {new Date(user.approved_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {user.account_status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleStatusChange(user.id, 'approved', user.email, user.full_name)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleStatusChange(user.id, 'rejected', user.email, user.full_name)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                  {user.account_status === 'approved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(user.id, 'suspended', user.email, user.full_name)}
                    >
                      <Ban className="w-4 h-4 mr-1" />
                      Suspend
                    </Button>
                  )}
                  {user.account_status === 'suspended' && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleStatusChange(user.id, 'approved', user.email, user.full_name)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Unsuspend
                    </Button>
                  )}
                  <div className="flex items-center gap-2">
                    <Select
                      value={currentRole}
                      onValueChange={(value: any) => handleRoleChange(user.id, value)}
                      disabled={updatingUserId === user.id}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    {updatingUserId === user.id && (
                      <span className="text-xs text-muted-foreground">Updating...</span>
                    )}
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
          <p className="text-muted-foreground mb-1">Pending</p>
          <p className="text-2xl font-bold">{users.filter(u => u.account_status === 'pending').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-muted-foreground mb-1">Approved</p>
          <p className="text-2xl font-bold">{users.filter(u => u.account_status === 'approved').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-muted-foreground mb-1">Premium</p>
          <p className="text-2xl font-bold">{users.filter(u => u.user_roles?.[0]?.role === 'premium').length}</p>
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
