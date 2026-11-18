# AGENTS.md — Quy Tắc Làm Việc Bắt Buộc Dành Cho AI

> **Dự án:** LKDF — Game Thẻ Bài Tam Quốc Sát (Windows Native Online 4–8 Người)
> **Cập nhật lần cuối:** 2026-11-18

Tài liệu này quy định các nguyên tắc bắt buộc cho mọi AI Agent tham gia phân tích, lập trình, kiểm thử hoặc bảo trì dự án này.

---

## 1. Thứ Tự Đọc Tài Liệu & Kiểm Tra Đầu Phiên Trước Khi Làm Bất Kỳ Việc Gì

Khi bắt đầu một phiên làm việc mới (kể cả khi vừa chuyển sang máy tính / AI khác), AI **bắt buộc thực hiện theo thứ tự sau** trước khi đề xuất kế hoạch hoặc sửa code:
1. **[CONTEXT.md](./CONTEXT.md)**, **[PROJECT_MEMORY.md](./PROJECT_MEMORY.md)**, **[`.agents/PROJECT_MEMORY.md`](./.agents/PROJECT_MEMORY.md)** và **[HUONG_DAN_CHO_TOI.md](./HUONG_DAN_CHO_TOI.md)** — Nắm toàn bộ lịch sử từ Bước 0.1 đến hiện tại, các quyết định đã khóa, ghi chú bàn giao kỹ thuật từ phiên trước và bước kế tiếp đang chờ.
2. **Chạy kiểm tra `git status --short`, `git log -n 3 --oneline` và đọc [`graphify-out/GRAPH_REPORT.md`](./graphify-out/GRAPH_REPORT.md)** — Phát hiện ngay mọi file chưa `commit` để bảo vệ công việc hiện có và nắm bản đồ mô-đun kiến trúc ngay lập tức.
3. **[REQUIREMENTS.md](./REQUIREMENTS.md)** & **[RULES_STANDARD.md](./RULES_STANDARD.md)** — Nắm yêu cầu chức năng, bảng Thân Phận 4–8 người, 25 tướng chuẩn, 108 lá chuẩn Yoka (không lẫn bản mở rộng) và 8 tiêu chí nghiệm thu.
4. **[DESIGN.md](./DESIGN.md)** — Khi làm việc liên quan đến giao diện **Doanh Trại A Responsive (`960×600`–`2K`)**, Cổ Thư & Gỗ Mun Cách 2, Nhấn giữ & Quăng bài, 4 ô Trang bị ngửa hoặc 5 trạng thái màn hình.
5. **[ARCHITECTURE.md](./ARCHITECTURE.md)** & **[DATA_MODEL.md](./DATA_MODEL.md)** — Khi làm việc với lõi luật, máy chủ, đăng nhập Google, lưu trữ Cloud 0đ hoặc tự cập nhật 1-Click (`302` CDN).
6. **[TASKS.md](./TASKS.md)** — Kiểm tra đúng đầu việc đang thực hiện và điều kiện hoàn thành của đầu việc đó.

---

## 2. Cấu Trúc Dự Án & Quy Ước Kỹ Thuật Bắt Buộc

- **Tách biệt tuyệt đối Lõi Luật (`packages/shared`):**
  - Toàn bộ quy tắc của 108 lá bài, 25 tướng, tính khoảng cách, ngăn xếp phản ứng (`interruptStack`) và bộ lọc giấu bài (`projectStateForPlayer`) phải viết bằng **TypeScript thuần trong `packages/shared`**, không phụ thuộc vào giao diện hay mạng.
- **Bảo mật trạng thái trên Máy chủ (`apps/server`):**
  - Máy chủ giữ `MasterGameState` và **chỉ gửi `PlayerViewState`** đã lọc sạch bài úp của đối thủ, chồng bài rút và Thân Phận ẩn xuống từng người chơi.
  - Không bao giờ nhúng khóa bí mật (`GOOGLE_CLIENT_SECRET`, `GITHUB_RELEASE_TOKEN`, `DATABASE_AUTH_TOKEN`, `TAURI_SIGNING_PRIVATE_KEY`) vào mã nguồn phía máy khách (`apps/desktop`).
- **Quy ước Giao diện (`apps/desktop`):**
  - Tuân thủ tuyệt đối [DESIGN.md](./DESIGN.md): Cố định `100vh` không cuộn trang ở bàn đấu (`min-h-0`, `min-w-0`), có đủ 5 trạng thái giao diện, nhãn nút ghi rõ hành động cụ thể, không hiển thị số liệu giả.

---

## 3. Phân Định Quyền Tự Quyết Của AI vs Việc Phải Hỏi Khách Hàng

### 3.1. Việc AI được tự quyết định (Không làm phiền khách hàng)
- Cấu trúc hàm, chia tách file nội bộ, đặt tên biến/kiểu dữ liệu TypeScript và tối ưu thuật toán bên trong các mô-đun đã chốt.
- Lựa chọn thư viện phụ trợ nhỏ, cấu hình kiểm tra kiểu (`tsconfig`), cấu hình bộ chạy test (`Vitest`) và viết thêm các bài kiểm thử tự động.
- Sửa các lỗi kỹ thuật phát sinh trong quá trình chạy thử miễn là giữ nguyên hành vi sản phẩm trong [REQUIREMENTS.md](./REQUIREMENTS.md).

### 3.2. Việc AI BẮT BUỘC phải hỏi khách hàng trước khi làm
- Bất kỳ thay đổi nào làm khác đi phạm vi đã khóa trong [REQUIREMENTS.md](./REQUIREMENTS.md) và [DECISIONS.md](./DECISIONS.md) (ví dụ: thêm/bớt tướng khỏi 25 tướng chuẩn, thay đổi bảng chia Thân Phận 4–8 người, thay đổi 4 nút Trọng Tài, hoặc đổi cơ chế đăng nhập Google).
- Mọi quyết định có thể phát sinh chi phí tài chính (vượt khỏi giới hạn 0 đồng), ảnh hưởng đến quyền riêng tư dữ liệu người dùng, hoặc công khai kho mã nguồn Private.
- Khi phát hiện yêu cầu mới của khách hàng mâu thuẫn với tài liệu đã chốt: phải chỉ rõ điểm mâu thuẫn, nêu phương án khuyến nghị kèm lợi ích/đánh đổi và chờ khách hàng xác nhận.

---

## 4. Quy Trình Thực Hiện, Kiểm Tra Thay Đổi & Bảo Vệ Công Việc Hiện Có

1. **Làm theo từng bước nhỏ trong [TASKS.md](./TASKS.md):**
   - Trước mỗi phần, nêu ngắn gọn kết quả sắp tạo.
   - Đọc kỹ các file liên quan trước khi chỉnh sửa; giữ nguyên các phần đang hoạt động ổn định, không tự ý xóa hoặc ghi đè công việc chưa rõ nguồn gốc.
2. **Kiểm tra thực tế trước khi báo cáo hoàn thành:**
   - Chạy kiểm tra kiểu dữ liệu (`typecheck`) và bộ kiểm thử liên quan trong [TESTING.md](./TESTING.md).
   - Không chạy các tiến trình treo vô hạn trên dòng lệnh.
   - **Không bao giờ đánh dấu `[x]` hoàn thành trong [TASKS.md](./TASKS.md) nếu chỉ mới viết code mà chưa chạy kiểm tra thực tế.**

---

## 5. Quy Tắc Cập Nhật Tài Liệu & Bàn Giao Tiến Độ ("Chuẩn Báo Cáo Sếp")

- Mỗi loại thông tin chỉ cập nhật tại **1 tài liệu gốc chính** (ví dụ: yêu cầu chức năng tại [REQUIREMENTS.md](./REQUIREMENTS.md), giao diện tại [DESIGN.md](./DESIGN.md), dữ liệu tại [DATA_MODEL.md](./DATA_MODEL.md)), các tài liệu khác dẫn link tới đó để tránh lệch thông tin.
- **LUẬT 1 — BẮT BUỘC CẬP NHẬT 4 FILE SAU MỖI BƯỚC HOÀN THÀNH:** Trước khi kết thúc lượt trả lời của bất kỳ đầu việc nào trong [TASKS.md](./TASKS.md), AI **bắt buộc cập nhật đồng thời cả 4 file sau**:
  1. **[HUONG_DAN_CHO_TOI.md](./HUONG_DAN_CHO_TOI.md)** — Cập nhật khung *Trạng thái hiện tại* ở Mục 2, đánh dấu `✅ ĐÃ XONG` vào bước vừa làm xong, và dời nhãn `👉 BẠN ĐANG Ở ĐÂY` xuống bước kế tiếp để khách hàng luôn biết chính xác câu lệnh cần copy tiếp theo.
  2. **[TASKS.md](./TASKS.md)** — Đánh dấu `[x]` vào bước đã kiểm chứng đạt.
  3. **[PROJECT_MEMORY.md](./PROJECT_MEMORY.md)** — Ghi nhận phần vừa hoàn thành, bằng chứng kiểm tra và bước tiếp theo.
  4. **[`.agents/PROJECT_MEMORY.md`](./.agents/PROJECT_MEMORY.md)** — Đồng bộ bộ nhớ tóm tắt cho các phiên AI tiếp theo.
- **LUẬT 2 — BẮT BUỘC BÁO CÁO PHONG CÁCH "BÁO CÁO SẾP" (Ngắn gọn – Đủ ý – Không lan man):**
  - Khi báo cáo kết quả cho khách hàng, trình bày súc tích như báo cáo cho Sếp, tuyệt đối không giải thích code dài dòng, gói gọn trong **4 ý cốt lõi**:
    1. **✅ Đã hoàn thành:** Tóm tắt 1–2 câu những gì vừa làm xong bằng ngôn ngữ đời thường.
    2. **📊 Bằng chứng kiểm tra:** Nêu rõ lệnh/cách đã kiểm tra và con số kết quả thực tế (ví dụ: `X/X bài test đạt 100%, 0 lỗi`).
    3. **⚠️ Tồn đọng / Lưu ý:** Nêu ngắn gọn điểm cần lưu ý hoặc ghi rõ *"Không có vướng mắc"*.
    4. **👉 Bước tiếp theo (Trình Sếp duyệt):** Trích dẫn sẵn câu lệnh của bước kế tiếp trong [HUONG_DAN_CHO_TOI.md](./HUONG_DAN_CHO_TOI.md) để khách hàng copy ngay.
- **LUẬT 3 — BẮT BUỘC KÈM ĐÁNH GIÁ `/honest-advisor`, `/ultrathinking` & GỢI Ý `swarm` TRONG MỌI BÁO CÁO:**
  - Mọi báo cáo gửi lại khách hàng bắt buộc có thêm **2 mục ngắn gọn, đi thẳng vào trọng tâm**:
    5. **🔍 Phản biện thẳng (`/honest-advisor` & `/ultrathinking`):** Phân biệt rõ *sự thật đã kiểm chứng* với *giả định chưa kiểm*, chỉ ra điểm yếu/rủi ro lớn nhất hoặc kịch bản dễ hỏng (*pre-mortem*) nếu đi tiếp, kèm giải pháp khắc phục thực tế (không nịnh, không bịa rủi ro giả).
    6. **🐝 Gợi ý chia quân (`/swarm`):** Đề xuất rõ cho bước kế tiếp là **nên chạy 1 mình** hay **gọi Swarm**, nêu rõ **số lượng Agent cụ thể** (kèm vai trò từng Agent tách file không đụng nhau, cộng `monitor` nếu chạy Swarm) và nêu thẳng đánh đổi về *tốc độ vs mức tiêu hao quota*.
- **LUẬT 4 — GIAO THỨC BÀN GIAO CA TRỰC KHÉP KÍN GIỮA CÁC PHIÊN (Session Handoff Protocol):**
  - Để phiên làm việc mới không bao giờ mất ngữ cảnh của phiên cũ (kể cả khi phiên cũ dừng đột ngột):
    1. **Đầu phiên mới:** Bắt buộc đọc `PROJECT_MEMORY.md`, `.agents/PROJECT_MEMORY.md`, `HUONG_DAN_CHO_TOI.md` **và chạy `git status --short`** trước tiên để nắm cả những thay đổi chưa commit.
    2. **Cuối mỗi bước:** Bắt buộc ghi mục *"Ghi chú bàn giao kỹ thuật cho Bước kế tiếp (Handoff Notes)"* vào `.agents/PROJECT_MEMORY.md` (chỉ rõ các hàm/mô-đun vừa tạo và điểm cần nối tiếp) để phiên sau làm tiếp ngay không phải dò lại từ đầu.
