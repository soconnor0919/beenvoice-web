import { redirect } from "next/navigation";
import InvoiceForm from "~/components/forms/invoice-form";
import { api } from "~/trpc/server";

interface EditInvoicePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditInvoicePage({ params }: EditInvoicePageProps) {
  const { id } = await params;

  try {
    const invoice = await api.invoices.getById({ id });
    if (invoice.status !== "draft") {
      redirect(`/dashboard/invoices/${id}?editBlocked=1`);
    }
  } catch {
    redirect("/dashboard/invoices");
  }

  return <InvoiceForm invoiceId={id} />;
}
