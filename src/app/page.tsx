import Image from "next/image";
import Link from "next/link";
import { HomeHeroSlider } from "@/components/home-hero-slider";
import { homeServices } from "@/lib/site-content";

const structureMain = [
  "6 piscinas sendo 3 adultas e 3 infantil com escorregadores e tendas",
  "Toboáguas de 3 pistas e toboáguas simples",
  "Playground aquático infantil",
  "Quadra poli-esportiva",
  "Campo de futebol society",
  "Trilha ecológica com ponte pênsil, casa do índio e mirante",
  "Playground coberto com kid-play, camas elásticas e casa de bolinhas",
  "Mini-fazenda, parque de diversão, passeio de trenzinho e salão de jogos",
  "Quadra de vôlei, tirolesa e casarão de antiquários",
];

const structureSupport = [
  "Estacionamento com cobrança à parte",
  "Portaria com equipe de segurança interna e externa",
  "Vestiário masculino e feminino com sanitários e duchas",
  "Enfermaria",
  "Guarda-volumes",
  "Salões para refeições e reuniões",
  "Palco para shows e apresentações",
  "Amplas cozinhas equipadas",
];

const structureGallery = [
  { src: "/photos/estrutura-galeria.jpg", alt: "Galeria da estrutura do Estancia", className: "md:col-span-2 md:row-span-2" },
  { src: "/photos/estrutura-piscina.jpg", alt: "Piscina da estrutura do Estancia", className: "" },
  { src: "/photos/day-use.jpg", alt: "Area verde do Estancia", className: "" },
  { src: "/photos/escola.jpg", alt: "Area infantil do Estancia", className: "" },
  { src: "/photos/confraternizacao.jpg", alt: "Grupo em evento no Estancia", className: "" },
];

export default function Home() {
  return (
    <div className="w-full">
      <HomeHeroSlider />

      <section className="site-home-services">
        <ul>
          {homeServices.map((service) => (
            <li
              key={service.title}
              className="site-home-service"
            >
              <div className="site-home-service-icon">
                <Image
                  src={service.iconSrc}
                  alt={service.title}
                  width={36}
                  height={36}
                  className="object-contain"
                />
              </div>
              <strong className="site-home-service-title legacy-condensed">
                {service.title}
              </strong>
              <br />
              <Link href={service.href} className="legacy-button green">
                saiba mais
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="relative mt-2 w-full overflow-hidden bg-[#125948] md:pl-[50%]">
        <div className="relative h-[320px] w-full md:absolute md:left-0 md:top-0 md:h-full md:w-1/2">
          <Image
            src="/photos/day-use.jpg"
            alt="Day-Use Familia no Estancia"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <div
            aria-hidden
            className="absolute right-[-40px] top-0 hidden h-full w-[90px] bg-left bg-no-repeat md:block"
            style={{ backgroundImage: "url('/theme/divider.png')" }}
          />
        </div>

        <div className="bg-[radial-gradient(circle_at_center,#1f8970_0%,#135d4c_100%)] px-6 py-8 md:px-[10%]">
          <div className="inline-block w-full max-w-[320px] text-left">
            <h2 className="legacy-rounded text-[44px] font-normal text-white md:text-[50px]">
              Day-Use Família
            </h2>
            <p className="mt-2 text-xl leading-5 text-white">
              Passe um dia especial com sua família por (R$)
            </p>
            <div
              className="legacy-condensed mt-4 h-[170px] w-[280px] bg-contain bg-left-top bg-no-repeat pl-[68px] pt-6 text-[#176754]"
              style={{ backgroundImage: "url('/theme/ingresso-bg.png')" }}
            >
              <div className="leading-none">
                <span className="text-[64px] font-bold">80</span>
                <span className="ml-1 text-[42px] font-bold">,00*</span>
              </div>
              <div className="mt-1 text-[28px] font-bold leading-none">por pessoa</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link href="/agenda" className="legacy-button green">
                comprar ingresso
              </Link>
              <Link href="/day-camp" className="legacy-button green">
                saiba mais
              </Link>
            </div>
            <p className="mt-3 text-[11px] text-white">
              *Crianças de 4 a 9 anos R$ 60,00 (Almoço - Não Incluso)
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1400px] px-4 py-8 md:px-6">
        <h2 className="legacy-condensed text-left text-[32px] text-[#705434] md:text-[28px]">
          Conheça nossa estrutura e venha aproveitar
        </h2>

        <div className="mt-4 grid gap-8 lg:grid-cols-2">
          <div className="text-left">
            <ul className="space-y-2">
              {structureMain.map((item) => (
                <li
                  key={item}
                  className="legacy-rounded bg-[url('/theme/bullet.png')] bg-[position:left_6px] bg-no-repeat pl-6 text-[15px] text-[#5d462c]"
                >
                  {item}
                </li>
              ))}
            </ul>
            <ul className="mt-5 bg-[#ece9e5] p-4">
              {structureSupport.map((item) => (
                <li
                  key={item}
                  className="bg-[url('/theme/bullet-2.png')] bg-[position:left_11px] bg-no-repeat py-1 pl-3 text-[13px] text-[#5d462c]"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {structureGallery.map((item, index) => (
              <div
                key={item.src}
                className={`relative min-h-[180px] overflow-hidden bg-[#eaeaea] ${
                  index === 0 ? "md:min-h-[300px]" : "md:min-h-[145px]"
                } ${item.className}`}
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  className="object-cover transition-transform duration-300 hover:scale-110"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
