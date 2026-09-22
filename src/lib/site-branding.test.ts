import { describe, expect, it } from "vitest";
import { buildPageMetadata } from "@/lib/site-metadata";
import { contact, getInfoPage } from "@/lib/site-content";

describe("site branding", () => {
  it("uses Estância in public metadata", () => {
    const metadata = buildPageMetadata("agenda");

    expect(metadata.title).toContain("Estância");
    expect(metadata.openGraph?.siteName).toContain("Estância");
    expect(metadata.twitter?.title).toContain("Estância");
  });

  it("uses Estancia in core public content", () => {
    expect(contact.company).toContain("Estancia");
    expect(contact.email).not.toContain("cluberincao");
    expect(getInfoPage("quem-somos").seoTitle).toContain("Estancia");
  });
});
