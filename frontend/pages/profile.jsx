import { useEffect } from 'react';

// Legacy page - redirect to production /dashboard/profile
export default function ProfilePage() {
  useEffect(() => {
    window.location.href = '/dashboard/profile';
  }, []);
  return <p>Redirecting to your profile...</p>;
}
