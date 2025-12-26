import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Clock, Mail } from "lucide-react";
import { authClient } from "~/server/better-auth/client";

export default function WaitingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
            <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-2xl">Accès en attente</CardTitle>
          <CardDescription>
            Votre compte est en cours de validation par l'administrateur
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              Vous recevrez l'accès à l'application dès que votre profil sera approuvé.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border p-4">
            <Mail className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Besoin d'aide ?</p>
              <p className="text-sm text-muted-foreground">
                Contactez l'administrateur :{" "}
                <a
                  href="mailto:hugoantoinee@gmail.com"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  hugoantoinee@gmail.com
                </a>
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              await authClient.signOut();
              window.location.href = "/login";
            }}
          >
            Se déconnecter
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
