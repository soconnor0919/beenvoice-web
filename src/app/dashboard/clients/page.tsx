import { redirect } from "next/navigation";

export default function ClientsPage() {
  redirect("/dashboard/entities?tab=clients");
}
