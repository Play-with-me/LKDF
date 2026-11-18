/**
 * Lớp ảnh nền chân dung Tướng làm mờ nghệ thuật ở nửa phải của Thẻ Nhân Vật (Cách 2).
 * Bọc trong container riêng có `overflow-hidden` để không làm cắt huy hiệu nổi bên ngoài thẻ.
 */
export interface HeroCardWatermarkProps {
  readonly portraitUrl: string | null;
  readonly opacityClass?: string;
}

const MASK_STYLE = {
  maskImage: 'linear-gradient(to left, rgba(0, 0, 0, 0.92), transparent)',
  WebkitMaskImage: 'linear-gradient(to left, rgba(0, 0, 0, 0.92), transparent)',
} as const;

export function HeroCardWatermark({
  portraitUrl,
  opacityClass = 'opacity-22',
}: HeroCardWatermarkProps) {
  if (!portraitUrl) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    >
      <img
        src={portraitUrl}
        alt=""
        className={[
          'ml-auto h-full w-[58%] object-cover object-[50%_15%]',
          opacityClass,
        ].join(' ')}
        style={MASK_STYLE}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#181B20]/90 via-[#181B20]/40 to-transparent" />
    </div>
  );
}
