import { redirect } from "next/navigation";

// Slug映射表：旧的services路径到新的solutions路径
const slugMap: Record<string, string> = {
  "fba": "fba-last-mile",
  "dropshipping": "dropshipping",
  "returns": "returns",
  "warehouse": "warehouse",
};

// Redirect /services to /solutions for backward compatibility
export default function ServicesPage() {
  redirect("/solutions");
}
