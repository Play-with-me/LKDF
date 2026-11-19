/**
 * Lớp chân dung Tướng tràn viền kiểu Gwent (Mẫu B):
 * Phủ rộng bên phải thẻ kết hợp dải chuyển tối 3 nấc bảo đảm chữ & ngọc máu bên trái đạt tương phản cao.
 */
export interface HeroCardWatermarkProps {
  readonly portraitUrl: string | null;
  readonly opacityClass?: string;
  readonly widthClass?: string;
}

const MASK_STYLE = {
  maskImage: 'linear-gradient(to left, rgba(0, 0, 0, 0.96) 36%, transparent 100%)',
  WebkitMaskImage: 'linear-gradient(to left, rgba(0, 0, 0, 0.96) 36%, transparent 100%)',
} as const;

export function HeroCardWatermark({
  portraitUrl,
  opacityClass = 'opacity-72',
  widthClass = 'w-[68%]',
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
        draggable={false}
        className={[
          'ml-auto h-full object-cover object-[50%_16%]',
          widthClass,
          opacityClass,
        ].join(' ')}
        style={MASK_STYLE}
      />
      {/* Lớp scrim chuyển sắc 3 nấc bảo đảm chữ trắng/vàng luôn rõ nét kể cả trên ảnh sáng */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, #12161E 0%, rgba(18, 22, 30, 0.92) 34%, rgba(18, 22, 30, 0.45) 64%, rgba(18, 22, 30, 0.08) 100%)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E14]/75 via-transparent to-[#0B0E14]/25" />
    </div>
  );
}
