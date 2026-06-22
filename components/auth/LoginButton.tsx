import { signIn } from "@/auth";

type LoginButtonProps = {
  className?: string;
};

export function LoginButton({ className }: LoginButtonProps) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("github", { redirectTo: "/dashboard" });
      }}
    >
      <button className={className} type="submit">
        Entrar com GitHub
      </button>
    </form>
  );
}
