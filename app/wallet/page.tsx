import { redirect } from "next/navigation";

/** Wallets are opened from the desk. The Method page's "see it" links point here. */
export default function WalletIndex() {
  redirect("/desk");
}
