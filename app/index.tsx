// app/index.tsx - Root: always show login first (no employer/dashboard without auth)
import { Redirect } from 'expo-router';

export default function IndexPage() {
  return <Redirect href="/auth/select-user-type" />;
}
