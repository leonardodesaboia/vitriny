import { signIn } from "@/auth";

type GoogleButtonProps = {
  className?: string;
};

export function GoogleButton({ className }: GoogleButtonProps) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: "/dashboard" });
      }}
    >
      <button className={className} type="submit">
        Entrar com Google
      </button>
    </form>
  );
}
