// /login → redirect to main entry (select user type / welcome)
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function LoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/auth/select-user-type' as any);
  }, [router]);
  return null;
}
