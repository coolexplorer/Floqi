import { Spinner } from "@/components/ui/Spinner";

export default function AuthLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Spinner size="lg" label="Loading..." />
    </div>
  );
}
