import { NewProspectForm } from "@/components/prospects/new-prospect-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewProspectPage() {
  return (
    <main>
      <PageHeader
        title="Nouveau prospect"
        description="Creer un compte cible avec son segment, son contact principal et les premieres notes terrain."
      />

      <NewProspectForm />
    </main>
  );
}
