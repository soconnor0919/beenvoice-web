import { env } from "~/env";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return <RegisterForm signupsDisabled={env.DISABLE_SIGNUPS === true} />;
}
