import { RoomManagement } from '@/components/RoomManagement';
import Layout from '@/components/Layout';
import { useAuth } from '@/lib/auth-context';
import { Redirect } from 'wouter';

export default function RoomManagementPage() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <Layout>
      <RoomManagement currentUserId={user.id} userRole={user.role || 'user'} />
    </Layout>
  );
}