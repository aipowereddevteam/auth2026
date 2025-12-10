import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">My Monolith App</h1>
      <p className="text-lg text-slate-500">Secure Enterprise Authentication Demo</p>
      <div className="flex gap-4">
        <Link href="/login">
          <Button size="lg">Login</Button>
        </Link>
        <Link href="/register">
          <Button variant="outline" size="lg">Register</Button>
        </Link>
      </div>
    </div>
  );
}
