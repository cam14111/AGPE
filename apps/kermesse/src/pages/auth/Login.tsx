import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@agpe/shared/supabase-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
export function Login() {
  const [email, setEmail] = useState("");
  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/AGPE/#/auth/callback`,
      },
    });
    if (error) toast.error("Impossible d'envoyer le lien magique.");
    else toast.success("Vérifiez vos emails pour vous connecter.");
  }
  return (
    <main className="flex min-h-screen items-center p-4">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">🎪 Connexion bénévole</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <Input
              type="email"
              required
              placeholder="parent@exemple.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button className="w-full">Recevoir mon lien</Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-slate-500">
            Un lien magique sans mot de passe vous sera envoyé par email.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
