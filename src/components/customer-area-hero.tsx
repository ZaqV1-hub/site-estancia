type CustomerAreaHeroProps = {
  title: string;
  subtitle: string;
  imageSrc?: string;
};

export function CustomerAreaHero({
  title,
  subtitle,
  imageSrc = "/photos/day-use.jpg",
}: CustomerAreaHeroProps) {
  return (
    <div
      className="relative top-[-10px] mb-[15px] h-[265px] w-full bg-cover bg-center bg-no-repeat max-md:top-0 max-md:mb-3 max-md:h-[220px]"
      style={{ backgroundImage: `url('${imageSrc}')` }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(16,56,82,0.62),rgba(29,88,126,0.16),rgba(123,95,59,0.28))]" />
      <div
        className="absolute bottom-0 left-0 top-[132px] flex w-full items-end bg-left-top bg-no-repeat px-5 pb-6 text-left max-md:top-[100px] max-md:bg-[length:auto_112px] max-md:px-[18px] max-md:pb-5"
        style={{ backgroundImage: "url('/theme/color-bar-3.png')" }}
      >
        <div className="max-w-[720px]">
          <p className="legacy-rounded text-[12px] uppercase tracking-[0.28em] text-white/85">
            Area do Cliente
          </p>
          <h1 className="legacy-condensed text-[34px] leading-none text-white drop-shadow-[2px_2px_5px_rgba(0,0,0,0.4)] max-md:text-[30px]">
            {title}
          </h1>
          <p className="mt-2 max-w-[640px] text-sm leading-6 text-white/92 md:text-[15px]">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}
