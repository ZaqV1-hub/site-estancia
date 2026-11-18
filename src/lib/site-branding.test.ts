import { describe, expect, it } from "vitest";
import { buildPageMetadata } from "@/lib/site-metadata";
import { contact, getInfoPage, infoPages } from "@/lib/site-content";

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

  it.each(Object.keys(infoPages))("shares the Estância logo for %s instead of the page photo", (slug) => {
    const metadata = buildPageMetadata(slug);

    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({
        url: "/brand/estancia-logo-dark.png",
        alt: "Estância - Parque Ecológico das Águas",
      }),
    ]);
    expect(metadata.twitter?.images).toEqual(["/brand/estancia-logo-dark.png"]);
  });
});
