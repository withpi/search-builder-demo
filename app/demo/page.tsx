import { Navbar } from "@/components/navbar"
import { auth } from "@/auth"
import { SearchBuilder } from "@/components/search-builder";

export default async function Page() {
  const session = await auth();

  return (
    <div>
      <Navbar user={session?.user}/>
      <SearchBuilder />
    </div>
  );
}
