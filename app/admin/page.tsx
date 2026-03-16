import { cookies } from "next/headers";

import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminLoginForm } from "@/components/admin-login-form";
import {
  ADMIN_COOKIE_NAME,
  isAdminConfigured,
  isValidAdminSession
} from "@/lib/admin-auth";
import { getAllCompetitionStates } from "@/lib/data";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!isValidAdminSession(adminToken)) {
    return <AdminLoginForm adminConfigured={isAdminConfigured()} />;
  }

  const competitions = await getAllCompetitionStates();

  return <AdminDashboard competitions={competitions} />;
}
