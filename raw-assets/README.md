# Thư Mục Ảnh Thô Trước Khi Tối Ưu (`raw-assets/`)

Thư mục này được bỏ qua bởi Git (`.gitignore`) để kho mã nguồn luôn nhẹ.
Khi bạn tạo xong ảnh từ **Google AI Studio / Recraft / ComfyUI**, chỉ cần thả file `.png` hoặc `.jpg` vào đúng thư mục và chạy:

```bash
npm run assets:optimize
```

Hệ thống sẽ tự động căn khung, resize chuẩn 2x và nén sang **`.webp`** đưa vào `apps/desktop/src/assets/art/`, sau đó game tự động nạp ngay mà không cần sửa code:

- `raw-assets/heroes/<heroId>.png` → Tự nén thành `400×520px .webp` (VD: `liu_bei.png`, `guan_yu.png`, `cao_cao.png`... đủ 25 tướng)
- `raw-assets/cards/<cardKey>.png` → Tự nén thành `320×260px .webp` (VD: `sat.png`, `thiem.png`, `dao.png`... đủ 32 loại bài)
- `raw-assets/ui/` →
  - `table-bg.png` (`1920×1080`)
  - `card-back.png` (`320×440`)
  - `lobby-banner.png` (`1280×720`)

Chạy `npm run assets:check` bất kỳ lúc nào để xem danh sách còn thiếu và tổng dung lượng tăng thêm.
