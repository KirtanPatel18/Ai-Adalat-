import { getTranslations } from "next-intl/server";

export default async function SignInPage() {
  const t = await getTranslations();
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground gap-2">
      <h1 className="text-xl font-bold">{t("auth.signInTitle")}</h1>
      <div>Sign In Page</div>
    </div>
  );
}
