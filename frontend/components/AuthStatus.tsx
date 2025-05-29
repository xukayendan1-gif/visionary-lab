import { auth, signIn, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export async function AuthStatus() {
  const session = await auth();

  if (!session?.user) {
    return (
      <form
        action={async () => {
          "use server";
          await signIn("microsoft-entra-id");
        }}
      >
        {/*  <Button type="submit" variant="outline" size="sm" className="gap-2">
          <LogIn className="size-3.5" />
          Sign In with Microsoft
        </Button> */}
      </form>
    );
  }

  return (
    <div>
      <p>Signed in as {session.user.name || session.user.email}</p>
      <form
        action={async () => {
          "use server";
          await signOut();
        }}
      >
        <Button type="submit" size="sm" variant="outline">Sign Out</Button>
      </form>
    </div>
  );
} 
