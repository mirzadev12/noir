import { redirect } from "next/navigation";

/** VASPs are opened from the desk. The Method page's "see it" links point here. */
export default function VaspIndex() {
  redirect("/desk");
}
